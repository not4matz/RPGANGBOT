const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('channelupdater')
        .setDescription('🔒 Manage the automatic channel updater (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check the status of the channel updater'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('Start the channel updater'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('stop')
                .setDescription('Stop the channel updater'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Manually update all channels now')),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!isOwner(interaction.user.id)) {
            return await interaction.reply({
                content: '🔒 This command is restricted to the bot owner only.',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();
        const channelUpdater = interaction.client.channelUpdater;

        if (!channelUpdater) {
            return await interaction.reply({
                content: '❌ Channel updater is not initialized!',
                ephemeral: true
            });
        }

        try {
            switch (subcommand) {
                case 'status':
                    await this.handleStatus(interaction, channelUpdater);
                    break;
                case 'start':
                    await this.handleStart(interaction, channelUpdater);
                    break;
                case 'stop':
                    await this.handleStop(interaction, channelUpdater);
                    break;
                case 'update':
                    await this.handleUpdate(interaction, channelUpdater);
                    break;
                default:
                    await interaction.reply({
                        content: '❌ Unknown subcommand!',
                        ephemeral: true
                    });
            }
        } catch (error) {
            console.error('Error in channelupdater command:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the command!',
                ephemeral: true
            });
        }
    },

    async handleStatus(interaction, channelUpdater) {
        const status = channelUpdater.getStatus();
        
        const embed = new EmbedBuilder()
            .setTitle('📊 Channel Updater Status')
            .setColor(status.isRunning ? '#00ff00' : '#ff0000')
            .addFields(
                {
                    name: '🔄 Status',
                    value: status.isRunning ? '✅ Running' : '❌ Stopped',
                    inline: true
                },
                {
                    name: '⏰ Update Interval',
                    value: `${status.updateInterval / 60000} minutes`,
                    inline: true
                },
                {
                    name: '📋 Configured Channels',
                    value: Object.entries(status.channels)
                        .map(([key, config]) => `**${key}**: <#${config.id}>`)
                        .join('\n'),
                    inline: false
                }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleStart(interaction, channelUpdater) {
        if (channelUpdater.getStatus().isRunning) {
            return await interaction.reply({
                content: '⚠️ Channel updater is already running!',
                ephemeral: true
            });
        }

        channelUpdater.start();
        
        const embed = new EmbedBuilder()
            .setTitle('✅ Channel Updater Started')
            .setDescription('The channel updater has been started and will update channels every 5 minutes.')
            .setColor('#00ff00')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleStop(interaction, channelUpdater) {
        if (!channelUpdater.getStatus().isRunning) {
            return await interaction.reply({
                content: '⚠️ Channel updater is not running!',
                ephemeral: true
            });
        }

        channelUpdater.stop();
        
        const embed = new EmbedBuilder()
            .setTitle('🛑 Channel Updater Stopped')
            .setDescription('The channel updater has been stopped.')
            .setColor('#ff0000')
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleUpdate(interaction, channelUpdater) {
        await interaction.deferReply({ ephemeral: true });
        
        try {
            await channelUpdater.updateChannels();
            
            const embed = new EmbedBuilder()
                .setTitle('✅ Channels Updated')
                .setDescription('All configured channels have been updated manually.')
                .setColor('#00ff00')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error updating channels manually:', error);
            
            const embed = new EmbedBuilder()
                .setTitle('❌ Update Failed')
                .setDescription('An error occurred while updating the channels.')
                .setColor('#ff0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
