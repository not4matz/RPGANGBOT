/**
 * Level Explain command - Cleaned and optimized
 * Comprehensive explanation of the leveling system
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { getXPForLevel } = require('../utils/leveling');
const LEVELING_CONFIG = require('../config/levelingConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelexplain')
        .setDescription('📚 Learn how the leveling system works'),
    
    async execute(interaction) {
        try {
            // Create main explanation embed
            const mainEmbed = new EmbedBuilder()
                .setTitle('🔮 Leveling System Explained')
                .setDescription('Here\'s everything you need to know about gaining XP and leveling up!')
                .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_50_PLUS)
                .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
                .addFields(
                    {
                        name: '💬 Message XP',
                        value: `• **${LEVELING_CONFIG.XP_PER_MESSAGE} XP** per message\n• **${LEVELING_CONFIG.MESSAGE_COOLDOWN / 60000} minute** cooldown between messages\n• Only counts in text channels\n• Bot messages don't count`,
                        inline: false
                    },
                    {
                        name: '🎤 Voice XP',
                        value: `• **${LEVELING_CONFIG.XP_PER_VOICE_MINUTE} XP** per minute in voice channels\n• Must not be alone in the channel\n• Must not be muted or deafened\n• Automatic XP every minute`,
                        inline: false
                    },
                    {
                        name: '📈 Exponential Level Progression',
                        value: `• **Level 1**: 0 XP (starting point)\n• **Level 2**: ${getXPForLevel(2)} XP needed\n• **Level 5**: ${getXPForLevel(5)} XP needed\n• **Level 10**: ${getXPForLevel(10)} XP needed\n• **Level 25**: ${getXPForLevel(25)} XP needed\n• Each level requires **${LEVELING_CONFIG.MULTIPLIER}x more XP** than the previous gap!`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                })
                .setTimestamp();

            // Create XP calculation examples embed
            const examplesEmbed = new EmbedBuilder()
                .setTitle('🧮 XP Calculation Examples')
                .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_25_PLUS)
                .addFields(
                    {
                        name: '💬 Message Examples',
                        value: `• **10 messages** = ${LEVELING_CONFIG.XP_PER_MESSAGE * 10} XP\n• **50 messages** = ${LEVELING_CONFIG.XP_PER_MESSAGE * 50} XP\n• **100 messages** = ${LEVELING_CONFIG.XP_PER_MESSAGE * 100} XP`,
                        inline: true
                    },
                    {
                        name: '🎤 Voice Examples',
                        value: `• **10 minutes** = ${LEVELING_CONFIG.XP_PER_VOICE_MINUTE * 10} XP\n• **30 minutes** = ${LEVELING_CONFIG.XP_PER_VOICE_MINUTE * 30} XP\n• **1 hour** = ${LEVELING_CONFIG.XP_PER_VOICE_MINUTE * 60} XP`,
                        inline: true
                    },
                    {
                        name: '🎯 Level Goals (Exponential)',
                        value: `• **Level 2**: ${Math.ceil(getXPForLevel(2) / LEVELING_CONFIG.XP_PER_MESSAGE)} messages OR ${Math.ceil(getXPForLevel(2) / LEVELING_CONFIG.XP_PER_VOICE_MINUTE)} minutes voice\n• **Level 5**: ${Math.ceil(getXPForLevel(5) / LEVELING_CONFIG.XP_PER_MESSAGE)} messages OR ${Math.ceil(getXPForLevel(5) / LEVELING_CONFIG.XP_PER_VOICE_MINUTE)} minutes voice\n• **Level 10**: ${Math.ceil(getXPForLevel(10) / LEVELING_CONFIG.XP_PER_MESSAGE)} messages OR ${Math.ceil(getXPForLevel(10) / LEVELING_CONFIG.XP_PER_VOICE_MINUTE)} minutes voice`,
                        inline: false
                    },
                    {
                        name: '⚡ Exponential Growth',
                        value: `The leveling system uses **exponential progression**:\n• Early levels (1-10) are quick and accessible\n• Mid levels (10-50) require regular participation\n• High levels (50-100) need serious dedication\n• **Level 100** takes approximately **${Math.ceil(getXPForLevel(100) / LEVELING_CONFIG.XP_PER_VOICE_MINUTE / 60)} hours** of voice chat!`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                });

            // Create tips and features embed
            const tipsEmbed = new EmbedBuilder()
                .setTitle('💡 Tips & Features')
                .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_10_PLUS)
                .addFields(
                    {
                        name: '🎉 Level-Up Announcements',
                        value: '• Get congratulated when you level up!\n• Announcements appear in the designated channel\n• Shows your new level and progress',
                        inline: false
                    },
                    {
                        name: '👑 Ranking System',
                        value: '• Check your server rank with `/level`\n• View the leaderboard with `/leaderboard`\n• See who\'s the most active in your server',
                        inline: false
                    },
                    {
                        name: '📊 Progress Tracking',
                        value: '• Visual progress bars in `/level`\n• Track both message and voice activity\n• See detailed statistics and time spent',
                        inline: false
                    },
                    {
                        name: '⚡ Pro Tips',
                        value: '• **Be active in voice channels** for consistent XP\n• **Chat regularly** but respect the cooldown\n• **Stay engaged** - both methods count!\n• **Check `/level`** to track your progress',
                        inline: false
                    }
                )
                .setFooter({ 
                    text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                });

            // Create level badges explanation embed
            const badgesEmbed = new EmbedBuilder()
                .setTitle('🎖️ Level Badges & Colors')
                .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_100_PLUS)
                .addFields(
                    {
                        name: '🟣 Beginner (Levels 1-4)',
                        value: '**Badge**: 🟣 Purple Circle\n**Color**: Plum\n**Description**: Just getting started!',
                        inline: true
                    },
                    {
                        name: '✨ Regular (Levels 5-9)',
                        value: '**Badge**: ✨ Sparkles\n**Color**: Orchid\n**Description**: Making good progress!',
                        inline: true
                    },
                    {
                        name: '🌟 Active (Levels 10-24)',
                        value: '**Badge**: 🌟 Star\n**Color**: Medium Orchid\n**Description**: Really active member!',
                        inline: true
                    },
                    {
                        name: '💜 Expert (Levels 25-49)',
                        value: '**Badge**: 💜 Purple Heart\n**Color**: Dark Orchid\n**Description**: Experienced community member!',
                        inline: true
                    },
                    {
                        name: '🔮 Master (Levels 50-74)',
                        value: '**Badge**: 🔮 Crystal Ball\n**Color**: Blue Violet\n**Description**: Master of the community!',
                        inline: true
                    },
                    {
                        name: '💎 Elite (Levels 75-99)',
                        value: '**Badge**: 💎 Diamond\n**Color**: Purple\n**Description**: Elite status achieved!',
                        inline: true
                    },
                    {
                        name: '👑 Legend (Level 100+)',
                        value: '**Badge**: 👑 Crown\n**Color**: Indigo\n**Description**: Legendary status achieved!',
                        inline: true
                    }
                )
                .setFooter({ 
                    text: LEVELING_CONFIG.EMBED_FOOTER_TEXT,
                    iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
                });

            // Send all embeds
            await interaction.reply({ 
                embeds: [mainEmbed, examplesEmbed, tipsEmbed, badgesEmbed],
                ephemeral: false
            });

        } catch (error) {
            console.error('❌ Error in levelexplain command:', error);
            await interaction.reply({
                content: '❌ An error occurred while explaining the leveling system!',
                flags: MessageFlags.Ephemeral
            });
        }
    }
};
