const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands and their descriptions'),
    
    async execute(interaction) {
        const commands = interaction.client.commands;
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📚 Bot Commands')
            .setDescription('Here are all the available commands:')
            .setTimestamp()
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });

        // Group commands by category (you can expand this)
        const commandList = commands.map(command => {
            return `**/${command.data.name}** - ${command.data.description}`;
        }).join('\n');

        embed.addFields({
            name: '🤖 Available Commands',
            value: commandList || 'No commands available',
            inline: false
        });

        embed.addFields({
            name: '💡 Need Help?',
            value: 'Use `/ping` to check bot status\nMore commands coming soon!',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },
};
