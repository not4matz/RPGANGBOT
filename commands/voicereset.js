/**
 * Voice Reset command - Owner-only emergency voice XP tracking reset
 * Resets all voice join times to prevent XP abuse from old timestamps
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');
const LEVELING_CONFIG = require('../config/levelingConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicereset')
        .setDescription('🚨 Emergency reset all voice XP tracking times (Owner only)'),

    async execute(interaction) {
        try {
            // Check if user is bot owner
            if (!isOwner(interaction.user.id)) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Access Denied')
                    .setDescription('This command is restricted to bot owners only.')
                    .setColor(LEVELING_CONFIG.ERROR_COLOR)
                    .setFooter({ 
                        text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                        iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Get the voice XP tracker instance
            const voiceXPTracker = interaction.client.voiceXPTracker;
            if (!voiceXPTracker) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Error')
                    .setDescription('Voice XP tracker not found!')
                    .setColor(LEVELING_CONFIG.ERROR_COLOR)
                    .setFooter({ 
                        text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                        iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Run emergency reset
            await voiceXPTracker.emergencyResetVoiceTimes();

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Emergency Reset Complete')
                .setDescription('All voice XP tracking times have been reset to prevent XP abuse.')
                .addFields(
                    { 
                        name: '🔄 Actions Taken', 
                        value: '• Reset all current voice join times\n• Cleared old voice XP timestamps\n• Users currently in voice will start fresh tracking', 
                        inline: false 
                    }
                )
                .setColor(LEVELING_CONFIG.SUCCESS_COLOR)
                .setFooter({ 
                    text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

            // Log the action
            console.log(`🚨 ${interaction.user.tag} performed emergency voice XP reset`);

        } catch (error) {
            console.error('❌ Error in voicereset command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while resetting voice XP times.')
                .setColor(LEVELING_CONFIG.ERROR_COLOR)
                .setFooter({ 
                    text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            try {
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ 
                        embeds: [errorEmbed], 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (replyError) {
                console.error('❌ Failed to send error reply:', replyError);
            }
        }
    }
};
