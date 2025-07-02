const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

// Helper function to get display name in both guild and DM contexts
function getDisplayName(user, interaction) {
    if (interaction.guild) {
        const member = interaction.guild.members.cache.get(user.id);
        return member ? member.displayName : (user.globalName || user.username);
    }
    return user.globalName || user.username;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dance')
        .setDescription('💃 Dance with someone')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to dance with')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('💃 Dance')
                .setDescription('You dance by yourself! Solo dance party! 🕺✨')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const botMessage = targetUser.bot ? ' *robotic dance moves* 🤖' : '';
        
        const authorName = getDisplayName(author, interaction);
        const targetName = getDisplayName(targetUser, interaction);

        const danceEmojis = ['💃', '🕺', '🎵', '🎶', '✨'];
        const randomEmoji = danceEmojis[Math.floor(Math.random() * danceEmojis.length)];

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('💃 Dance')
            .setDescription(`**${authorName}** and **${targetName}** are dancing together! ${randomEmoji}🎵💜${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
