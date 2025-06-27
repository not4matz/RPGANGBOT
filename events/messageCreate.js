const { Events, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { generateMessageXP, canGainMessageXP, getLevelFromXP, getLevelColor, getLevelBadge } = require('../utils/leveling');

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bots and system messages
        if (message.author.bot || message.system) return;
        
        // Ignore DMs
        if (!message.guild) return;

        // Ignore commands (messages starting with /)
        if (message.content.startsWith('/')) return;

        try {
            const userId = message.author.id;
            const guildId = message.guild.id;

            // Get current user data
            const userData = await database.getUser(userId, guildId);
            
            // Check cooldown
            if (userData && !canGainMessageXP(userData.last_message_time)) {
                return; // User is on cooldown
            }

            // Generate XP (now fixed 5 XP)
            const xpGain = generateMessageXP();
            
            // Update user in database
            await database.upsertUser(userId, guildId, xpGain);
            
            // Get updated user data to check for level up
            const updatedUser = await database.getUser(userId, guildId);
            if (!updatedUser) return;

            // Calculate new level
            const newLevel = getLevelFromXP(updatedUser.xp, userId);
            const oldLevel = updatedUser.level;

            // Check if user leveled up
            if (newLevel > oldLevel) {
                // Update level in database
                await database.updateUserLevel(userId, guildId, newLevel);
                
                // Send level up message
                const levelUpEmbed = new EmbedBuilder()
                    .setTitle('🎉 Level Up!')
                    .setDescription(`${message.author} has reached **Level ${newLevel}**! ${getLevelBadge(newLevel)}`)
                    .setColor(getLevelColor(newLevel))
                    .addFields(
                        { 
                            name: '💜 Stats', 
                            value: `**Level:** ${newLevel}\n**Total XP:** ${updatedUser.xp.toLocaleString()}\n**Messages:** ${updatedUser.total_messages}`, 
                            inline: true 
                        }
                    )
                    .setThumbnail(message.author.displayAvatarURL())
                    .setFooter({
                        text: 'Purple Bot • Message Leveling',
                        iconURL: message.guild.iconURL()
                    })
                    .setTimestamp();

                // Send level up message to specific channel
                const levelUpChannelId = '1361198962488381490';
                let targetChannel = message.guild.channels.cache.get(levelUpChannelId);
                
                // Fallback to current channel if specific channel not found
                if (!targetChannel) {
                    targetChannel = message.channel;
                    console.warn(`Level-up channel ${levelUpChannelId} not found, using current channel`);
                }
                
                try {
                    await targetChannel.send({ embeds: [levelUpEmbed] });
                } catch (error) {
                    console.error('Error sending level up message:', error);
                    // Try fallback to current channel if target channel failed
                    if (targetChannel !== message.channel) {
                        try {
                            await message.channel.send({ embeds: [levelUpEmbed] });
                        } catch (fallbackError) {
                            console.error('Error sending fallback level up message:', fallbackError);
                        }
                    }
                }

                console.log(`🎉 ${message.author.tag} leveled up to ${newLevel} in ${message.guild.name}`);
            }

        } catch (error) {
            console.error('Error processing XP gain:', error);
        }
    },
};
