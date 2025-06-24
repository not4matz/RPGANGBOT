const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { getXPProgress, createProgressBar, formatXP, getLevelColor, getLevelBadge, validateUserData, getLevelFromXP } = require('../utils/leveling');

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
            let userData = await database.getUser(targetUser.id, guildId);
            
            if (!userData) {
                // Create default level 0 data for users who haven't sent messages yet
                userData = {
                    user_id: targetUser.id,
                    guild_id: guildId,
                    xp: 0,
                    level: 1,
                    total_messages: 0,
                    voice_time_minutes: 0,
                    last_message_time: 0,
                    voice_join_time: 0,
                    last_voice_xp_time: 0
                };
            }

            // Validate and fix user data consistency
            userData = validateUserData(userData);
            
            // If data was corrected, update the database
            if (userData.level !== (await database.getUser(targetUser.id, guildId))?.level) {
                await database.setUserXP(targetUser.id, guildId, userData.xp);
                console.log(`✅ Fixed level data for user ${targetUser.id}`);
            }

            // Get user rank
            const rank = await database.getUserRank(targetUser.id, guildId) || 'Unranked';
            
            // Calculate display level (with easter egg support)
            const displayLevel = getLevelFromXP(userData.xp, targetUser.id);
            
            // Calculate progress (use actual level for progress calculations)
            const progress = getXPProgress(userData.xp, userData.level);
            const progressBar = createProgressBar(progress.currentLevelXP, progress.xpNeededForNext, 15);

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`${getLevelBadge(displayLevel)} Level Information`)
                .setDescription(`**${targetUser.displayName}**'s leveling stats`)
                .setColor(getLevelColor(displayLevel))
                .setThumbnail(targetUser.displayAvatarURL())
                .addFields(
                    {
                        name: '📈 Level',
                        value: `**${displayLevel}**`,
                        inline: true
                    },
                    {
                        name: '🏆 Rank',
                        value: rank ? `**#${rank}**` : '**Unranked**',
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
                        value: displayLevel === -69 ? 
                            `**∞** / **∞** XP\n${'🔥'.repeat(15)} ∞%\n*You are eternal at level -69!*` :
                            `**${formatXP(progress.currentLevelXP)}** / **${formatXP(progress.xpNeededForNext)}** XP\n${progressBar} ${progress.progress}%`,
                        inline: false
                    },
                    {
                        name: '📊 XP Remaining',
                        value: displayLevel === -69 ? 
                            `**∞** XP needed to escape the void...` :
                            `**${formatXP(progress.xpRemaining)}** XP needed for Level ${userData.level + 1}`,
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
