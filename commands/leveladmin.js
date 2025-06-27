/**
 * Level Admin command - Cleaned and optimized
 * Owner-only admin commands for the leveling system
 */

const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');
const database = require('../utils/database');
const { getLevelFromXP, formatXP } = require('../utils/leveling');
const LEVELING_CONFIG = require('../config/levelingConfig');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leveladmin')
        .setDescription('🔒 Admin commands for the leveling system (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset a user\'s level and XP')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to reset')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('resetall')
                .setDescription('Reset ALL users in this server (DANGEROUS!)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setxp')
                .setDescription('Set a user\'s XP')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to modify')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('xp')
                        .setDescription('XP amount to set')
                        .setRequired(true)
                        .setMinValue(0)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('addxp')
                .setDescription('Add XP to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to give XP to')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('xp')
                        .setDescription('XP amount to add')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View leveling system statistics')),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'reset':
                    await handleReset(interaction);
                    break;
                case 'resetall':
                    await handleResetAll(interaction);
                    break;
                case 'setxp':
                    await handleSetXP(interaction);
                    break;
                case 'addxp':
                    await handleAddXP(interaction);
                    break;
                case 'stats':
                    await handleStats(interaction);
                    break;
            }
        } catch (error) {
            console.error('❌ Error in leveladmin command:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the command!',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};

async function handleReset(interaction) {
    const user = interaction.options.getUser('user');
    const guildId = interaction.guild.id;

    if (user.bot) {
        return await interaction.reply({
            content: '❌ Cannot reset bot levels!',
            flags: MessageFlags.Ephemeral
        });
    }

    const userData = await database.getUser(user.id, guildId);
    if (!userData) {
        return await interaction.reply({
            content: `❌ ${user} has no level data to reset!`,
            flags: MessageFlags.Ephemeral
        });
    }

    await database.resetUser(user.id, guildId);

    const embed = new EmbedBuilder()
        .setTitle('✅ User Reset')
        .setDescription(`Successfully reset ${user}'s level data`)
        .addFields(
            { name: '💜 Previous Level', value: userData.level.toString(), inline: true },
            { name: '💜 Previous XP', value: formatXP(userData.xp), inline: true },
            { name: '💜 Previous Messages', value: (userData.total_messages || 0).toLocaleString(), inline: true }
        )
        .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_25_PLUS)
        .setFooter({ text: LEVELING_CONFIG.EMBED_FOOTER_TEXT })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleResetAll(interaction) {
    const guildId = interaction.guild.id;

    // Get count before reset
    const userCount = await database.getTotalUsers(guildId);
    
    if (userCount === 0) {
        return await interaction.reply({
            content: '❌ No users to reset in this server!',
            flags: MessageFlags.Ephemeral
        });
    }

    await database.resetAllUsers(guildId);

    const embed = new EmbedBuilder()
        .setTitle('⚠️ Server Reset Complete')
        .setDescription(`Successfully reset **${userCount}** users in this server`)
        .addFields(
            { name: '🗑️ Users Reset', value: userCount.toString(), inline: true },
            { name: '⚠️ Warning', value: 'All level data has been permanently deleted', inline: false }
        )
        .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_75_PLUS)
        .setFooter({ text: LEVELING_CONFIG.EMBED_FOOTER_TEXT })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleSetXP(interaction) {
    const user = interaction.options.getUser('user');
    const newXP = interaction.options.getInteger('xp');
    const guildId = interaction.guild.id;

    if (user.bot) {
        return await interaction.reply({
            content: '❌ Cannot modify bot levels!',
            flags: MessageFlags.Ephemeral
        });
    }

    // Get current user data
    const userData = await database.getUser(user.id, guildId);
    const previousXP = userData ? userData.xp : 0;
    const previousLevel = userData ? userData.level : 1;

    // Set new XP and calculate new level (with easter egg support)
    const newLevel = getLevelFromXP(newXP, user.id);
    await database.setUserXP(user.id, guildId, newXP);

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Set')
        .setDescription(`Successfully set XP for ${user}`)
        .addFields(
            { name: '💜 New XP', value: formatXP(newXP), inline: true },
            { name: '💜 New Level', value: newLevel.toString(), inline: true },
            { name: '💜 Previous XP', value: formatXP(previousXP), inline: true }
        )
        .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_50_PLUS)
        .setFooter({ text: LEVELING_CONFIG.EMBED_FOOTER_TEXT })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleAddXP(interaction) {
    const user = interaction.options.getUser('user');
    const xpToAdd = interaction.options.getInteger('xp');
    const guildId = interaction.guild.id;

    if (user.bot) {
        return await interaction.reply({
            content: '❌ Cannot modify bot levels!',
            flags: MessageFlags.Ephemeral
        });
    }

    // Get current user data
    let userData = await database.getUser(user.id, guildId);
    if (!userData) {
        // Create user with the XP to add
        await database.upsertUser(user.id, guildId, xpToAdd);
        userData = { xp: 0, level: 1 };
    } else {
        // Add XP to existing user
        await database.upsertUser(user.id, guildId, xpToAdd);
    }

    const newXP = userData.xp + xpToAdd;
    const newLevel = getLevelFromXP(newXP, user.id);
    
    // Update the level to match the new XP total
    await database.setUserXP(user.id, guildId, newXP);

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Added')
        .setDescription(`Successfully added XP to ${user}`)
        .addFields(
            { name: '💜 XP Added', value: formatXP(xpToAdd), inline: true },
            { name: '💜 New Total XP', value: formatXP(newXP), inline: true },
            { name: '💜 New Level', value: newLevel.toString(), inline: true }
        )
        .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_10_PLUS)
        .setFooter({ text: LEVELING_CONFIG.EMBED_FOOTER_TEXT })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

async function handleStats(interaction) {
    const guildId = interaction.guild.id;

    // Get statistics
    const leaderboard = await database.getLeaderboard(guildId, 1000);
    const totalUsers = leaderboard.length;
    
    if (totalUsers === 0) {
        return await interaction.reply({
            content: '❌ No leveling data found for this server!',
            flags: MessageFlags.Ephemeral
        });
    }

    const totalXP = leaderboard.reduce((sum, user) => sum + user.xp, 0);
    const totalMessages = leaderboard.reduce((sum, user) => sum + user.total_messages, 0);
    const totalVoiceMinutes = leaderboard.reduce((sum, user) => sum + (user.voice_time_minutes || 0), 0);
    const avgLevel = leaderboard.reduce((sum, user) => sum + user.level, 0) / totalUsers;
    const maxLevel = Math.max(...leaderboard.map(user => user.level));
    const topUser = leaderboard[0];

    // Format voice time
    const totalVoiceHours = Math.floor(totalVoiceMinutes / 60);
    const avgVoiceMinutes = Math.floor(totalVoiceMinutes / totalUsers);

    const embed = new EmbedBuilder()
        .setTitle('📊 Leveling System Statistics')
        .setDescription(`Statistics for **${interaction.guild.name}**`)
        .addFields(
            { name: '👥 Total Users', value: totalUsers.toLocaleString(), inline: true },
            { name: '💬 Total Messages', value: totalMessages.toLocaleString(), inline: true },
            { name: '🎤 Total Voice Time', value: `${totalVoiceHours.toLocaleString()}h`, inline: true },
            { name: '⭐ Total XP', value: formatXP(totalXP), inline: true },
            { name: '📈 Average Level', value: avgLevel.toFixed(1), inline: true },
            { name: '🏆 Highest Level', value: maxLevel.toString(), inline: true },
            { name: '👑 Top User', value: `<@${topUser.user_id}>\nLevel ${topUser.level}`, inline: true },
            { name: '💜 XP Breakdown', value: `💬 Messages: ~${formatXP(totalMessages * LEVELING_CONFIG.XP_PER_MESSAGE)}\n🎤 Voice: ~${formatXP(totalVoiceMinutes * LEVELING_CONFIG.XP_PER_VOICE_MINUTE)}`, inline: true },
            { name: '⏱️ Voice Stats', value: `${totalVoiceHours.toLocaleString()} hours total\n${avgVoiceMinutes} avg minutes per user`, inline: true }
        )
        .setColor(LEVELING_CONFIG.LEVEL_COLORS.LEVEL_100_PLUS)
        .setThumbnail(interaction.guild.iconURL({ dynamic: true }))
        .setFooter({ text: LEVELING_CONFIG.EMBED_FOOTER_TEXT })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}
