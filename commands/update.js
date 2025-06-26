const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');
const colors = require('../utils/colors');
const webhook = require('../utils/webhook');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('update')
        .setDescription('💜 [OWNER] Send update notifications and manage bot updates')
        .addSubcommand(subcommand =>
            subcommand
                .setName('notify')
                .setDescription('Send a manual update notification')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Update title')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Update description')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('files')
                        .setDescription('Number of files changed')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('added')
                        .setDescription('Lines added')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('deleted')
                        .setDescription('Lines deleted')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check webhook status and send test notification'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('startup')
                .setDescription('Send bot startup notification'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shutdown')
                .setDescription('Send bot shutdown notification')),
    
    async execute(interaction) {
        // Check if user is the bot owner
        if (!await checkOwner(interaction)) {
            return;
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'notify':
                    await this.handleNotify(interaction);
                    break;
                case 'status':
                    await this.handleStatus(interaction);
                    break;
                case 'startup':
                    await this.handleStartup(interaction);
                    break;
                case 'shutdown':
                    await this.handleShutdown(interaction);
                    break;
                default:
                    await interaction.reply({ 
                        content: '❌ Unknown subcommand', 
                        ephemeral: true 
                    });
            }
        } catch (error) {
            console.error('Error in update command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('❌ Update Command Error')
                .setDescription('An error occurred while processing the update command.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },

    async handleNotify(interaction) {
        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const filesChanged = interaction.options.getInteger('files') || 1;
        const linesAdded = interaction.options.getInteger('added') || 0;
        const linesDeleted = interaction.options.getInteger('deleted') || 0;

        const updateData = {
            title: title,
            description: description,
            filesChanged: filesChanged,
            linesAdded: linesAdded,
            linesDeleted: linesDeleted,
            changedFiles: ['Manual update - files not specified'],
            author: interaction.user.username,
            timestamp: new Date()
        };

        await webhook.sendUpdateNotification(updateData);

        const confirmEmbed = new EmbedBuilder()
            .setColor(colors.SUCCESS)
            .setTitle('✅ Update Notification Sent')
            .setDescription('Manual update notification has been sent to the webhook channel.')
            .addFields(
                { name: '📝 Title', value: title, inline: true },
                { name: '📊 Files', value: filesChanged.toString(), inline: true },
                { name: '📈 Lines', value: `+${linesAdded} / -${linesDeleted}`, inline: true }
            )
            .setFooter({ text: 'Purple Bot Update System' })
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    },

    async handleStatus(interaction) {
        const webhookConfigured = !!process.env.UPDATE_WEBHOOK_URL;
        
        const statusEmbed = new EmbedBuilder()
            .setColor(webhookConfigured ? colors.SUCCESS : colors.WARNING)
            .setTitle('📡 Webhook Status')
            .setDescription('Current webhook configuration and status')
            .addFields(
                {
                    name: '⚙️ Configuration',
                    value: `**Webhook URL:** ${webhookConfigured ? '✅ Configured' : '❌ Not Set'}\n**Status:** ${webhookConfigured ? '🟢 Active' : '🔴 Inactive'}\n**Environment:** ${process.env.NODE_ENV || 'development'}`,
                    inline: true
                },
                {
                    name: '📊 System Info',
                    value: `**Bot Uptime:** ${Math.floor(process.uptime() / 60)} minutes\n**Memory Usage:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n**Node.js:** ${process.version}`,
                    inline: true
                }
            )
            .setFooter({ text: 'Purple Bot System Monitor' })
            .setTimestamp();

        if (!webhookConfigured) {
            statusEmbed.addFields({
                name: '💡 Setup Instructions',
                value: 'Add `UPDATE_WEBHOOK_URL=your_webhook_url` to your .env file to enable notifications.',
                inline: false
            });
        }

        await interaction.reply({ embeds: [statusEmbed], ephemeral: true });

        // Send test notification if webhook is configured
        if (webhookConfigured) {
            await webhook.sendManualUpdate({
                title: 'Test Notification',
                description: 'This is a test notification from the update command.',
                author: interaction.user.username
            });
        }
    },

    async handleStartup(interaction) {
        await webhook.sendStartupNotification();
        
        const confirmEmbed = new EmbedBuilder()
            .setColor(colors.SUCCESS)
            .setTitle('🚀 Startup Notification Sent')
            .setDescription('Bot startup notification has been sent to the webhook channel.')
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    },

    async handleShutdown(interaction) {
        await webhook.sendShutdownNotification();
        
        const confirmEmbed = new EmbedBuilder()
            .setColor(colors.WARNING)
            .setTitle('⏹️ Shutdown Notification Sent')
            .setDescription('Bot shutdown notification has been sent to the webhook channel.')
            .setTimestamp();

        await interaction.reply({ embeds: [confirmEmbed], ephemeral: true });
    }
};
