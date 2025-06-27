const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');

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
                    .setColor('#FF0000')
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
                    .setColor('#FF0000')
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
                .setColor('#00FF00')
                .setFooter({ text: 'Purple Bot • Emergency System' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in voicereset command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while resetting voice XP times.')
                .setColor('#FF0000')
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
                console.error('Failed to send error reply:', replyError);
            }
        }
    },
};
