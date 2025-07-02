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
        
        const authorName = getDisplayName(author, interaction);
        const targetName = getDisplayName(targetUser, interaction);

        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('🤗 Hug')
            .setDescription(`**${authorName}** gave **${targetName}** a warm, cozy hug! 🫂💜${botMessage}`)
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ 
                text: `Requested by ${author.username} • Purple Bot Social System`,
                iconURL: author.displayAvatarURL()
            })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
