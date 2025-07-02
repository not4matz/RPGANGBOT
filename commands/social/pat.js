const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pat')
        .setDescription('🤚 Give someone a gentle pat')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to pat')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('🤚 Pat')
                .setDescription('You pat yourself on the head! Good job, you deserve it! 🌟')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const botMessage = targetUser.bot ? ' *happy beeping noises* 🤖' : '';

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('🤚 Pat')
            .setDescription(`**${author.displayName}** gently pats **${targetUser.displayName}** on the head! So wholesome! 🤚💜${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
