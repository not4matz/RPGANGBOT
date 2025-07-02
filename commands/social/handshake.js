const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('handshake')
        .setDescription('🤝 Give someone a firm handshake')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to shake hands with')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('🤝 Handshake')
                .setDescription('You shake your own hand! That\'s... one way to meet yourself! 😄')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const botMessage = targetUser.bot ? ' *mechanical grip* 🤖' : '';

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('🤝 Handshake')
            .setDescription(`**${author.displayName}** and **${targetUser.displayName}** share a firm handshake! Very professional! 🤝💼${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
