const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CONFIG, getXPForLevel } = require('../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('levelexplain')
        .setDescription('📚 Learn how the leveling system works'),
    
    async execute(interaction) {
        try {
            // Create main explanation embed
            const mainEmbed = new EmbedBuilder()
                .setTitle('📚 Leveling System Explained')
                .setDescription('Here\'s everything you need to know about gaining XP and leveling up!')
                .setColor('#5865f2')
                .setThumbnail(interaction.guild.iconURL())
                .addFields(
                    {
                        name: '💬 Message XP',
                        value: `• **${CONFIG.XP_PER_MESSAGE} XP** per message\n• **${CONFIG.MESSAGE_COOLDOWN / 60000} minute** cooldown between messages\n• Only counts in text channels\n• Bot messages don't count`,
                        inline: false
                    },
                    {
                        name: '🎤 Voice XP',
                        value: `• **${CONFIG.XP_PER_VOICE_MINUTE} XP** per minute in voice channels\n• Must not be alone in the channel\n• Must not be muted or deafened\n• Automatic XP every minute`,
                        inline: false
                    },
                    {
                        name: '📈 Exponential Level Progression',
                        value: `• **Level 1**: 0 XP (starting point)\n• **Level 2**: ${getXPForLevel(2)} XP needed\n• **Level 5**: ${getXPForLevel(5)} XP needed\n• **Level 10**: ${getXPForLevel(10)} XP needed\n• **Level 25**: ${getXPForLevel(25)} XP needed\n• Each level requires **${CONFIG.MULTIPLIER}x more XP** than the previous gap!`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Use /level to check your progress!',
                    iconURL: interaction.client.user.displayAvatarURL()
                })
                .setTimestamp();

            // Create XP calculation examples embed
            const examplesEmbed = new EmbedBuilder()
                .setTitle('🧮 XP Calculation Examples')
                .setColor('#00ff00')
                .addFields(
                    {
                        name: '💬 Message Examples',
                        value: `• **10 messages** = ${CONFIG.XP_PER_MESSAGE * 10} XP\n• **50 messages** = ${CONFIG.XP_PER_MESSAGE * 50} XP\n• **100 messages** = ${CONFIG.XP_PER_MESSAGE * 100} XP`,
                        inline: true
                    },
                    {
                        name: '🎤 Voice Examples',
                        value: `• **10 minutes** = ${CONFIG.XP_PER_VOICE_MINUTE * 10} XP\n• **30 minutes** = ${CONFIG.XP_PER_VOICE_MINUTE * 30} XP\n• **1 hour** = ${CONFIG.XP_PER_VOICE_MINUTE * 60} XP`,
                        inline: true
                    },
                    {
                        name: '🎯 Level Goals (Exponential)',
                        value: `• **Level 2**: ${Math.ceil(getXPForLevel(2) / CONFIG.XP_PER_MESSAGE)} messages OR ${Math.ceil(getXPForLevel(2) / CONFIG.XP_PER_VOICE_MINUTE)} minutes voice\n• **Level 5**: ${Math.ceil(getXPForLevel(5) / CONFIG.XP_PER_MESSAGE)} messages OR ${Math.ceil(getXPForLevel(5) / CONFIG.XP_PER_VOICE_MINUTE)} minutes voice\n• **Level 10**: ${Math.ceil(getXPForLevel(10) / CONFIG.XP_PER_MESSAGE)} messages OR ${Math.ceil(getXPForLevel(10) / CONFIG.XP_PER_VOICE_MINUTE)} minutes voice`,
                        inline: false
                    },
                    {
                        name: '⚡ Exponential Growth',
                        value: `Higher levels require **exponentially more XP**!\n• Level 25: ${getXPForLevel(25).toLocaleString()} XP (${Math.round(getXPForLevel(25) / 5 / 60 * 10) / 10} hours)\n• Level 50: ${getXPForLevel(50).toLocaleString()} XP (${Math.round(getXPForLevel(50) / 5 / 60 * 10) / 10} hours)\n• Level 100: ${getXPForLevel(100).toLocaleString()} XP (${Math.round(getXPForLevel(100) / 5 / 60 * 10) / 10} hours) 🏆`,
                        inline: false
                    }
                )
                .setFooter({ 
                    text: 'Mix messages and voice chat for faster progression!',
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            // Create tips and features embed
            const tipsEmbed = new EmbedBuilder()
                .setTitle('💡 Tips & Features')
                .setColor('#ffaa00')
                .addFields(
                    {
                        name: '🚀 Level Up Announcements',
                        value: '• Automatic announcements when you level up\n• Special badges for different level ranges\n• Colorful embeds to celebrate your progress',
                        inline: false
                    },
                    {
                        name: '🏆 Ranking System',
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
                    text: 'Every message and minute in voice counts towards your level!',
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            // Create level badges explanation embed
            const badgesEmbed = new EmbedBuilder()
                .setTitle('🎖️ Level Badges & Colors')
                .setColor('#aa00ff')
                .addFields(
                    {
                        name: '🌟 Beginner (Levels 1-4)',
                        value: '**Badge**: 🌟 Star\n**Color**: Blue\n**Description**: Just getting started!',
                        inline: true
                    },
                    {
                        name: '⭐ Regular (Levels 5-9)',
                        value: '**Badge**: ⭐ Bright Star\n**Color**: Green\n**Description**: Making good progress!',
                        inline: true
                    },
                    {
                        name: '🔥 Active (Levels 10-19)',
                        value: '**Badge**: 🔥 Fire\n**Color**: Orange\n**Description**: Really active member!',
                        inline: true
                    },
                    {
                        name: '💎 Expert (Levels 20-49)',
                        value: '**Badge**: 💎 Diamond\n**Color**: Cyan\n**Description**: Experienced community member!',
                        inline: true
                    },
                    {
                        name: '🏆 Master (Levels 50-99)',
                        value: '**Badge**: 🏆 Trophy\n**Color**: Gold\n**Description**: Master of the community!',
                        inline: true
                    },
                    {
                        name: '👑 Legend (Level 100+)',
                        value: '**Badge**: 👑 Crown\n**Color**: Purple\n**Description**: Legendary status achieved!',
                        inline: true
                    }
                )
                .setFooter({ 
                    text: 'Which badge will you earn next?',
                    iconURL: interaction.client.user.displayAvatarURL()
                });

            // Send all embeds
            await interaction.reply({ 
                embeds: [mainEmbed, examplesEmbed, tipsEmbed, badgesEmbed],
                ephemeral: false
            });

        } catch (error) {
            console.error('Error in levelexplain command:', error);
            await interaction.reply({
                content: '❌ An error occurred while explaining the leveling system!',
                ephemeral: true
            });
        }
    }
};
