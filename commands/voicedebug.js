const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { isOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicedebug')
        .setDescription('🔒 Debug voice XP tracking for a specific user (Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to debug')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user is owner
        if (!isOwner(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ This command is only available to the bot owner.',
                ephemeral: true
            });
        }

        const targetUser = interaction.options.getUser('user');
        const guild = interaction.guild;

        try {
            // Get user data from database
            const userData = await database.getUser(targetUser.id, guild.id);
            
            // Get guild member
            const member = guild.members.cache.get(targetUser.id);
            
            // Check if user is in voice
            const voiceState = member?.voice;
            
            // Get all users currently tracked in voice
            const usersInVoice = await database.getUsersInVoice(guild.id);
            const isTrackedInVoice = usersInVoice.find(u => u.user_id === targetUser.id);

            const embed = new EmbedBuilder()
                .setTitle('🎤 Voice XP Debug Report')
                .setDescription(`Debug information for ${targetUser.tag}`)
                .setColor('#0099ff')
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            // Database info
            if (userData) {
                embed.addFields({
                    name: '📊 Database Info',
                    value: `**XP:** ${userData.xp}\n**Level:** ${userData.level}\n**Voice Time:** ${userData.voice_time_minutes} minutes\n**Voice Join Time:** ${userData.voice_join_time}\n**Last Voice XP:** ${userData.last_voice_xp_time}`,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '📊 Database Info',
                    value: '❌ User not found in database',
                    inline: false
                });
            }

            // Voice state info
            if (member && voiceState) {
                const channelInfo = voiceState.channel ? 
                    `**Channel:** ${voiceState.channel.name}\n**Members in Channel:** ${voiceState.channel.members.filter(m => !m.user.bot).size}\n**Muted:** ${voiceState.mute || voiceState.selfMute}\n**Deafened:** ${voiceState.deaf || voiceState.selfDeaf}` :
                    '❌ Not in voice channel';

                embed.addFields({
                    name: '🎤 Current Voice State',
                    value: channelInfo,
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '🎤 Current Voice State',
                    value: '❌ Member not found or not in voice',
                    inline: false
                });
            }

            // Tracking status
            embed.addFields({
                name: '🔍 Tracking Status',
                value: isTrackedInVoice ? 
                    `✅ Currently tracked in voice\n**Join Time:** ${new Date(isTrackedInVoice.voice_join_time).toLocaleString()}` :
                    '❌ Not currently tracked in voice',
                inline: false
            });

            // Eligibility check
            let eligibilityIssues = [];
            
            if (!member) {
                eligibilityIssues.push('❌ Member not found in guild');
            } else if (!voiceState?.channel) {
                eligibilityIssues.push('❌ Not in a voice channel');
            } else {
                if (voiceState.mute || voiceState.deaf || voiceState.selfMute || voiceState.selfDeaf) {
                    eligibilityIssues.push('❌ User is muted or deafened');
                }
                
                if (voiceState.channel.members.filter(m => !m.user.bot).size <= 1) {
                    eligibilityIssues.push('❌ User is alone in voice channel');
                }
                
                if (userData && userData.voice_join_time === 0) {
                    eligibilityIssues.push('❌ No voice join time set');
                }
            }

            if (eligibilityIssues.length === 0) {
                eligibilityIssues.push('✅ User should be eligible for voice XP');
            }

            embed.addFields({
                name: '✅ Eligibility Check',
                value: eligibilityIssues.join('\n'),
                inline: false
            });

            // Time calculations
            if (userData && userData.voice_join_time > 0) {
                const now = Date.now();
                const joinTime = userData.voice_join_time;
                const lastXPTime = userData.last_voice_xp_time || joinTime;
                const timeSinceJoin = Math.floor((now - joinTime) / 60000);
                const timeSinceLastXP = Math.floor((now - lastXPTime) / 60000);

                embed.addFields({
                    name: '⏰ Time Calculations',
                    value: `**Time since join:** ${timeSinceJoin} minutes\n**Time since last XP:** ${timeSinceLastXP} minutes\n**Next XP in:** ${Math.max(0, 1 - timeSinceLastXP)} minutes`,
                    inline: false
                });
            }

            await interaction.reply({ embeds: [embed], ephemeral: true });

        } catch (error) {
            console.error('Error in voicedebug command:', error);
            await interaction.reply({
                content: '❌ An error occurred while debugging voice XP.',
                ephemeral: true
            });
        }
    },
};
