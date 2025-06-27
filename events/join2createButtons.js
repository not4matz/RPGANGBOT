const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const Join2CreateHandler = require('./join2createHandler');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (!interaction.isButton()) return;

        // Check if this is a Join2Create button
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

            // Handle different button actions
            switch (interaction.customId) {
                case 'j2c_lock':
                    await this.handleLock(interaction, voiceChannel);
                    break;
                case 'j2c_unlock':
                    await this.handleUnlock(interaction, voiceChannel);
                    break;
                case 'j2c_limit':
                    await this.handleLimit(interaction, voiceChannel);
                    break;
                case 'j2c_rename':
                    await this.handleRename(interaction, voiceChannel);
                    break;
                case 'j2c_transfer':
                    await this.handleTransfer(interaction, voiceChannel);
                    break;
                case 'j2c_kick':
                    await this.handleKick(interaction, voiceChannel);
                    break;
                case 'j2c_delete':
                    await this.handleDelete(interaction, voiceChannel);
                    break;
            }

        } catch (error) {
            console.error('Error handling Join2Create button:', error);
            
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

    async handleLock(interaction, voiceChannel) {
        try {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                Connect: false
            });

            const embed = new EmbedBuilder()
                .setTitle('🔒 Channel Locked')
                .setDescription(`**${voiceChannel.name}** has been locked. Only users already in the channel can join.`)
                .setColor('#8A2BE2')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error locking channel:', error);
            throw error;
        }
    },

    async handleUnlock(interaction, voiceChannel) {
        try {
            await voiceChannel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                Connect: null
            });

            const embed = new EmbedBuilder()
                .setTitle('🔓 Channel Unlocked')
                .setDescription(`**${voiceChannel.name}** has been unlocked. Anyone can join now.`)
                .setColor('#8A2BE2')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error unlocking channel:', error);
            throw error;
        }
    },

    async handleLimit(interaction, voiceChannel) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('j2c_limit_modal')
                .setTitle('Set User Limit');

            const limitInput = new TextInputBuilder()
                .setCustomId('user_limit')
                .setLabel('User Limit (2-99, 0 for unlimited)')
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(2)
                .setPlaceholder('Enter number between 2-99 or 0')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(limitInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing limit modal:', error);
            throw error;
        }
    },

    async handleRename(interaction, voiceChannel) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('j2c_rename_modal')
                .setTitle('Rename Channel');

            const nameInput = new TextInputBuilder()
                .setCustomId('channel_name')
                .setLabel('New Channel Name')
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder('Enter new channel name')
                .setValue(voiceChannel.name)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(nameInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing rename modal:', error);
            throw error;
        }
    },

    async handleTransfer(interaction, voiceChannel) {
        try {
            const members = voiceChannel.members.filter(m => !m.user.bot && m.id !== interaction.user.id);
            
            if (members.size === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No Users Available')
                    .setDescription('There are no other users in the channel to transfer ownership to.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('j2c_transfer_modal')
                .setTitle('Transfer Ownership');

            const userInput = new TextInputBuilder()
                .setCustomId('target_user')
                .setLabel('User ID or @mention')
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder('Enter user ID or @mention')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(userInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing transfer modal:', error);
            throw error;
        }
    },

    async handleKick(interaction, voiceChannel) {
        try {
            const members = voiceChannel.members.filter(m => !m.user.bot && m.id !== interaction.user.id);
            
            if (members.size === 0) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ No Users to Kick')
                    .setDescription('There are no other users in the channel to kick.')
                    .setColor('#FF6B6B')
                    .setTimestamp();

                return await interaction.reply({ 
                    embeds: [embed], 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const modal = new ModalBuilder()
                .setCustomId('j2c_kick_modal')
                .setTitle('Kick User');

            const userInput = new TextInputBuilder()
                .setCustomId('target_user')
                .setLabel('User ID or @mention')
                .setStyle(TextInputStyle.Short)
                .setMinLength(1)
                .setMaxLength(100)
                .setPlaceholder('Enter user ID or @mention')
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(userInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error showing kick modal:', error);
            throw error;
        }
    },

    async handleDelete(interaction, voiceChannel) {
        try {
            const database = require('../utils/database');
            
            await voiceChannel.delete('Join2Create: Channel deleted by owner');
            await database.removeJoin2CreateChannel(voiceChannel.id);

            const embed = new EmbedBuilder()
                .setTitle('❌ Channel Deleted')
                .setDescription(`Your voice channel has been deleted successfully.`)
                .setColor('#8A2BE2')
                .setTimestamp();

            await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });

        } catch (error) {
            console.error('Error deleting channel:', error);
            throw error;
        }
    }
};
