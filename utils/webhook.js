/**
 * Discord Webhook System for Code Update Notifications
 * Sends purple-themed notifications about code changes
 */

const { EmbedBuilder, WebhookClient } = require('discord.js');
const colors = require('./colors');
const fs = require('fs');
const path = require('path');

class UpdateWebhook {
    constructor() {
        this.webhookUrl = process.env.UPDATE_WEBHOOK_URL;
        this.webhook = null;
        
        if (this.webhookUrl) {
            try {
                this.webhook = new WebhookClient({ url: this.webhookUrl });
                console.log('✅ Update webhook initialized successfully');
            } catch (error) {
                console.error('❌ Failed to initialize webhook:', error.message);
            }
        } else {
            console.log('⚠️ UPDATE_WEBHOOK_URL not set - webhook notifications disabled');
        }
    }

    /**
     * Send a code update notification
     * @param {Object} updateData - Information about the update
     */
    async sendUpdateNotification(updateData) {
        if (!this.webhook) {
            console.log('Webhook not configured - skipping notification');
            return;
        }

        try {
            const embed = this.createUpdateEmbed(updateData);
            await this.webhook.send({ embeds: [embed] });
            console.log('📡 Update notification sent successfully');
        } catch (error) {
            console.error('❌ Failed to send webhook notification:', error.message);
        }
    }

    /**
     * Create a purple-themed embed for update notifications
     * @param {Object} data - Update data
     * @returns {EmbedBuilder} - Formatted embed
     */
    createUpdateEmbed(data) {
        const {
            title = 'Code Update',
            description = 'Bot code has been updated',
            filesChanged = 0,
            linesAdded = 0,
            linesDeleted = 0,
            changedFiles = [],
            author = 'Developer',
            timestamp = new Date()
        } = data;

        // Calculate net change
        const netChange = linesAdded - linesDeleted;
        const netChangeText = netChange > 0 ? `+${netChange}` : `${netChange}`;
        const netChangeColor = netChange > 0 ? '🟢' : netChange < 0 ? '🔴' : '⚫';

        const embed = new EmbedBuilder()
            .setColor(colors.PRIMARY)
            .setTitle('💜 Bot Update Deployed')
            .setDescription(`**${title}**\n${description}`)
            .addFields(
                {
                    name: '📊 **Change Statistics**',
                    value: `**Files Modified:** ${filesChanged}\n**Lines Added:** +${linesAdded}\n**Lines Deleted:** -${linesDeleted}\n**Net Change:** ${netChangeColor} ${netChangeText}`,
                    inline: true
                },
                {
                    name: '⚡ **Update Info**',
                    value: `**Author:** ${author}\n**Time:** <t:${Math.floor(timestamp.getTime() / 1000)}:R>\n**Status:** Deployed ✅`,
                    inline: true
                }
            )
            .setFooter({ 
                text: 'Purple Bot Development System', 
                iconURL: 'https://cdn.discordapp.com/emojis/1234567890123456789.png' // You can add a custom emoji URL here
            })
            .setTimestamp(timestamp);

        return embed;
    }

    /**
     * Analyze git changes and send notification
     * @param {string} commitMessage - Git commit message
     * @param {string} author - Author of the changes
     */
    async sendGitUpdateNotification(commitMessage = 'Code update', author = 'Developer') {
        try {
            // This would typically integrate with git to get actual stats
            // For now, we'll create a sample notification
            const updateData = {
                title: 'Git Commit',
                description: commitMessage,
                filesChanged: Math.floor(Math.random() * 10) + 1,
                linesAdded: Math.floor(Math.random() * 100) + 1,
                linesDeleted: Math.floor(Math.random() * 50),
                changedFiles: [
                    'commands/wakeup.js',
                    'commands/help.js',
                    'utils/colors.js',
                    'commands/ping.js'
                ],
                author: author,
                timestamp: new Date()
            };

            await this.sendUpdateNotification(updateData);
        } catch (error) {
            console.error('Error sending git update notification:', error);
        }
    }

    /**
     * Send a manual update notification
     * @param {Object} customData - Custom update data
     */
    async sendManualUpdate(customData) {
        const defaultData = {
            title: 'Manual Update',
            description: 'Bot has been manually updated',
            filesChanged: 1,
            linesAdded: 0,
            linesDeleted: 0,
            changedFiles: [],
            author: 'Administrator',
            timestamp: new Date()
        };

        const updateData = { ...defaultData, ...customData };
        await this.sendUpdateNotification(updateData);
    }

    /**
     * Send bot startup notification
     */
    async sendStartupNotification() {
        const embed = new EmbedBuilder()
            .setColor(colors.SUCCESS)
            .setTitle('🚀 Goated Bot Started')
            .setDescription('**Goated Bot is now online and ready!**')
            .addFields(
                {
                    name: '⚡ **Status**',
                    value: '🟢 Online\n🔄 All systems operational\n💜 Purple theme active',
                    inline: true
                },
                {
                    name: '📊 **System Info**',
                    value: `**Node.js:** ${process.version}\n**Memory:** ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB\n**Uptime:** Just started`,
                    inline: true
                }
            )
            .setFooter({ text: 'Goated Bot System Monitor' })
            .setTimestamp();

        try {
            if (this.webhook) {
                await this.webhook.send({ embeds: [embed] });
                console.log('📡 Startup notification sent');
            }
        } catch (error) {
            console.error('❌ Failed to send startup notification:', error.message);
        }
    }

    /**
     * Send bot shutdown notification
     */
    async sendShutdownNotification() {
        const embed = new EmbedBuilder()
            .setColor(colors.WARNING)
            .setTitle('⏹️ Bot Shutting Down')
            .setDescription('**Purple Bot is going offline...**')
            .addFields({
                name: '📊 **Session Stats**',
                value: `**Uptime:** ${Math.floor(process.uptime() / 60)} minutes\n**Status:** Graceful shutdown\n**Reason:** Manual restart/update`,
                inline: false
            })
            .setFooter({ text: 'Purple Bot System Monitor' })
            .setTimestamp();

        try {
            if (this.webhook) {
                await this.webhook.send({ embeds: [embed] });
                console.log('📡 Shutdown notification sent');
            }
        } catch (error) {
            console.error('❌ Failed to send shutdown notification:', error.message);
        }
    }
}

// Export singleton instance
module.exports = new UpdateWebhook();
