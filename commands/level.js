/**
 * Level command - Cleaned and optimized
 * Shows user level, XP, progress, and ranking information
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const { getLevelFromXP, getXPForLevel, getXPProgress, createProgressBar, formatXP, getLevelColor, getLevelBadge, validateUserData } = require('../utils/leveling');
const LEVELING_CONFIG = require('../config/levelingConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('level')
        .setDescription('Check your or another user\'s level and XP')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to check level for')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const targetUser = interaction.options.getUser('user') || interaction.user;
            const guildId = interaction.guild.id;
            
            // Get user data from database
            let userData = await database.getUser(targetUser.id, guildId);
            
            // Auto-register user if not in database
            if (!userData) {
                await database.upsertUser(targetUser.id, guildId, 0);
                userData = await database.getUser(targetUser.id, guildId);
            }
            
            // Validate and fix data consistency
            userData = validateUserData(userData);
            if (!userData) {
                return await interaction.editReply({
                    content: '❌ Error retrieving user data. Please try again.',
                });
            }
            
            // Update database if data was corrected
            if (userData.level !== (await database.getUser(targetUser.id, guildId)).level) {
                await database.updateUserLevel(targetUser.id, guildId, userData.level);
            }
            
            // Calculate level information (with easter egg support)
            const currentLevel = getLevelFromXP(userData.xp, targetUser.id);
            const isEasterEgg = currentLevel === LEVELING_CONFIG.EASTER_EGG_LEVEL;
            
            // Get ranking
            const ranking = await database.getUserRank(targetUser.id, guildId);
            
            // Calculate progress to next level
            let progressInfo;
            if (isEasterEgg) {
                // Special handling for easter egg user
                progressInfo = {
                    current: '∞',
                    needed: '∞',
                    progress: '∞',
                    progressBar: '🔥'.repeat(15) + ' ∞%',
                    nextLevel: 'eternal'
                };
            } else {
                const nextLevel = currentLevel + 1;
                const currentLevelXP = getXPForLevel(currentLevel);
                const nextLevelXP = getXPForLevel(nextLevel);
                const progressXP = userData.xp - currentLevelXP;
                const neededXP = nextLevelXP - currentLevelXP;
                
                progressInfo = {
                    current: formatXP(progressXP),
                    needed: formatXP(neededXP),
                    progress: formatXP(nextLevelXP - userData.xp),
                    progressBar: createProgressBar(progressXP, neededXP) + ` ${Math.floor((progressXP / neededXP) * 100)}%`,
                    nextLevel: nextLevel
                };
            }
            
            // Format voice time
            const voiceHours = Math.floor((userData.voice_time_minutes || 0) / 60);
            const voiceMinutes = (userData.voice_time_minutes || 0) % 60;
            const voiceTimeFormatted = `${voiceHours}h ${voiceMinutes}m`;
            
            // Create embed with purple theme
            const levelEmbed = new EmbedBuilder()
                .setTitle(`${getLevelBadge(currentLevel)} Level Information`)
                .setDescription(`**${targetUser.displayName}**'s leveling stats`)
                .setColor(getLevelColor(currentLevel))
                .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
                .addFields(
                    {
                        name: '🔮 **Level & XP**',
                        value: `**Level:** ${currentLevel}\n**Total XP:** ${formatXP(userData.xp)}\n**Rank:** #${ranking}`,
                        inline: true
                    },
                    {
                        name: '👑 **Activity Stats**',
                        value: `**Messages:** ${(userData.total_messages || 0).toLocaleString()}\n**Voice Time:** ${voiceTimeFormatted}\n**XP Sources:** ${Math.round(((userData.total_messages || 0) / (userData.xp || 1)) * 100)}% msg, ${Math.round((((userData.voice_time_minutes || 0) * LEVELING_CONFIG.XP_PER_VOICE_MINUTE) / (userData.xp || 1)) * 100)}% voice`,
                        inline: true
                    },
                    {
                        name: '✨ **Progress**',
                        value: isEasterEgg 
                            ? `${progressInfo.progressBar}\n**${progressInfo.current}** / **${progressInfo.needed}** XP\n*You are eternal at level ${LEVELING_CONFIG.EASTER_EGG_LEVEL}!*`
                            : `${progressInfo.progressBar}\n**${progressInfo.current}** / **${progressInfo.needed}** XP\n**${progressInfo.progress}** XP needed for level ${progressInfo.nextLevel}`,
                        inline: false
                    }
                )
                .setFooter({
                    text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [levelEmbed] });

        } catch (error) {
            console.error('❌ Error in level command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fetching level information. Please try again.',
            });
        }
    },
};
