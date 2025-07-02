const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('highfive')
        .setDescription('🙏 Give someone a high five')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to high five')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('🙏 High Five')
                .setDescription('You clap your hands together! That\'s... technically a high five? 👏')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const botMessage = targetUser.bot ? ' *mechanical high five sounds* 🤖' : '';

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('🙏 High Five')
            .setDescription(`**${author.displayName}** and **${targetUser.displayName}** share an epic high five! 🙏✨${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
