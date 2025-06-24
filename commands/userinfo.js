const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('userinfo')
        .setDescription('Display information about a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to get information about')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options.getUser('user') || interaction.user;
        const member = interaction.guild?.members.cache.get(targetUser.id);

        const embed = new EmbedBuilder()
            .setColor('#ff6b6b')
            .setTitle(`👤 ${targetUser.tag}`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
                { 
                    name: '🆔 User ID', 
                    value: targetUser.id, 
                    inline: true 
                },
                { 
                    name: '📅 Account Created', 
                    value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:F>`, 
                    inline: true 
                },
                { 
                    name: '🤖 Bot', 
                    value: targetUser.bot ? 'Yes' : 'No', 
                    inline: true 
                }
            );

        // Add server-specific information if in a guild
        if (member) {
            embed.addFields(
                { 
                    name: '📅 Joined Server', 
                    value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>` : 'Unknown', 
                    inline: true 
                },
                { 
                    name: '🎭 Nickname', 
                    value: member.nickname || 'None', 
                    inline: true 
                },
                { 
                    name: '🎨 Roles', 
                    value: member.roles.cache.size > 1 ? 
                        member.roles.cache
                            .filter(role => role.id !== interaction.guild.id)
                            .map(role => role.toString())
                            .slice(0, 10)
                            .join(', ') + (member.roles.cache.size > 11 ? '...' : '') 
                        : 'None', 
                    inline: false 
                }
            );

            // Set color to user's highest role color
            const highestRole = member.roles.highest;
            if (highestRole.color !== 0) {
                embed.setColor(highestRole.color);
            }
        }

        embed.setTimestamp()
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });

        await interaction.reply({ embeds: [embed] });
    },
};
