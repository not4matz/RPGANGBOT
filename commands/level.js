const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { getXPProgress, createProgressBar, formatXP, getLevelColor, getLevelBadge } = require('../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your level or someone else\'s level')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check level for (optional)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guild.id;

            // Don't show levels for bots
            if (targetUser.bot) {
                return await interaction.reply({
                    content: '🤖 Bots don\'t have levels!',
                    ephemeral: true
                });
            }

            await interaction.deferReply();

            // Get user data
            const userData = await database.getUser(targetUser.id, guildId);
            
            if (!userData) {
                const embed = new EmbedBuilder()
                    .setTitle('📊 Level Information')
                    .setDescription(`${targetUser} hasn't sent any messages yet!`)
                    .setColor('#5865f2')
                    .setThumbnail(targetUser.displayAvatarURL());

                return await interaction.editReply({ embeds: [embed] });
            }

            // Get user rank
            const rank = await database.getUserRank(targetUser.id, guildId);
            
            // Calculate progress
            const progress = getXPProgress(userData.xp, userData.level);
            const progressBar = createProgressBar(progress.currentLevelXP, progress.xpNeededForNext, 15);

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`${getLevelBadge(userData.level)} Level Information`)
                .setDescription(`**${targetUser.displayName}**'s leveling stats`)
                .setColor(getLevelColor(userData.level))
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    {
                        name: '📈 Level',
                        value: `**${userData.level}**`,
                        inline: true
                    },
                    {
                        name: '🏆 Rank',
                        value: `**#${rank || 'N/A'}**`,
                        inline: true
                    },
                    {
                        name: '💬 Messages',
                        value: `**${userData.total_messages.toLocaleString()}**`,
                        inline: true
                    },
                    {
                        name: '🎤 Voice Time',
                        value: `**${Math.floor(userData.voice_time_minutes || 0)}** minutes`,
                        inline: true
                    },
                    {
                        name: '⭐ Total XP',
                        value: `**${formatXP(userData.xp)}**`,
                        inline: true
                    },
                    {
                        name: '📊 XP Sources',
                        value: `💬 Messages: ~${(userData.total_messages * 5).toLocaleString()} XP\n🎤 Voice: ~${((userData.voice_time_minutes || 0) * 5).toLocaleString()} XP`,
                        inline: true
                    },
                    {
                        name: '🎯 Progress to Next Level',
                        value: `**${formatXP(progress.currentLevelXP)}** / **${formatXP(progress.xpNeededForNext)}** XP\n${progressBar} ${progress.progress}%`,
                        inline: false
                    },
                    {
                        name: '📊 XP Remaining',
                        value: `**${formatXP(progress.xpRemaining)}** XP needed for Level ${userData.level + 1}`,
                        inline: false
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.displayName}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in level command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching level information!'
            });
        }
    },
};
