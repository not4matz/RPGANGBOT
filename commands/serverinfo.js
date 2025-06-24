const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('Display information about the current server'),
    
    async execute(interaction) {
        const guild = interaction.guild;
        
        if (!guild) {
            return await interaction.reply({ 
                content: '❌ This command can only be used in a server!', 
                ephemeral: true 
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#7289da')
            .setTitle(`📊 ${guild.name} Server Information`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
            .addFields(
                { 
                    name: '🆔 Server ID', 
                    value: guild.id, 
                    inline: true 
                },
                { 
                    name: '👑 Owner', 
                    value: `<@${guild.ownerId}>`, 
                    inline: true 
                },
                { 
                    name: '📅 Created', 
                    value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, 
                    inline: true 
                },
                { 
                    name: '👥 Members', 
                    value: guild.memberCount.toString(), 
                    inline: true 
                },
                { 
                    name: '📝 Channels', 
                    value: guild.channels.cache.size.toString(), 
                    inline: true 
                },
                { 
                    name: '😀 Emojis', 
                    value: guild.emojis.cache.size.toString(), 
                    inline: true 
                },
                { 
                    name: '🔒 Verification Level', 
                    value: guild.verificationLevel.toString(), 
                    inline: true 
                },
                { 
                    name: '🚀 Boost Level', 
                    value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, 
                    inline: true 
                },
                { 
                    name: '🌟 Features', 
                    value: guild.features.length > 0 ? guild.features.join(', ') : 'None', 
                    inline: false 
                }
            )
            .setTimestamp()
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });

        await interaction.reply({ embeds: [embed] });
    },
};
