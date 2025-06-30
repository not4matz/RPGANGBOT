const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const { isOwner } = require('../utils/ownerCheck');

// Fallback colors in case utils/colors.js fails to load
let COLORS;
try {
    COLORS = require('../utils/colors');
} catch (error) {
    console.log('⚠️ Failed to load colors.js, using fallback colors');
    COLORS = {
        PRIMARY: '#6A0DAD',
        SUCCESS: '#8A2BE2',
        WARNING: '#9370DB',
        ERROR: '#4B0082'
    };
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('jail')
        .setDescription('🔒 Jail a user so they can only see announcements (Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to jail')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('reason')
                .setDescription('Reason for jailing the user')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('time')
                .setDescription('Jail time in minutes (default: 60)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(10080)), // Max 1 week

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
        const reason = interaction.options.getString('reason') || 'No reason provided';
        const jailTime = interaction.options.getInteger('time') || 60; // Default 1 hour
        const guild = interaction.guild;

        try {
            // Get the target member
            const member = await guild.members.fetch(targetUser.id).catch(() => null);
            if (!member) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ User Not Found')
                        .setDescription('The specified user is not in this server.')
                        .setFooter({ text: 'Purple Bot Jail System' })
                        .setTimestamp()],
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check bot permissions
            const botMember = guild.members.me;
            if (!botMember.permissions.has([PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageChannels])) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Missing Permissions')
                        .setDescription('I need **Manage Roles** and **Manage Channels** permissions to jail users.')
                        .setFooter({ text: 'Purple Bot Jail System' })
                        .setTimestamp()],
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check role hierarchy - bot must be higher than target user
            if (member.roles.highest.position >= botMember.roles.highest.position) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(COLORS.ERROR)
                        .setTitle('❌ Role Hierarchy Error')
                        .setDescription(`I cannot jail ${targetUser.tag} because their highest role is equal to or higher than mine.\n\nPlease move my role above theirs in the server settings.`)
                        .setFooter({ text: 'Purple Bot Jail System' })
                        .setTimestamp()],
                    flags: MessageFlags.Ephemeral
                });
            }

            // Check if user is already jailed
            const existingJail = await database.getJailData(targetUser.id, guild.id);
            if (existingJail) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(COLORS.WARNING)
                    .setTitle('⚠️ Already Jailed')
                    .setDescription(`${targetUser.tag} is already jailed.`)
                    .addFields(
                        { name: '📝 Current Reason', value: existingJail.reason || 'No reason provided', inline: true },
                        { name: '⏰ Time Remaining', value: `<t:${Math.floor(existingJail.jail_end_time / 1000)}:R>`, inline: true }
                    )
                    .setFooter({ text: 'Purple Bot' })
                    .setTimestamp();

                return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            // Prevent jailing bots or the owner
            if (targetUser.bot) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('❌ Cannot Jail Bot')
                    .setDescription('You cannot jail bot users.')
                    .setFooter({ text: 'Purple Bot' })
                    .setTimestamp();

                return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            if (isOwner(targetUser.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('❌ Cannot Jail Owner')
                    .setDescription('You cannot jail the bot owner.')
                    .setFooter({ text: 'Purple Bot' })
                    .setTimestamp();

                return interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }

            // Create or get the "Jailed" role
            let jailedRole = guild.roles.cache.find(role => role.name === 'Jailed');
            if (!jailedRole) {
                jailedRole = await guild.roles.create({
                    name: 'Jailed',
                    color: '#2C2C2C', // Dark gray
                    reason: 'Jail system role creation',
                    permissions: []
                });

                // Set up channel permissions for the jailed role
                const channels = await guild.channels.fetch();
                const announcementChannelNames = ['announcements', 'announcement', 'news', 'updates'];
                
                for (const [channelId, channel] of channels) {
                    if (!channel) continue;
                    
                    try {
                        const isAnnouncementChannel = announcementChannelNames.some(name => 
                            channel.name.toLowerCase().includes(name)
                        );

                        if (isAnnouncementChannel) {
                            // Allow viewing announcements
                            await channel.permissionOverwrites.create(jailedRole, {
                                ViewChannel: true,
                                SendMessages: false,
                                AddReactions: false,
                                UseApplicationCommands: false,
                                Connect: false,
                                Speak: false
                            });
                        } else {
                            // Deny access to all other channels
                            await channel.permissionOverwrites.create(jailedRole, {
                                ViewChannel: false,
                                SendMessages: false,
                                AddReactions: false,
                                UseApplicationCommands: false,
                                Connect: false,
                                Speak: false
                            });
                        }
                    } catch (error) {
                        console.error(`❌ Error setting permissions for channel ${channel.name}:`, error);
                    }
                }
            }

            // Store original roles
            const originalRoles = member.roles.cache
                .filter(role => role.id !== guild.id) // Exclude @everyone
                .map(role => role.id)
                .join(',');

            // Remove all roles except @everyone and add jailed role
            await member.roles.set([jailedRole.id]);

            // Add to database
            await database.jailUser(
                targetUser.id,
                guild.id,
                reason,
                jailTime,
                interaction.user.id,
                originalRoles
            );

            // Send DM to the jailed user
            try {
                const dmEmbed = new EmbedBuilder()
                    .setColor(COLORS.ERROR)
                    .setTitle('🔒 You Have Been Jailed')
                    .setDescription(`You have been jailed in **${guild.name}**.`)
                    .addFields(
                        { name: '📝 Reason', value: reason, inline: false },
                        { name: '⏰ Duration', value: `${jailTime} minutes`, inline: true },
                        { name: '🕐 Release Time', value: `<t:${Math.floor((Date.now() + jailTime * 60 * 1000) / 1000)}:F>`, inline: true },
                        { name: '📢 Access', value: 'You can only view announcement channels during your jail time.', inline: false }
                    )
                    .setFooter({ text: 'Purple Bot Jail System' })
                    .setTimestamp();

                await targetUser.send({ embeds: [dmEmbed] });
            } catch (error) {
                console.log(`❌ Could not send DM to ${targetUser.tag}:`, error.message);
            }

            // Success response
            const successEmbed = new EmbedBuilder()
                .setColor(COLORS.SUCCESS)
                .setTitle('🔒 User Jailed Successfully')
                .setDescription(`${targetUser.tag} has been jailed.`)
                .addFields(
                    { name: '👤 User', value: `${targetUser} (${targetUser.tag})`, inline: true },
                    { name: '📝 Reason', value: reason, inline: true },
                    { name: '⏰ Duration', value: `${jailTime} minutes`, inline: true },
                    { name: '🕐 Release Time', value: `<t:${Math.floor((Date.now() + jailTime * 60 * 1000) / 1000)}:F>`, inline: false },
                    { name: '🔧 Jailed By', value: `${interaction.user.tag}`, inline: true },
                    { name: '📊 Original Roles', value: originalRoles ? `${originalRoles.split(',').length} roles saved` : 'No roles to save', inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: 'Purple Bot Jail System' })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });

            // Log the jail action
            console.log(`🔒 ${interaction.user.tag} jailed ${targetUser.tag} for ${jailTime} minutes. Reason: ${reason}`);

        } catch (error) {
            console.error('❌ Error in jail command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(COLORS.ERROR)
                .setTitle('❌ Jail Failed')
                .setDescription('An error occurred while trying to jail the user.')
                .addFields({ name: '🐛 Error', value: error.message, inline: false })
                .setFooter({ text: 'Purple Bot' })
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            } else {
                await interaction.reply({ embeds: [errorEmbed], flags: MessageFlags.Ephemeral });
            }
        }
    },
};
