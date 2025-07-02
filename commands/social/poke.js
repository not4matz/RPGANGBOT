const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poke')
        .setDescription('👉 Poke someone to get their attention')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to poke')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('👉 Poke')
                .setDescription('You poke yourself! Ouch! Why would you do that? 😅')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const botMessage = targetUser.bot ? ' *system notification sound* 🤖' : '';

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('👉 Poke')
            .setDescription(`**${author.displayName}** pokes **${targetUser.displayName}**! Hey, pay attention! 👉💜${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
