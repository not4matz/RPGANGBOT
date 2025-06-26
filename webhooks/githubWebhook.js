const { Webhooks, createNodeMiddleware } = require('@octokit/webhooks');
const { Client, GatewayIntentBits } = require('discord.js');
const colors = require('../utils/colors');

class GitHubWebhookHandler {
    constructor() {
        this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
        this.webhookPath = '/api/github/webhook';
        this.port = process.env.PORT || 3000;
        this.webhooks = new Webhooks({
            secret: this.webhookSecret,
        });
        
        // Initialize Discord client
        this.discordClient = new Client({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMessages,
            ],
        });
    }

    /**
     * Initialize the webhook handlers
     */
    initialize() {
        if (!this.webhookSecret) {
            console.warn('⚠️ GITHUB_WEBHOOK_SECRET not set - GitHub webhooks disabled');
            return null;
        }

        // Handle push events
        this.webhooks.on('push', async ({ id, name, payload }) => {
            console.log(`Received push event: ${payload.repository.full_name}`);
            await this.handlePushEvent(payload);
        });

        // Return the middleware for Express/HTTP server
        return createNodeMiddleware(this.webhooks, { path: this.webhookPath });
    }

    /**
     * Handle GitHub push events
     */
    async handlePushEvent(payload) {
        const { ref, repository, sender, commits, compare } = payload;
        const branch = ref.split('/').pop();
        const repoName = repository.full_name;
        const repoUrl = repository.html_url;
        const pusherName = sender.login;
        const pusherAvatar = sender.avatar_url;
        const commitCount = commits.length;

        // Skip if no commits
        if (commitCount === 0) return;

        const embed = new EmbedBuilder()
            .setColor(colors.PRIMARY)
            .setTitle(`📥 New Push to ${repoName}`)
            .setURL(compare)
            .setDescription(`\`${branch}\` branch received ${commitCount} new commit${commitCount > 1 ? 's' : ''}`)
            .setAuthor({ 
                name: pusherName, 
                iconURL: pusherAvatar,
                url: `https://github.com/${pusherName}`
            })
            .addFields(
                { name: 'Latest Commit', value: `[${commits[0].id.substring(0, 7)}](${commits[0].url}) ${commits[0].message.split('\n')[0]}` },
                { name: 'Repository', value: `[${repoName}](${repoUrl})`, inline: true },
                { name: 'Branch', value: branch, inline: true }
            )
            .setTimestamp()
            .setFooter({ 
                text: 'GitHub Webhook', 
                iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png' 
            });

        await this.sendDiscordNotification(embed);
    }

    /**
     * Send notification to Discord channel
     */
    async sendDiscordNotification(embed) {
        try {
            // Login to Discord
            await this.discordClient.login(process.env.DISCORD_TOKEN);
            
            // Get notification channel
            const channelId = process.env.GITHUB_WEBHOOK_CHANNEL_ID;
            if (!channelId) {
                console.warn('⚠️ GITHUB_WEBHOOK_CHANNEL_ID not set - cannot send Discord notification');
                return;
            }

            const channel = await this.discordClient.channels.fetch(channelId);
            if (!channel) {
                console.warn(`⚠️ Channel ${channelId} not found`);
                return;
            }

            // Send notification
            await channel.send({ embeds: [embed] });
            console.log('📡 GitHub webhook notification sent to Discord');
        } catch (error) {
            console.error('❌ Failed to send Discord notification:', error);
        }
    }
}

module.exports = GitHubWebhookHandler;
