const { ChannelType, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');

class Join2CreateHandler {
    static async handleVoiceStateUpdate(oldState, newState) {
        try {
            const guild = newState.guild || oldState.guild;
            const config = await database.getJoin2CreateConfig(guild.id);
            
            if (!config || !config.enabled) {
                return; // Join2Create not enabled for this guild
            }

            // Handle user joining the trigger channel
            if (newState.channelId === config.triggerChannelId && newState.channelId !== oldState.channelId) {
                await this.createUserChannel(newState, config);
            }

            // Handle user leaving a Join2Create channel (check if channel should be deleted)
            if (oldState.channelId && oldState.channelId !== config.triggerChannelId) {
                await this.checkChannelDeletion(oldState, config);
            }

        } catch (error) {
            console.error('Error in Join2Create handler:', error);
        }
    }

    static async createUserChannel(voiceState, config) {
        try {
            const { member, guild } = voiceState;
            const category = guild.channels.cache.get(config.categoryId);
            
            if (!category) {
                console.error('Join2Create category not found');
                return;
            }

            // Check if user already has a channel
            const existingChannels = await database.getJoin2CreateChannelsByOwner(guild.id, member.id);
            if (existingChannels.length > 0) {
                // Move user to their existing channel
                const existingChannel = guild.channels.cache.get(existingChannels[0].channel_id);
                if (existingChannel) {
                    await member.voice.setChannel(existingChannel);
                    return;
                }
            }

            // Create new voice channel
            const channelName = `${member.displayName}'s Channel`;
            const userChannel = await guild.channels.create({
                name: channelName,
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel],
                        deny: []
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                            PermissionFlagsBits.Connect,
                            PermissionFlagsBits.Speak,
                            PermissionFlagsBits.ManageChannels,
                            PermissionFlagsBits.MoveMembers,
                            PermissionFlagsBits.MuteMembers,
                            PermissionFlagsBits.DeafenMembers
                        ]
                    }
                ]
            });

            // Move user to their new channel
            await member.voice.setChannel(userChannel);

            // Save channel to database
            await database.addJoin2CreateChannel(userChannel.id, guild.id, member.id);

            console.log(`Created Join2Create channel: ${channelName} for ${member.displayName}`);

        } catch (error) {
            console.error('Error creating Join2Create channel:', error);
        }
    }

    static async checkChannelDeletion(voiceState, config) {
        try {
            const { guild } = voiceState;
            const channelId = voiceState.channelId;
            
            // Check if this is a Join2Create channel
            const channelData = await database.getJoin2CreateChannel(channelId);
            if (!channelData) {
                return; // Not a Join2Create channel
            }

            const channel = guild.channels.cache.get(channelId);
            if (!channel) {
                // Channel doesn't exist, remove from database
                await database.removeJoin2CreateChannel(channelId);
                return;
            }

            // Check if channel is empty
            if (channel.members.size === 0) {
                // Delete empty channel
                await channel.delete('Join2Create: Channel empty');
                await database.removeJoin2CreateChannel(channelId);
                console.log(`Deleted empty Join2Create channel: ${channel.name}`);
            }

        } catch (error) {
            console.error('Error checking Join2Create channel deletion:', error);
        }
    }

    static async transferOwnership(channelId, newOwnerId) {
        try {
            const channelData = await database.getJoin2CreateChannel(channelId);
            if (!channelData) {
                return false;
            }

            // Update database
            await database.db.run(
                'UPDATE join2create_channels SET owner_id = ? WHERE channel_id = ?',
                [newOwnerId, channelId]
            );

            return true;
        } catch (error) {
            console.error('Error transferring Join2Create ownership:', error);
            return false;
        }
    }

    static async isChannelOwner(channelId, userId) {
        try {
            const channelData = await database.getJoin2CreateChannel(channelId);
            return channelData && channelData.owner_id === userId;
        } catch (error) {
            console.error('Error checking Join2Create ownership:', error);
            return false;
        }
    }
}

module.exports = Join2CreateHandler;
