const { Events, EmbedBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Join2CreateHandler = require('./join2createHandler');
const database = require('../utils/database');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isModalSubmit()) return;

        // Check if this is a Join2Create modal
        if (!interaction.customId.startsWith('j2c_')) return;

        try {
            const member = interaction.member;
            const guild = interaction.guild;
            
            // Get user's current voice channel
            const voiceChannel = member.voice.channel;
            if (!voiceChannel) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Not in Voice Channel')
                    .setDescription('You need to be in a voice channel to use these controls.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Check if user owns this channel
            const isOwner = await Join2CreateHandler.isChannelOwner(voiceChannel.id, member.id);
            if (!isOwner) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Access Denied')
                    .setDescription('You can only control voice channels that you created.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Handle different modal submissions
            switch (interaction.customId) {
                case 'j2c_limit_modal':
                    await this.handleLimitModal(interaction, voiceChannel);
                    break;
                case 'j2c_rename_modal':
                    await this.handleRenameModal(interaction, voiceChannel);
                    break;
                case 'j2c_transfer_modal':
                    await this.handleTransferModal(interaction, voiceChannel);
                    break;
                case 'j2c_kick_modal':
                    await this.handleKickModal(interaction, voiceChannel);
                    break;
            }

        } catch (error) {
            console.error('Error handling Join2Create modal:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while processing your request.')
                .setColor('#FF0000')
                .setTimestamp();

            try {
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ 
                        embeds: [errorEmbed], 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    },

    async handleLimitModal(interaction, voiceChannel) {
        try {
            const limitInput = interaction.fields.getTextInputValue('user_limit');
            const limit = parseInt(limitInput);

            if (isNaN(limit) || limit < 0 || limit > 99) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Invalid Limit')
                    .setDescription('Please enter a number between 0-99. Use 0 for unlimited.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (limit === 1) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Invalid Limit')
                    .setDescription('User limit cannot be 1. Use 0 for unlimited or 2+ for a specific limit.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await voiceChannel.setUserLimit(limit);

            const embed = new EmbedBuilder()
                .setTitle('👥 User Limit Updated')
                .setDescription(`**${voiceChannel.name}** user limit set to ${limit === 0 ? 'unlimited' : limit}.`)
                .setColor('#8A2BE2')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error setting user limit:', error);
            throw error;
        }
    },

    async handleRenameModal(interaction, voiceChannel) {
        try {
            const newName = interaction.fields.getTextInputValue('channel_name').trim();

            if (newName.length < 1 || newName.length > 100) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Invalid Name')
                    .setDescription('Channel name must be between 1-100 characters.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const oldName = voiceChannel.name;
            await voiceChannel.setName(newName);

            const embed = new EmbedBuilder()
                .setTitle('🏷️ Channel Renamed')
                .setDescription(`Channel renamed from **${oldName}** to **${newName}**.`)
                .setColor('#8A2BE2')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error renaming channel:', error);
            throw error;
        }
    },

    async handleTransferModal(interaction, voiceChannel) {
        try {
            const userInput = interaction.fields.getTextInputValue('target_user').trim();
            let targetUser = null;

            // Try to parse user ID or mention
            const userIdMatch = userInput.match(/^(?:<@!?)?(\d+)>?$/);
            if (userIdMatch) {
                const userId = userIdMatch[1];
                targetUser = await interaction.guild.members.fetch(userId).catch(() => null);
            }

            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ User Not Found')
                    .setDescription('Could not find the specified user. Please use a valid user ID or @mention.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Check if target user is in the channel
            if (!voiceChannel.members.has(targetUser.id)) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ User Not in Channel')
                    .setDescription('The target user must be in the voice channel to receive ownership.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Transfer ownership
            const success = await Join2CreateHandler.transferOwnership(voiceChannel.id, targetUser.id);
            
            if (!success) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Transfer Failed')
                    .setDescription('Failed to transfer ownership. Please try again.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Update channel permissions
            await voiceChannel.permissionOverwrites.edit(interaction.user.id, {
                ManageChannels: null,
                MoveMembers: null,
                MuteMembers: null,
                DeafenMembers: null
            });

            await voiceChannel.permissionOverwrites.edit(targetUser.id, {
                ViewChannel: true,
                Connect: true,
                Speak: true,
                ManageChannels: true,
                MoveMembers: true,
                MuteMembers: true,
                DeafenMembers: true
            });

            const embed = new EmbedBuilder()
                .setTitle('👑 Ownership Transferred')
                .setDescription(`Channel ownership has been transferred to ${targetUser}.`)
                .setColor('#8A2BE2')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error transferring ownership:', error);
            throw error;
        }
    },

    async handleKickModal(interaction, voiceChannel) {
        try {
            const userInput = interaction.fields.getTextInputValue('target_user').trim();
            let targetUser = null;

            // Try to parse user ID or mention
            const userIdMatch = userInput.match(/^(?:<@!?)?(\d+)>?$/);
            if (userIdMatch) {
                const userId = userIdMatch[1];
                targetUser = await interaction.guild.members.fetch(userId).catch(() => null);
            }

            if (!targetUser) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ User Not Found')
                    .setDescription('Could not find the specified user. Please use a valid user ID or @mention.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Check if target user is in the channel
            if (!voiceChannel.members.has(targetUser.id)) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ User Not in Channel')
                    .setDescription('The specified user is not in your voice channel.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Cannot kick yourself
            if (targetUser.id === interaction.user.id) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Cannot Kick Yourself')
                    .setDescription('You cannot kick yourself from your own channel.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Kick the user
            await targetUser.voice.disconnect('Kicked by channel owner');

            const embed = new EmbedBuilder()
                .setTitle('🚫 User Kicked')
                .setDescription(`${targetUser} has been kicked from the voice channel.`)
                .setColor('#8A2BE2')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error kicking user:', error);
            throw error;
        }
    }
};
