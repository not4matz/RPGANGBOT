const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { formatXP, getLevelColor, getLevelBadge } = require('../utils/leveling');

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
                    .setTitle('📊 Server Leaderboard')
                    .setDescription('No users found! Start chatting to appear on the leaderboard!')
                    .setColor('#5865f2');

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
            const medals = ['🥇', '🥈', '🥉'];
            
            for (let i = 0; i < displayUsers.length; i++) {
                const userData = displayUsers[i];
                const rank = offset + i + 1;
                const user = await interaction.client.users.fetch(userData.user_id).catch(() => null);
                
                const medal = rank <= 3 ? medals[rank - 1] : `**${rank}.**`;
                const username = user ? user.displayName : 'Unknown User';
                const badge = getLevelBadge(userData.level);
                
                leaderboardText += `${medal} ${badge} **${username}**\n`;
                leaderboardText += `   Level ${userData.level} • ${formatXP(userData.xp)} XP • ${userData.total_messages.toLocaleString()} messages • ${Math.floor(userData.voice_time_minutes || 0)} minutes in voice\n\n`;
            }

            // Get user's rank if they're not on current page
            let userRankText = '';
            const userRank = await database.getUserRank(interaction.user.id, interaction.guild.id);
            if (userRank && (userRank < offset + 1 || userRank > offset + usersPerPage)) {
                const userData = await database.getUser(interaction.user.id, interaction.guild.id);
                if (userData) {
                    userRankText = `\n**Your Rank:** #${userRank} • Level ${userData.level} • ${formatXP(userData.xp)} XP`;
                }
            }

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle('📊 Server Leaderboard')
                .setDescription(leaderboardText + userRankText)
                .setColor('#ffd700')
                .setFooter({
                    text: `Page ${page}${hasNextPage ? ` • Use /leaderboard page:${page + 1} for more` : ''} • ${interaction.guild.name}`,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the leaderboard!'
            });
        }
    },
};
