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
                    // Calculate minutes earned, but cap it to prevent excessive XP from long offline periods
                    const rawMinutesEarned = Math.floor((now - lastXPTime) / 60000);
                    
                    // Additional safety check: if the time difference is more than 24 hours, 
                    // it's likely a bug or bot restart issue - cap to 5 minutes max
                    const maxAllowedMinutes = rawMinutesEarned > 1440 ? 5 : Math.min(rawMinutesEarned, 5); // 1440 = 24 hours
                    const minutesEarned = maxAllowedMinutes;
                    const xpGain = generateVoiceXP() * minutesEarned;

                    // Log if we're capping the XP gain
                    if (rawMinutesEarned > minutesEarned) {
                        console.log(`⚠️ Capped voice XP for ${member.user.tag}: ${rawMinutesEarned} minutes -> ${minutesEarned} minutes (prevented ${(rawMinutesEarned - minutesEarned) * generateVoiceXP()} XP abuse)`);
                    }

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
                    const newLevel = getLevelFromXP(updatedUserData.xp, userData.user_id);
                    
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
                console.log(`🔍 Found ${voiceChannels.size} voice channels in ${guild.name}`);

                for (const channel of voiceChannels.values()) {
                    // Get all non-bot members in this voice channel
                    const membersInChannel = channel.members.filter(member => !member.user.bot);
                    
                    if (membersInChannel.size > 0) {
                        console.log(`🔍 Voice channel "${channel.name}" has ${membersInChannel.size} non-bot members`);
                    }

                    for (const member of membersInChannel.values()) {
                        console.log(`🔍 Processing user: ${member.user.tag} in channel "${channel.name}"`);
                        
                        // Skip if user is muted/deafened (optional)
                        if (member.voice.mute || member.voice.deaf || member.voice.selfMute || member.voice.selfDeaf) {
                            console.log(`⏭️ Skipping ${member.user.tag} - user is muted/deafened`);
                            continue;
                        }

                        // Skip if user is alone in the channel
                        if (channel.members.filter(m => !m.user.bot).size <= 1) {
                            console.log(`⏭️ Skipping ${member.user.tag} - user is alone in channel (${channel.members.filter(m => !m.user.bot).size} users)`);
                            continue;
                        }

                        // Always reset voice join time to current time on startup to prevent XP abuse
                        // This prevents massive XP gains from old timestamps when bot restarts
                        const now = Date.now();
                        console.log(`🎤 Setting voice join time for ${member.user.tag} to ${now} (startup reset)`);
                        await database.updateVoiceJoinTime(member.user.id, guild.id, now);
                        
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
            // Send to specific level-up channel
            const levelUpChannelId = '1361198962488381490';
            let targetChannel = guild.channels.cache.get(levelUpChannelId);
            
            // Fallback channel search if specific channel not found
            if (!targetChannel) {
                console.warn(`Level-up channel ${levelUpChannelId} not found, searching for fallback`);
                
                // Priority order: general, chat, main, first text channel
                const channelNames = ['general', 'chat', 'main', 'level-ups', 'bot-commands'];
                
                for (const name of channelNames) {
                    targetChannel = guild.channels.cache.find(ch => 
                        ch.isTextBased() && 
                        ch.name.toLowerCase().includes(name)
                    );
                    if (targetChannel) break;
                }
                
                // Last resort: first available text channel
                if (!targetChannel) {
                    targetChannel = guild.channels.cache.find(ch => ch.isTextBased());
                }
            }
            
            if (!targetChannel) {
                console.error('No suitable channel found for voice level up message');
                return;
            }

            const levelUpEmbed = new EmbedBuilder()
                .setTitle('🎤 Voice Level Up!')
                .setDescription(`${member} has reached **Level ${newLevel}** through voice activity! ${getLevelBadge(newLevel)}`)
                .setColor(getLevelColor(newLevel))
                .addFields(
                    { 
                        name: '💜 Stats', 
                        value: `**Level:** ${newLevel}\n**Total XP:** ${userData.xp.toLocaleString()}\n**Voice Time:** ${Math.floor(userData.voice_time_minutes)} minutes`, 
                        inline: true 
                    }
                )
                .setThumbnail(member.user.displayAvatarURL())
                .setFooter({
                    text: 'Purple Bot • Voice Activity Leveling',
                    iconURL: member.guild.iconURL()
                })
                .setTimestamp();

            await targetChannel.send({ embeds: [levelUpEmbed] });
            console.log(`🎉 ${member.user.tag} leveled up to ${newLevel} via voice in ${guild.name}`);

        } catch (error) {
            console.error('Error sending voice level up message:', error);
        }
    }

    /**
     * Emergency cleanup: Reset all voice join times to current time
     * This fixes any existing bad timestamps that could cause XP abuse
     */
    async emergencyResetVoiceTimes() {
        try {
            console.log('🚨 Emergency reset: Clearing all voice join times...');
            
            for (const guild of this.client.guilds.cache.values()) {
                // Get all voice channels in the guild
                const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2);
                
                for (const channel of voiceChannels.values()) {
                    const membersInChannel = channel.members.filter(member => !member.user.bot);
                    
                    for (const member of membersInChannel.values()) {
                        // Reset their voice join time to now
                        await database.updateVoiceJoinTime(member.user.id, guild.id, Date.now());
                        console.log(`🔄 Reset voice time for ${member.user.tag}`);
                    }
                }
                
                // Also clear voice join times for users not currently in voice
                await database.clearAllVoiceJoinTimes(guild.id);
            }
            
            console.log('✅ Emergency reset completed');
        } catch (error) {
            console.error('Error in emergency reset:', error);
        }
    }
}

module.exports = VoiceXPTracker;
