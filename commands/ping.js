const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Replies with Pong and bot latency'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: '🏓 Pinging...', 
            fetchReply: true 
        });
        
        const embed = new EmbedBuilder()
            .setColor(colors.PRIMARY)
            .setTitle('🏓 Pong!')
            .setDescription('Bot latency information')
            .addFields(
                { 
                    name: '📡 Roundtrip Latency', 
                    value: `\`${sent.createdTimestamp - interaction.createdTimestamp}ms\``, 
                    inline: true 
                },
                { 
                    name: '💜 API Latency', 
                    value: `\`${Math.round(interaction.client.ws.ping)}ms\``, 
                    inline: true 
                },
                {
                    name: '⚡ Status',
                    value: sent.createdTimestamp - interaction.createdTimestamp < 100 ? 
                           '`Excellent`' : sent.createdTimestamp - interaction.createdTimestamp < 200 ? 
                           '`Good`' : '`Slow`',
                    inline: true
                }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.username}`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();

        await interaction.editReply({ content: null, embeds: [embed] });
    },
};
