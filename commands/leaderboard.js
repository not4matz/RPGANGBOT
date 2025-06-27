/**
 * Leaderboard command - Cleaned and optimized
 * Shows server ranking with purple theme
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const { formatXP, getLevelColor, getLevelBadge, getLevelFromXP } = require('../utils/leveling');
const LEVELING_CONFIG = require('../config/levelingConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the server leaderboard')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view')
                .setRequired(false)
                .setMinValue(1)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const page = interaction.options.getInteger('page') || 1;
            const limit = 10;
            const offset = (page - 1) * limit;

            // Get leaderboard data
            const leaderboard = await database.getLeaderboard(interaction.guild.id, limit, offset);
            const totalUsers = await database.getTotalUsers(interaction.guild.id);
            const totalPages = Math.ceil(totalUsers / limit);

            if (leaderboard.length === 0) {
                return await interaction.editReply({
                    content: page === 1 
                        ? '📊 No users found in the leaderboard yet!' 
                        : `📊 Page ${page} is empty. There are only ${totalPages} pages.`
                });
            }

            // Create leaderboard embed with purple theme
            const leaderboardEmbed = new EmbedBuilder()
                .setTitle('🏆 Server Leaderboard')
                .setDescription(`**${interaction.guild.name}** • Page ${page}/${totalPages}`)
                .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_50_PLUS) // Use purple theme color
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }));

            // Add leaderboard entries
            let description = '';
            for (let i = 0; i < leaderboard.length; i++) {
                const userData = leaderboard[i];
                const rank = offset + i + 1;
                const user = await interaction.client.users.fetch(userData.user_id).catch(() => null);
                const displayName = user ? user.displayName : 'Unknown User';
                
                // Calculate display level (with easter egg support)
                const level = getLevelFromXP(userData.xp, userData.user_id);
                const badge = getLevelBadge(level);
                
                // Format voice time
                const voiceHours = Math.floor((userData.voice_time_minutes || 0) / 60);
                const voiceMinutes = (userData.voice_time_minutes || 0) % 60;
                
                // Medal emojis for top 3 using purple theme
                let medal = '';
                if (rank === 1) medal = '👑'; // Crown for 1st
                else if (rank === 2) medal = '💎'; // Diamond for 2nd  
                else if (rank === 3) medal = '🔮'; // Crystal ball for 3rd
                else medal = `**${rank}.**`;

                description += `${medal} ${badge} **${displayName}**\n`;
                description += `   Level ${level} • ${formatXP(userData.xp)} XP\n`;
                description += `   💬 ${(userData.total_messages || 0).toLocaleString()} msgs • 🎤 ${voiceHours}h ${voiceMinutes}m\n\n`;
            }

            leaderboardEmbed.setDescription(`**${interaction.guild.name}** • Page ${page}/${totalPages}\n\n${description}`);

            // Add footer with navigation info
            let footerText = LEVELING_CONFIG.EMBED_FOOTER_TEXT;
            if (totalPages > 1) {
                footerText += ` • Use /leaderboard page:${page + 1} for next page`;
            }

            leaderboardEmbed.setFooter({
                text: footerText,
                iconURL: interaction.guild.iconURL()
            });

            leaderboardEmbed.setTimestamp();

            await interaction.editReply({ embeds: [leaderboardEmbed] });

        } catch (error) {
            console.error('❌ Error in leaderboard command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching the leaderboard. Please try again.',
            });
        }
    },
};
