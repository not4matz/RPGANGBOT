const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');
const database = require('../utils/database');
const { getLevelFromXP } = require('../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('leveladmin')
        .setDescription('🔒 [OWNER ONLY] Manage the leveling system')
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
            console.error('Error in leveladmin command:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the command!',
                ephemeral: true
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
            ephemeral: true
        });
    }

    const userData = await database.getUser(user.id, guildId);
    if (!userData) {
        return await interaction.reply({
            content: `❌ ${user} has no level data to reset!`,
            ephemeral: true
        });
    }

    await database.resetUser(user.id, guildId);

    const embed = new EmbedBuilder()
        .setTitle('✅ User Reset')
        .setDescription(`Successfully reset ${user}'s level data`)
        .addFields(
            { name: 'Previous Level', value: userData.level.toString(), inline: true },
            { name: 'Previous XP', value: userData.xp.toLocaleString(), inline: true },
            { name: 'Previous Messages', value: userData.total_messages.toLocaleString(), inline: true }
        )
        .setColor('#ff0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleResetAll(interaction) {
    const guildId = interaction.guild.id;

    // Get count before reset
    const leaderboard = await database.getLeaderboard(guildId, 1000);
    const userCount = leaderboard.length;

    if (userCount === 0) {
        return await interaction.reply({
            content: '❌ No user data to reset in this server!',
            ephemeral: true
        });
    }

    await database.resetGuild(guildId);

    const embed = new EmbedBuilder()
        .setTitle('⚠️ Server Reset Complete')
        .setDescription(`Successfully reset level data for **${userCount}** users in this server`)
        .setColor('#ff0000')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleSetXP(interaction) {
    const user = interaction.options.getUser('user');
    const xp = interaction.options.getInteger('xp');
    const guildId = interaction.guild.id;

    if (user.bot) {
        return await interaction.reply({
            content: '❌ Cannot modify bot levels!',
            ephemeral: true
        });
    }

    // Get current user data for comparison
    let userData = await database.getUser(user.id, guildId);
    if (!userData) {
        // Create user if they don't exist
        await database.upsertUser(user.id, guildId, 0);
        userData = { xp: 0, level: 1 };
    }

    // Calculate new level
    const newLevel = getLevelFromXP(xp);
    
    // Update XP and level using the proper database method
    await database.setUserXP(user.id, guildId, xp, newLevel);

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Updated')
        .setDescription(`Successfully set ${user}'s XP`)
        .addFields(
            { name: 'New XP', value: xp.toLocaleString(), inline: true },
            { name: 'New Level', value: newLevel.toString(), inline: true },
            { name: 'Previous XP', value: userData.xp.toLocaleString(), inline: true }
        )
        .setColor('#00ff00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleAddXP(interaction) {
    const user = interaction.options.getUser('user');
    const xpToAdd = interaction.options.getInteger('xp');
    const guildId = interaction.guild.id;

    if (user.bot) {
        return await interaction.reply({
            content: '❌ Cannot modify bot levels!',
            ephemeral: true
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
    const newLevel = getLevelFromXP(newXP);
    
    // Update the level to match the new XP total
    await database.setUserXP(user.id, guildId, newXP, newLevel);

    const embed = new EmbedBuilder()
        .setTitle('✅ XP Added')
        .setDescription(`Successfully added XP to ${user}`)
        .addFields(
            { name: 'XP Added', value: xpToAdd.toLocaleString(), inline: true },
            { name: 'New Total XP', value: newXP.toLocaleString(), inline: true },
            { name: 'New Level', value: newLevel.toString(), inline: true }
        )
        .setColor('#00ff00')
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStats(interaction) {
    const guildId = interaction.guild.id;

    // Get statistics
    const leaderboard = await database.getLeaderboard(guildId, 1000);
    const totalUsers = leaderboard.length;
    
    if (totalUsers === 0) {
        return await interaction.reply({
            content: '❌ No leveling data found for this server!',
            ephemeral: true
        });
    }

    const totalXP = leaderboard.reduce((sum, user) => sum + user.xp, 0);
    const totalMessages = leaderboard.reduce((sum, user) => sum + user.total_messages, 0);
    const totalVoiceMinutes = leaderboard.reduce((sum, user) => sum + (user.voice_time_minutes || 0), 0);
    const avgLevel = leaderboard.reduce((sum, user) => sum + user.level, 0) / totalUsers;
    const maxLevel = Math.max(...leaderboard.map(user => user.level));
    const topUser = leaderboard[0];

    const embed = new EmbedBuilder()
        .setTitle('📊 Leveling System Statistics')
        .setDescription(`Statistics for **${interaction.guild.name}**`)
        .addFields(
            { name: '👥 Total Users', value: totalUsers.toLocaleString(), inline: true },
            { name: '💬 Total Messages', value: totalMessages.toLocaleString(), inline: true },
            { name: '🎤 Total Voice Time', value: `${Math.floor(totalVoiceMinutes).toLocaleString()} minutes`, inline: true },
            { name: '⭐ Total XP', value: totalXP.toLocaleString(), inline: true },
            { name: '📈 Average Level', value: avgLevel.toFixed(1), inline: true },
            { name: '🏆 Highest Level', value: maxLevel.toString(), inline: true },
            { name: '👑 Top User', value: `<@${topUser.user_id}>\nLevel ${topUser.level}`, inline: true },
            { name: '📊 XP Breakdown', value: `💬 Messages: ~${(totalMessages * 5).toLocaleString()} XP\n🎤 Voice: ~${(totalVoiceMinutes * 5).toLocaleString()} XP`, inline: true },
            { name: '⏱️ Voice Stats', value: `${Math.floor(totalVoiceMinutes / 60).toLocaleString()} hours total\n${Math.floor(totalVoiceMinutes / totalUsers).toLocaleString()} avg minutes per user`, inline: true }
        )
        .setColor('#5865f2')
        .setThumbnail(interaction.guild.iconURL())
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}
