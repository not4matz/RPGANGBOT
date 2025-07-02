const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('kiss')
        .setDescription('💋 Give someone a kiss')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to kiss')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('💋 Kiss')
                .setDescription('You can\'t kiss yourself! Find someone else to kiss! 😘')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        // Prevent targeting bots
        if (targetUser.bot) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('💋 Kiss')
                .setDescription('Bots don\'t need kisses! Try kissing a human instead! 🤖')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('💋 Kiss')
            .setDescription(`**${author.displayName}** gave **${targetUser.displayName}** a sweet kiss! 😘💜`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
