const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Check the bot\'s latency and API response time'),
    
    async execute(interaction) {
        const sent = await interaction.reply({ 
            content: '🏓 Pinging...', 
            fetchReply: true 
        });
        
        const embed = new EmbedBuilder()
            .setColor('#00ff00')
            .setTitle('🏓 Pong!')
            .addFields(
                { 
                    name: '📡 Websocket Heartbeat', 
                    value: `${interaction.client.ws.ping}ms`, 
                    inline: true 
                },
                { 
                    name: '🔄 Roundtrip Latency', 
                    value: `${sent.createdTimestamp - interaction.createdTimestamp}ms`, 
                    inline: true 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });

        await interaction.editReply({ 
            content: '', 
            embeds: [embed] 
        });
    },
};
