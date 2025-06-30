const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { isOwner } = require('../utils/ownerCheck');
const { COLORS } = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jailadmin')
        .setDescription('🔒 Admin commands for the jail system (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all active jails in the server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check jail status of a specific user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to check jail status for')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup')
                .setDescription('Clean up expired jails manually'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stats')
                .setDescription('View jail system statistics')),

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

        const subcommand = interaction.options.getSubcommand();
        const guild = interaction.guild;

        try {
            switch (subcommand) {
                case 'list':
                    await this.handleList(interaction, guild);
                    break;
                case 'status':
                    await this.handleStatus(interaction, guild);
                    break;
                case 'cleanup':
                    await this.handleCleanup(interaction, guild);
                    break;
                case 'stats':
                    await this.handleStats(interaction, guild);
                    break;
                default:
                    throw new Error('Unknown subcommand');
            }
        } catch (error) {
            console.error('❌ Error in jailadmin command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('❌ Command Failed')
                .setDescription('An error occurred while executing the jail admin command.')
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

    async handleList(interaction, guild) {
        const activeJails = await database.getActiveJails(guild.id);
        
        if (activeJails.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('🔓 No Active Jails')
                .setDescription('There are currently no users in jail.')
                .setFooter({ text: 'Purple Bot Jail System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle(`🔒 Active Jails (${activeJails.length})`)
            .setDescription('List of all currently jailed users:')
            .setFooter({ text: 'Purple Bot Jail System' })
            .setTimestamp();

        for (let i = 0; i < Math.min(activeJails.length, 10); i++) {
            const jail = activeJails[i];
            const user = await interaction.client.users.fetch(jail.user_id).catch(() => null);
            const jailedBy = await interaction.client.users.fetch(jail.jailed_by).catch(() => null);
            
            const remainingTime = Math.max(0, jail.jail_end_time - Date.now());
            const remainingMinutes = Math.floor(remainingTime / (1000 * 60));
            
            embed.addFields({
                name: `👤 ${user ? user.tag : `Unknown User (${jail.user_id})`}`,
                value: `**Reason:** ${jail.reason || 'No reason provided'}\n` +
                       `**Duration:** ${jail.jail_time} minutes\n` +
                       `**Remaining:** ${remainingMinutes > 0 ? `${remainingMinutes} minutes` : 'Expired'}\n` +
                       `**Jailed By:** ${jailedBy ? jailedBy.tag : 'Unknown'}\n` +
                       `**Release:** <t:${Math.floor(jail.jail_end_time / 1000)}:R>`,
                inline: false
            });
        }

        if (activeJails.length > 10) {
            embed.addFields({
                name: '📊 Note',
                value: `Showing first 10 of ${activeJails.length} active jails.`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    },

    async handleStatus(interaction, guild) {
        const targetUser = interaction.options.getUser('user');
        const jailData = await database.getJailData(targetUser.id, guild.id);

        if (!jailData) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('🔓 User Not Jailed')
                .setDescription(`${targetUser.tag} is not currently jailed.`)
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: 'Purple Bot Jail System' })
                .setTimestamp();

            return interaction.reply({ embeds: [embed] });
        }

        const jailedBy = await interaction.client.users.fetch(jailData.jailed_by).catch(() => null);
        const remainingTime = Math.max(0, jailData.jail_end_time - Date.now());
        const remainingMinutes = Math.floor(remainingTime / (1000 * 60));
        const isExpired = remainingTime <= 0;

        const embed = new EmbedBuilder()
            .setColor(isExpired ? COLORS.WARNING : COLORS.ERROR)
            .setTitle(`🔒 ${targetUser.tag} - Jail Status`)
            .setDescription(isExpired ? '⚠️ **Jail time has expired but user not yet released**' : '🔒 **Currently jailed**')
            .addFields(
                { name: '📝 Reason', value: jailData.reason || 'No reason provided', inline: false },
                { name: '⏰ Duration', value: `${jailData.jail_time} minutes`, inline: true },
                { name: '🕐 Remaining', value: isExpired ? 'Expired' : `${remainingMinutes} minutes`, inline: true },
                { name: '🔧 Jailed By', value: jailedBy ? jailedBy.tag : 'Unknown', inline: true },
                { name: '📅 Jailed At', value: `<t:${Math.floor(new Date(jailData.created_at).getTime() / 1000)}:F>`, inline: true },
                { name: '🕐 Release Time', value: `<t:${Math.floor(jailData.jail_end_time / 1000)}:F>`, inline: true },
                { name: '📊 Original Roles', value: jailData.original_roles ? `${jailData.original_roles.split(',').length} roles saved` : 'No roles saved', inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL())
            .setFooter({ text: 'Purple Bot Jail System' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },

    async handleCleanup(interaction, guild) {
        await interaction.deferReply();

        const expiredJails = await database.getExpiredJails(guild.id);
        
        if (expiredJails.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('✅ No Cleanup Needed')
                .setDescription('There are no expired jails to clean up.')
                .setFooter({ text: 'Purple Bot Jail System' })
                .setTimestamp();

            return interaction.editReply({ embeds: [embed] });
        }

        let cleanedCount = 0;
        let errorCount = 0;

        for (const jailData of expiredJails) {
            try {
                const member = await guild.members.fetch(jailData.user_id).catch(() => null);
                
                if (member) {
                    // Remove jailed role
                    const jailedRole = guild.roles.cache.find(role => role.name === 'Jailed');
                    if (jailedRole && member.roles.cache.has(jailedRole.id)) {
                        await member.roles.remove(jailedRole);
                    }

                    // Restore original roles
                    if (jailData.original_roles) {
                        const roleIds = jailData.original_roles.split(',').filter(id => id);
                        const validRoles = [];
                        
                        for (const roleId of roleIds) {
                            const role = guild.roles.cache.get(roleId);
                            if (role && role.id !== guild.id) {
                                validRoles.push(role);
                            }
                        }
                        
                        if (validRoles.length > 0) {
                            await member.roles.add(validRoles);
                        }
                    }
                }

                // Remove from database
                await database.unjailUser(jailData.user_id, guild.id);
                cleanedCount++;

            } catch (error) {
                console.error(`❌ Error cleaning up jail for user ${jailData.user_id}:`, error);
                errorCount++;
            }
        }

        const embed = new EmbedBuilder()
            .setColor(COLORS.SUCCESS)
            .setTitle('🧹 Jail Cleanup Complete')
            .setDescription('Expired jail cleanup has been completed.')
            .addFields(
                { name: '✅ Successfully Cleaned', value: `${cleanedCount} users`, inline: true },
                { name: '❌ Errors', value: `${errorCount} users`, inline: true },
                { name: '📊 Total Processed', value: `${expiredJails.length} expired jails`, inline: true }
            )
            .setFooter({ text: 'Purple Bot Jail System' })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleStats(interaction, guild) {
        const activeJails = await database.getActiveJails(guild.id);
        const expiredJails = await database.getExpiredJails(guild.id);
        
        // Get jailed role info
        const jailedRole = guild.roles.cache.find(role => role.name === 'Jailed');
        const jailedRoleMembers = jailedRole ? jailedRole.members.size : 0;

        const embed = new EmbedBuilder()
            .setColor(COLORS.PRIMARY)
            .setTitle('📊 Jail System Statistics')
            .setDescription(`Statistics for **${guild.name}**`)
            .addFields(
                { name: '🔒 Active Jails', value: `${activeJails.length} users`, inline: true },
                { name: '⏰ Expired Jails', value: `${expiredJails.length} users`, inline: true },
                { name: '👥 Jailed Role Members', value: `${jailedRoleMembers} users`, inline: true },
                { name: '🎭 Jailed Role', value: jailedRole ? `${jailedRole.name} (${jailedRole.id})` : 'Not created', inline: false }
            )
            .setFooter({ text: 'Purple Bot Jail System' })
            .setTimestamp();

        if (activeJails.length > 0) {
            const totalMinutes = activeJails.reduce((sum, jail) => sum + jail.jail_time, 0);
            const avgMinutes = Math.round(totalMinutes / activeJails.length);
            
            embed.addFields(
                { name: '📈 Average Jail Time', value: `${avgMinutes} minutes`, inline: true },
                { name: '⏱️ Total Jail Time', value: `${totalMinutes} minutes`, inline: true }
            );
        }

        if (expiredJails.length > 0) {
            embed.addFields({
                name: '⚠️ Cleanup Needed',
                value: `${expiredJails.length} expired jails need cleanup. Use \`/jailadmin cleanup\` to clean them up.`,
                inline: false
            });
        }

        await interaction.reply({ embeds: [embed] });
    }
};
