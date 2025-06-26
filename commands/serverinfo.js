const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('serverinfo')
        .setDescription('💜 Display detailed information about the server'),
    
    async execute(interaction) {
        const guild = interaction.guild;
        
        if (!guild) {
            return await interaction.reply({ 
                content: '❌ This command can only be used in a server!', 
                ephemeral: true 
            });
        }

        // Calculate server age
        const serverCreated = Math.floor(guild.createdTimestamp / 1000);
        const serverAge = Math.floor((Date.now() - guild.createdTimestamp) / (1000 * 60 * 60 * 24));
        
        // Get member counts
        const totalMembers = guild.memberCount;
        const onlineMembers = guild.members.cache.filter(member => member.presence?.status !== 'offline').size;
        
        // Get channel counts
        const textChannels = guild.channels.cache.filter(channel => channel.type === 0).size;
        const voiceChannels = guild.channels.cache.filter(channel => channel.type === 2).size;
        const categories = guild.channels.cache.filter(channel => channel.type === 4).size;
        
        // Get role count
        const roleCount = guild.roles.cache.size - 1; // Exclude @everyone
        
        // Get boost info
        const boostLevel = guild.premiumTier;
        const boostCount = guild.premiumSubscriptionCount || 0;
        
        // Get verification level
        const verificationLevels = {
            0: 'None',
            1: 'Low',
            2: 'Medium',
            3: 'High',
            4: 'Very High'
        };
        
        const embed = new EmbedBuilder()
            .setColor(colors.PRIMARY)
            .setTitle(`💜 ${guild.name}`)
            .setDescription(`**Server Information & Statistics**`)
            .setThumbnail(guild.iconURL({ dynamic: true, size: 256 }))
            .addFields(
                {
                    name: '📊 **Server Stats**',
                    value: `**Members:** ${totalMembers.toLocaleString()}\n**Online:** ${onlineMembers.toLocaleString()}\n**Created:** <t:${serverCreated}:F>\n**Age:** ${serverAge} days`,
                    inline: true
                },
                {
                    name: '📝 **Channels**',
                    value: `**Text:** ${textChannels}\n**Voice:** ${voiceChannels}\n**Categories:** ${categories}\n**Total:** ${guild.channels.cache.size}`,
                    inline: true
                },
                {
                    name: '⚡ **Features**',
                    value: `**Roles:** ${roleCount}\n**Emojis:** ${guild.emojis.cache.size}\n**Boost Level:** ${boostLevel}\n**Boosts:** ${boostCount}`,
                    inline: true
                },
                {
                    name: '🔒 **Security & Management**',
                    value: `**Verification:** ${verificationLevels[guild.verificationLevel]}\n**Owner:** <@${guild.ownerId}>\n**Server ID:** \`${guild.id}\``,
                    inline: false
                }
            )
            .setFooter({ 
                text: `Purple Bot Server Analytics • ${new Date().toLocaleDateString()}`, 
                iconURL: interaction.client.user.displayAvatarURL() 
            })
            .setTimestamp();
        
        // Add server banner if available
        if (guild.bannerURL()) {
            embed.setImage(guild.bannerURL({ dynamic: true, size: 1024 }));
        }
        
        // Add special features if any
        if (guild.features.length > 0) {
            const specialFeatures = guild.features
                .map(feature => feature.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase()))
                .join(', ');
            
            embed.addFields({
                name: '🌟 **Special Features**',
                value: specialFeatures,
                inline: false
            });
        }
        
        await interaction.reply({ embeds: [embed] });
    },
};
