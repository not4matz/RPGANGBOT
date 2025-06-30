const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { isOwner } = require('../utils/ownerCheck');
const { COLORS } = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('unjail')
        .setDescription('🔓 Release a user from jail (Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to unjail')
                .setRequired(true)),

    async execute(interaction) {
        // Check if user is owner
        if (!isOwner(interaction.user.id)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('🚫 Access Denied')
                .setDescription('This command is restricted to bot owners only.')
                .setFooter({ text: 'Purple Bot Security System' })
                .setTimestamp();

            return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const targetUser = interaction.options.getUser('user');
        const guild = interaction.guild;

        try {
            // Check if user is jailed
            const jailData = await database.getJailData(targetUser.id, guild.id);
            if (!jailData) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setTitle('⚠️ User Not Jailed')
                    .setDescription(`${targetUser.tag} is not currently jailed.`)
                    .setFooter({ text: 'Purple Bot' })
                    .setTimestamp();

                return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }

            // Get the target member
            const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!targetMember) {
                // User left the server, just remove from database
                await database.unjailUser(targetUser.id, guild.id);
                
                const successEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle('🔓 User Unjailed')
                    .setDescription(`${targetUser.tag} has been removed from jail (user no longer in server).`)
                    .setFooter({ text: 'Purple Bot Jail System' })
                    .setTimestamp();

                return interaction.reply({ embeds: [successEmbed] });
            }

            // Get the jailed role
            const jailedRole = guild.roles.cache.find(role => role.name === 'Jailed');
            
            // Remove jailed role
            if (jailedRole && targetMember.roles.cache.has(jailedRole.id)) {
                await targetMember.roles.remove(jailedRole);
            }

            // Restore original roles
            if (jailData.original_roles) {
                const roleIds = jailData.original_roles.split(',').filter(id => id);
                const validRoles = [];
                
                for (const roleId of roleIds) {
                    const role = guild.roles.cache.get(roleId);
                    if (role && role.id !== guild.id) { // Exclude @everyone
                        validRoles.push(role);
                    }
                }
                
                if (validRoles.length > 0) {
                    try {
                        await targetMember.roles.add(validRoles);
                    } catch (error) {
                        console.error(`❌ Error restoring roles for ${targetUser.tag}:`, error);
                    }
                }
            }

            // Remove from database
            await database.unjailUser(targetUser.id, guild.id);

            // Send DM to the unjailed user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(COLORS.SUCCESS)
                    .setTitle('🔓 You Have Been Released')
                    .setDescription(`You have been released from jail in **${guild.name}**.`)
                    .addFields(
                        { name: '📝 Original Reason', value: jailData.reason || 'No reason provided', inline: false },
                        { name: '🔧 Released By', value: `${interaction.user.tag}`, inline: true },
                        { name: '🎉 Status', value: 'You now have full access to the server again!', inline: false }
                    )
                    .setFooter({ text: 'Purple Bot Jail System' })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`❌ Could not send DM to ${targetUser.tag}:`, error.message);
            }

            // Calculate remaining time for display
            const remainingTime = Math.max(0, jailData.jail_end_time - Date.now());
            const remainingMinutes = Math.floor(remainingTime / (1000 * 60));

            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('🔓 User Released Successfully')
                .setDescription(`${targetUser.tag} has been released from jail.`)
                .addFields(
                    { name: '👤 User', value: `${targetUser} (${targetUser.tag})`, inline: true },
                    { name: '📝 Original Reason', value: jailData.reason || 'No reason provided', inline: true },
                    { name: '⏰ Time Remaining', value: remainingMinutes > 0 ? `${remainingMinutes} minutes` : 'Expired', inline: true },
                    { name: '🔧 Released By', value: `${interaction.user.tag}`, inline: true },
                    { name: '📊 Roles Restored', value: jailData.original_roles ? `${jailData.original_roles.split(',').length} roles` : 'No roles to restore', inline: true },
                    { name: '🕐 Jailed Duration', value: `${jailData.jail_time} minutes`, inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: 'Purple Bot Jail System' })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

            // Log the unjail action
            console.log(`🔓 ${interaction.user.tag} released ${targetUser.tag} from jail.`);

        } catch (error) {
            console.error('❌ Error in unjail command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('❌ Unjail Failed')
                .setDescription('An error occurred while trying to release the user from jail.')
                .addFields({ name: '🐛 Error', value: error.message, inline: false })
                .setFooter({ text: 'Purple Bot' })
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
