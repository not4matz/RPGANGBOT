const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');
const database = require('../utils/database');
const { getLevelFromXP, formatXP, getLevelColor, getLevelBadge } = require('../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addxp')
        .setDescription('➕ Add XP to a user (Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to add XP to')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of XP to add')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for adding XP')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Check if user is bot owner
            if (!isOwner(interaction.user.id)) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Access Denied')
                    .setDescription('This command is restricted to bot owners only.')
                    .setColor('#FF0000')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const targetUser = interaction.options.getUser('user');
            const xpAmount = interaction.options.getInteger('amount');
            const reason = interaction.options.getString('reason') || 'No reason provided';

            await interaction.deferReply({ flags: MessageFlags.Ephemeral });

            // Ensure user exists in database
            await database.upsertUser(targetUser.id, interaction.guild.id, 0);

            // Get current user data
            const userData = await database.getUser(targetUser.id, interaction.guild.id);
            if (!userData) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Database Error')
                    .setDescription('Failed to retrieve user data.')
                    .setColor('#FF0000')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            const oldXP = userData.xp;
            const oldLevel = getLevelFromXP(oldXP, targetUser.id);
            
            // Add XP
            await database.addXP(targetUser.id, interaction.guild.id, xpAmount);
            
            // Get updated user data
            const updatedUserData = await database.getUser(targetUser.id, interaction.guild.id);
            const newXP = updatedUserData.xp;
            const newLevel = getLevelFromXP(newXP, targetUser.id);

            // Update level if it changed
            if (newLevel !== oldLevel) {
                await database.updateUserLevel(targetUser.id, interaction.guild.id, newLevel);
            }

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('➕ XP Added Successfully')
                .setDescription(`Added XP to ${targetUser}`)
                .addFields(
                    { 
                        name: '📊 XP Changes', 
                        value: `**Before:** ${formatXP(oldXP)} XP (Level ${oldLevel})\n**After:** ${formatXP(newXP)} XP (Level ${newLevel})\n**Added:** ${formatXP(xpAmount)} XP`, 
                        inline: false 
                    },
                    { 
                        name: '📝 Reason', 
                        value: reason, 
                        inline: false 
                    }
                )
                .setColor(getLevelColor(newLevel))
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ 
                    text: `Purple Bot • Action by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // Add level up notification if applicable
            if (newLevel > oldLevel) {
                successEmbed.addFields({
                    name: '🎉 Level Up!',
                    value: `Level increased from **${oldLevel}** to **${newLevel}** ${getLevelBadge(newLevel)}`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [successEmbed] });

            // Log the action
            console.log(`➕ ${interaction.user.tag} added ${xpAmount} XP to ${targetUser.tag} (${oldXP} -> ${newXP}). Reason: ${reason}`);

        } catch (error) {
            console.error('Error in addxp command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while adding XP.')
                .setColor('#FF0000')
                .setTimestamp();

            try {
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ 
                        embeds: [errorEmbed], 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    },
};
