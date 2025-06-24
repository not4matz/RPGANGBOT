const { Events, EmbedBuilder } = require('discord.js');

module.exports = {
    name: Events.GuildCreate,
    execute(guild) {
        console.log(`✅ Joined new guild: ${guild.name} (${guild.id})`);
        console.log(`   • Members: ${guild.memberCount}`);
        console.log(`   • Owner: ${guild.ownerId}`);
        
        // Try to send a welcome message to the system channel or first text channel
        const welcomeChannel = guild.systemChannel || 
                              guild.channels.cache.find(channel => 
                                  channel.type === 0 && // Text channel
                                  channel.permissionsFor(guild.members.me).has(['SendMessages', 'EmbedLinks'])
                              );
        
        if (welcomeChannel) {
            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('👋 Hello there!')
                .setDescription('Thanks for adding me to your server!')
                .addFields(
                    { 
                        name: '🚀 Getting Started', 
                        value: 'Use `/help` to see all available commands', 
                        inline: false 
                    },
                    { 
                        name: '⚙️ Setup', 
                        value: 'Make sure I have the necessary permissions to work properly', 
                        inline: false 
                    },
                    { 
                        name: '🆘 Support', 
                        value: 'If you need help, use `/help` or contact the bot developer', 
                        inline: false 
                    }
                )
                .setTimestamp()
                .setFooter({ 
                    text: 'Thanks for using our bot!', 
                    iconURL: guild.client.user.displayAvatarURL() 
                });
            
            welcomeChannel.send({ embeds: [embed] }).catch(error => {
                console.log(`❌ Could not send welcome message to ${guild.name}: ${error.message}`);
            });
        }
    },
};
