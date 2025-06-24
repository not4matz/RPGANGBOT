const database = require('./database');
const { generateVoiceXP, getLevelFromXP, getLevelColor, getLevelBadge } = require('./leveling');
const { EmbedBuilder } = require('discord.js');

class VoiceXPTracker {
    constructor(client) {
        this.client = client;
        this.interval = null;
    }

    start() {
        // Check every minute for voice XP
        this.interval = setInterval(() => {
            this.processVoiceXP();
        }, 60000); // 60 seconds

        console.log('🎤 Voice XP tracker started');

        // Check for users already in voice channels on startup
        this.checkStartupVoiceUsers();
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('🎤 Voice XP tracker stopped');
        }
    }

    async processVoiceXP() {
        try {
            // Process each guild
            for (const guild of this.client.guilds.cache.values()) {
                await this.processGuildVoiceXP(guild);
            }
        } catch (error) {
            console.error('Error processing voice XP:', error);
        }
    }

    async processGuildVoiceXP(guild) {
        try {
            // Get users currently in voice channels from database
            const usersInVoice = await database.getUsersInVoice(guild.id);
            
            for (const userData of usersInVoice) {
                const member = guild.members.cache.get(userData.user_id);
                if (!member) continue;

                // Check if user is still in a voice channel
                const voiceState = member.voice;
                if (!voiceState.channel) {
                    // User is no longer in voice, clear their join time
                    await database.clearVoiceJoinTime(userData.user_id, guild.id);
                    continue;
                }

                // Skip if user is muted or deafened (optional - you can remove this if you want)
                if (voiceState.mute || voiceState.deaf || voiceState.selfMute || voiceState.selfDeaf) {
                    continue;
                }

                // Skip if user is alone in the channel
                if (voiceState.channel.members.filter(m => !m.user.bot).size <= 1) {
                    continue;
                }

                const now = Date.now();
                const joinTime = userData.voice_join_time;
                const lastXPTime = userData.last_voice_xp_time || joinTime;

                // Check if at least 1 minute has passed since last XP gain
                if (now - lastXPTime >= 60000) {
                    const minutesEarned = Math.floor((now - lastXPTime) / 60000);
                    const xpGain = generateVoiceXP() * minutesEarned;

                    // Get current user data for level checking
                    const currentUserData = await database.getUser(userData.user_id, guild.id);
                    if (!currentUserData) continue;

                    const oldLevel = currentUserData.level;

                    // Add voice XP
                    await database.addVoiceXP(userData.user_id, guild.id, xpGain, minutesEarned);

                    // Get updated user data
                    const updatedUserData = await database.getUser(userData.user_id, guild.id);
                    if (!updatedUserData) continue;

                    // Check for level up
                    const newLevel = getLevelFromXP(updatedUserData.xp);
                    
                    if (newLevel > oldLevel) {
                        // Update level in database
                        await database.updateUserLevel(userData.user_id, guild.id, newLevel);
                        
                        // Send level up message to a general channel or the voice channel
                        await this.sendVoiceLevelUpMessage(guild, member, newLevel, updatedUserData);
                    }

                    console.log(`🎤 ${member.user.tag} earned ${xpGain} XP from ${minutesEarned} minute(s) in voice`);
                }
            }
        } catch (error) {
            console.error(`Error processing voice XP for guild ${guild.name}:`, error);
        }
    }

    async checkStartupVoiceUsers() {
        try {
            console.log('🔍 Checking for users already in voice channels...');
            let totalUsersFound = 0;

            for (const guild of this.client.guilds.cache.values()) {
                let guildUsersFound = 0;

                // Get all voice channels in the guild
                const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2); // GUILD_VOICE

                for (const channel of voiceChannels.values()) {
                    // Get all non-bot members in this voice channel
                    const membersInChannel = channel.members.filter(member => !member.user.bot);

                    for (const member of membersInChannel.values()) {
                        // Skip if user is muted/deafened (optional)
                        if (member.voice.mute || member.voice.deaf || member.voice.selfMute || member.voice.selfDeaf) {
                            continue;
                        }

                        // Skip if user is alone in the channel
                        if (channel.members.filter(m => !m.user.bot).size <= 1) {
                            continue;
                        }

                        // Check if user already has a voice join time (shouldn't happen on startup, but safety check)
                        const existingData = await database.getUser(member.user.id, guild.id);
                        if (existingData && existingData.voice_join_time && existingData.voice_join_time > 0) {
                            continue; // User already tracked
                        }

                        // Set voice join time to current time
                        const now = Date.now();
                        await database.setVoiceJoinTime(member.user.id, guild.id, now);
                        
                        guildUsersFound++;
                        totalUsersFound++;
                        
                        console.log(`🎤 Registered ${member.user.tag} in voice channel "${channel.name}" (${guild.name})`);
                    }
                }

                if (guildUsersFound > 0) {
                    console.log(`✅ Found ${guildUsersFound} users in voice channels in ${guild.name}`);
                }
            }

            if (totalUsersFound > 0) {
                console.log(`🎤 Total users registered for voice XP tracking: ${totalUsersFound}`);
            } else {
                console.log('ℹ️ No users found in voice channels on startup');
            }

        } catch (error) {
            console.error('Error checking startup voice users:', error);
        }
    }

    async sendVoiceLevelUpMessage(guild, member, newLevel, userData) {
        try {
            // Try to find a suitable channel to send the level up message
            let targetChannel = null;

            // Priority order: general, chat, main, first text channel
            const channelNames = ['general', 'chat', 'main', 'level-ups', 'bot-commands'];
            
            for (const name of channelNames) {
                targetChannel = guild.channels.cache.find(ch => 
                    ch.isTextBased() && 
                    ch.name.toLowerCase().includes(name) &&
                    ch.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
                );
                if (targetChannel) break;
            }

            // If no named channel found, use the first available text channel
            if (!targetChannel) {
                targetChannel = guild.channels.cache.find(ch => 
                    ch.isTextBased() && 
                    ch.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
                );
            }

            if (!targetChannel) {
                console.log(`No suitable channel found for level up message in ${guild.name}`);
                return;
            }

            const levelUpEmbed = new EmbedBuilder()
                .setTitle('🎤 Voice Level Up!')
                .setDescription(`${member} has reached **Level ${newLevel}** through voice activity! ${getLevelBadge(newLevel)}`)
                .setColor(getLevelColor(newLevel))
                .addFields(
                    { 
                        name: '📊 Stats', 
                        value: `**Level:** ${newLevel}\n**Total XP:** ${userData.xp.toLocaleString()}\n**Voice Time:** ${Math.floor(userData.voice_time_minutes)} minutes`, 
                        inline: true 
                    }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setTimestamp();

            await targetChannel.send({ embeds: [levelUpEmbed] });
            console.log(`🎉 ${member.user.tag} leveled up to ${newLevel} via voice in ${guild.name}`);

        } catch (error) {
            console.error('Error sending voice level up message:', error);
        }
    }
}

module.exports = VoiceXPTracker;
