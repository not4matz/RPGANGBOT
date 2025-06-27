/**
 * Reset Voice Minutes command - Owner-only command to reset all voice minutes
 * Resets voice_time_minutes to 0 for all users in the server
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');
const database = require('../utils/database');
const LEVELING_CONFIG = require('../config/levelingConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resetvoiceminutes')
        .setDescription('🔄 Reset all voice minutes for everyone in the server (Owner only)'),

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

            // Get total users count before reset
            const totalUsers = await database.getTotalUsers(interaction.guild.id);

            if (totalUsers === 0) {
                const noUsersEmbed = new EmbedBuilder()
                    .setTitle('ℹ️ No Users Found')
                    .setDescription('No users found in the leveling database for this server.')
                    .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_10_PLUS)
                    .setFooter({ 
                        text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                        iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                    })
                    .setTimestamp();

                return await interaction.editReply({ embeds: [noUsersEmbed] });
            }

            // Reset all voice minutes
            const affectedRows = await database.resetAllVoiceMinutes(interaction.guild.id);

            const successEmbed = new EmbedBuilder()
                .setTitle('🔄 Voice Minutes Reset Complete')
                .setDescription('Successfully reset all voice minutes for everyone in the server.')
                .addFields(
                    { 
                        name: '📊 Reset Statistics', 
                        value: `**Total Users:** ${totalUsers}\n**Users Updated:** ${affectedRows}\n**Voice Minutes Reset:** All set to 0`, 
                        inline: false 
                    },
                    { 
                        name: '⚠️ Important Notes', 
                        value: '• XP and levels remain unchanged\n• Only voice time tracking was reset\n• Users can continue earning voice XP normally\n• This does not affect message statistics', 
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
            console.log(`🔄 ${interaction.user.tag} reset voice minutes for ${affectedRows} users in ${interaction.guild.name}`);

        } catch (error) {
            console.error('❌ Error in resetvoiceminutes command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while resetting voice minutes.')
                .addFields({
                    name: '🔍 Error Details',
                    value: `\`\`\`${error.message}\`\`\``,
                    inline: false
                })
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
