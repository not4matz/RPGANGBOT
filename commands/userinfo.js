const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('💜 Display detailed information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get information about')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = await interaction.guild.members.fetch(targetUser.id);
        
        // Calculate account age
        const accountCreated = Math.floor(targetUser.createdTimestamp / 1000);
        const joinedServer = Math.floor(member.joinedTimestamp / 1000);
        
        // Get user status
        const status = member.presence?.status || 'offline';
        const statusEmoji = {
            online: '🟢',
            idle: '🟡',
            dnd: '🔴',
            offline: '⚫'
        };
        
        // Get roles (excluding @everyone)
        const roles = member.roles.cache
            .filter(role => role.name !== '@everyone')
            .sort((a, b) => b.position - a.position)
            .map(role => role.toString())
            .slice(0, 10); // Limit to 10 roles to avoid embed limits
        
        const embed = new EmbedBuilder()
            .setColor(colors.PRIMARY)
            .setTitle(`💜 User Information`)
            .setDescription(`**${targetUser.username}**'s profile details`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '👤 **Basic Info**',
                    value: `**Username:** ${targetUser.username}\n**Display Name:** ${member.displayName}\n**ID:** \`${targetUser.id}\`\n**Bot:** ${targetUser.bot ? 'Yes' : 'No'}`,
                    inline: true
                },
                {
                    name: '📅 **Dates**',
                    value: `**Account Created:** <t:${accountCreated}:F>\n**Joined Server:** <t:${joinedServer}:F>\n**Days in Server:** ${Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24))}`,
                    inline: true
                },
                {
                    name: '⚡ **Status**',
                    value: `${statusEmoji[status]} ${status.charAt(0).toUpperCase() + status.slice(1)}\n**Nickname:** ${member.nickname || 'None'}\n**Highest Role:** ${member.roles.highest.toString()}`,
                    inline: true
                }
            )
            .setFooter({ 
                text: `Requested by ${interaction.user.username} • Purple Bot`, 
                iconURL: interaction.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        // Add roles field if user has roles
        if (roles.length > 0) {
            embed.addFields({
                name: `🎭 **Roles [${member.roles.cache.size - 1}]**`,
                value: roles.join(' ') + (member.roles.cache.size > 11 ? ` and ${member.roles.cache.size - 11} more...` : ''),
                inline: false
            });
        }
        
        // Add permissions field for admins
        if (member.permissions.has('Administrator')) {
            embed.addFields({
                name: '⚙️ **Permissions**',
                value: '🔧 Administrator',
                inline: true
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};
