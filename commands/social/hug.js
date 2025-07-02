const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('hug')
        .setDescription('🤗 Give someone a warm hug')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to hug')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('🤗 Hug')
                .setDescription('You give yourself a self-hug! Sometimes we all need one! 🫂💜')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // Allow hugging bots (they need love too!)
        const botMessage = targetUser.bot ? ' The bot appreciates the love! 🤖💜' : '';

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('🤗 Hug')
            .setDescription(`**${author.displayName}** gave **${targetUser.displayName}** a warm, cozy hug! 🫂💜${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
