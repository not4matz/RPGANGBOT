const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');
const database = require('../utils/database');
const { getLevelFromXP, formatXP } = require('../utils/leveling');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('removexp')
        .setDescription('🗑️ Remove XP from a user (Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to remove XP from')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount of XP to remove')
                .setRequired(true)
                .setMinValue(1))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for removing XP')
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

            // Get current user data
            const userData = await database.getUser(targetUser.id, interaction.guild.id);
            if (!userData) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ User Not Found')
                    .setDescription(`${targetUser} is not registered in the leveling system.`)
                    .setColor('#FF0000')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            const oldXP = userData.xp;
            const oldLevel = getLevelFromXP(oldXP, targetUser.id);
            
            // Calculate new XP (don't go below 0)
            const newXP = Math.max(0, oldXP - xpAmount);
            const actualRemoved = oldXP - newXP;
            const newLevel = getLevelFromXP(newXP, targetUser.id);

            // Update XP in database
            await database.setUserXP(targetUser.id, interaction.guild.id, newXP);
            
            // Update level if it changed
            if (newLevel !== oldLevel) {
                await database.updateUserLevel(targetUser.id, interaction.guild.id, newLevel);
            }

            // Create success embed
            const successEmbed = new EmbedBuilder()
                .setTitle('🗑️ XP Removed Successfully')
                .setDescription(`Removed XP from ${targetUser}`)
                .addFields(
                    { 
                        name: '📊 XP Changes', 
                        value: `**Before:** ${formatXP(oldXP)} XP (Level ${oldLevel})\n**After:** ${formatXP(newXP)} XP (Level ${newLevel})\n**Removed:** ${formatXP(actualRemoved)} XP`, 
                        inline: false 
                    },
                    { 
                        name: '📝 Reason', 
                        value: reason, 
                        inline: false 
                    }
                )
                .setColor('#FF6B6B')
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ 
                    text: `Purple Bot • Action by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            // Add level change notification if applicable
            if (newLevel !== oldLevel) {
                successEmbed.addFields({
                    name: '📉 Level Change',
                    value: `Level decreased from **${oldLevel}** to **${newLevel}**`,
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [successEmbed] });

            // Log the action
            console.log(`🗑️ ${interaction.user.tag} removed ${actualRemoved} XP from ${targetUser.tag} (${oldXP} -> ${newXP}). Reason: ${reason}`);

        } catch (error) {
            console.error('Error in removexp command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while removing XP.')
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
