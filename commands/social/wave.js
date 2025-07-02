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
        .setName('wave')
        .setDescription('👋 Wave at someone')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to wave at')
                .setRequired(true)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user');
        const author = interaction.user;

        // Prevent self-targeting
        if (targetUser.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('👋 Wave')
                .setDescription('You wave at yourself in the mirror! Looking good! ✨')
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const botMessage = targetUser.bot ? ' *beep boop* 🤖' : '';
        
        const authorName = getDisplayName(author, interaction);
        const targetName = getDisplayName(targetUser, interaction);

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('👋 Wave')
            .setDescription(`**${authorName}** waves at **${targetName}**! Hello there! 👋💜${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
