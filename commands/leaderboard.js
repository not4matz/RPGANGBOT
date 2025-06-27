const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const { formatXP, getLevelColor, getLevelBadge, getLevelFromXP } = require('../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server leaderboard')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number (10 users per page)')
                .setRequired(false)
                .setMinValue(1)),
    
    async execute(interaction) {
        try {
            const page = interaction.options.getInteger('page') || 1;
            const usersPerPage = 10;
            const offset = (page - 1) * usersPerPage;

            await interaction.deferReply();

            // Get leaderboard data
            const leaderboard = await database.getLeaderboard(interaction.guild.id, usersPerPage + 1); // +1 to check if there's a next page
            
            if (leaderboard.length === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('👑 Server Leaderboard')
                    .setDescription('No users found! Start chatting to appear on the leaderboard!')
                    .setColor('#6A0DAD');

                return await interaction.editReply({ embeds: [embed] });
            }

            // Check if page exists
            const totalUsers = leaderboard.length;
            const hasNextPage = totalUsers > usersPerPage;
            const displayUsers = leaderboard.slice(0, usersPerPage);

            if (offset >= totalUsers && page > 1) {
                return await interaction.editReply({
                    content: `❌ Page ${page} doesn't exist! There are only ${Math.ceil(totalUsers / usersPerPage)} page(s).`
                });
            }

            // Build leaderboard string
            let leaderboardText = '';
            const medals = ['👑', '💎', '🔮']; // Purple-themed medals
            
            for (let i = 0; i < displayUsers.length; i++) {
                const userData = displayUsers[i];
                const rank = offset + i + 1;
                const user = await interaction.client.users.fetch(userData.user_id).catch(() => null);
                
                // Calculate display level (with easter egg support)
                const displayLevel = getLevelFromXP(userData.xp, userData.user_id);
                
                const medal = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
                const username = user ? user.displayName : 'Unknown User';
                const badge = getLevelBadge(displayLevel);
                
                leaderboardText += `${medal} ${badge} **${username}**\n`;
                leaderboardText += `   Level ${displayLevel} • ${formatXP(userData.xp)} XP • ${userData.total_messages.toLocaleString()} messages • ${Math.floor(userData.voice_time_minutes || 0)} minutes in voice\n\n`;
            }

            // Get user's rank if they're not on current page
            let userRankText = '';
            const userRank = await database.getUserRank(interaction.user.id, interaction.guild.id);
            if (userRank && (userRank < offset + 1 || userRank > offset + usersPerPage)) {
                const userData = await database.getUser(interaction.user.id, interaction.guild.id);
                if (userData) {
                    const userDisplayLevel = getLevelFromXP(userData.xp, interaction.user.id);
                    userRankText = `\n**Your Rank:** #${userRank} • Level ${userDisplayLevel} • ${formatXP(userData.xp)} XP`;
                }
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle('👑 Server Leaderboard')
                .setDescription(leaderboardText + userRankText)
                .setColor('#6A0DAD')
                .setFooter({
                    text: `Page ${page}${hasNextPage ? ` • Use /leaderboard page:${page + 1} for more` : ''} • ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            
            // Check if interaction is still valid before trying to respond
            if (!interaction.replied && !interaction.deferred) {
                try {
                    await interaction.reply({
                        content: '❌ An error occurred while fetching the leaderboard!',
                        flags: MessageFlags.Ephemeral
                    });
                } catch (replyError) {
                    console.error('Failed to send error reply:', replyError);
                }
            } else {
                try {
                    await interaction.editReply({
                        content: '❌ An error occurred while fetching the leaderboard!'
                    });
                } catch (editError) {
                    console.error('Failed to edit reply with error:', editError);
                }
            }
        }
    },
};
