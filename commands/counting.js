const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

const COUNTING_CHANNEL_ID = '1225180419402502278';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('counting')
        .setDescription('View counting channel information and stats'),

    async execute(interaction) {
        const guildId = interaction.guild.id;
        const channelId = COUNTING_CHANNEL_ID;

        try {
            const countingData = await database.getCountingData(guildId, channelId);
            
            if (!countingData) {
                const embed = new EmbedBuilder()
                    .setColor(0xff6b6b)
                    .setTitle('❌ Counting System Not Set Up')
                    .setDescription('The counting system has not been initialized for this server.\nAsk an admin to use `/countingadmin setup` to initialize it.')
                    .setTimestamp();
                
                return await interaction.reply({ embeds: [embed] });
            }

            const channel = interaction.guild.channels.cache.get(channelId);
            const lastUser = countingData.last_user_id ? 
                await interaction.guild.members.fetch(countingData.last_user_id).catch(() => null) : null;

            const embed = new EmbedBuilder()
                .setColor(0x4ecdc4)
                .setTitle('🔢 Counting Channel Stats')
                .setDescription(`Welcome to the counting game! Count in order and don't let the same person count twice in a row.`)
                .addFields(
                    { name: '📍 Counting Channel', value: channel ? `<#${channelId}>` : 'Channel not found', inline: false },
                    { name: '🔢 Current Number', value: `**${countingData.current_number}**`, inline: true },
                    { name: '🎯 Next Number', value: `**${countingData.current_number + 1}**`, inline: true },
                    { name: '🏆 Highest Reached', value: `**${countingData.highest_number}**`, inline: true },
                    { name: '📈 Total Counts', value: `**${countingData.total_counts}**`, inline: true },
                    { name: '👤 Last Counter', value: lastUser ? `${lastUser.user.tag}` : 'None', inline: true },
                    { name: '📅 Started', value: `<t:${Math.floor(new Date(countingData.created_at).getTime() / 1000)}:R>`, inline: true }
                )
                .addFields({
                    name: '📋 Rules',
                    value: '• Count in order (1, 2, 3, ...)\n• Only one number per message\n• You cannot count twice in a row\n• Wrong numbers will be deleted',
                    inline: false
                })
                .setFooter({ text: 'Good luck reaching new milestones!' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in counting command:', error);
            
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setTitle('❌ Error')
                .setDescription('An error occurred while fetching counting data. Please try again.')
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
    },
};
