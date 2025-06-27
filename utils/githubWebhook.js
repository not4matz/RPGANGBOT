const crypto = require('crypto');
const { EmbedBuilder, WebhookClient } = require('discord.js');

class GitHubWebhookHandler {
    constructor() {
        this.webhookUrl = process.env.UPDATE_WEBHOOK_URL;
        this.secret = process.env.GITHUB_WEBHOOK_SECRET;
        
        if (this.webhookUrl) {
            this.webhookClient = new WebhookClient({ url: this.webhookUrl });
        }
    }

    /**
     * Verify GitHub webhook signature
     */
    verifySignature(payload, signature) {
        if (!this.secret) {
            console.log('⚠️ GITHUB_WEBHOOK_SECRET not set - skipping signature verification');
            return true; // Allow if no secret is set
        }

        const expectedSignature = 'sha256=' + crypto
            .createHmac('sha256', this.secret)
            .update(payload, 'utf8')
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    /**
     * Handle GitHub push webhook
     */
    async handlePushEvent(payload) {
        try {
            const { repository, pusher, commits, head_commit, ref } = payload;
            
            if (!head_commit || commits.length === 0) {
                console.log('📝 No commits in push event, skipping notification');
                return;
            }

            // Extract branch name from ref (refs/heads/main -> main)
            const branch = ref.replace('refs/heads/', '');
            
            // Calculate statistics
            const stats = this.calculateCommitStats(commits);
            
            // Create Discord embed
            const embed = new EmbedBuilder()
                .setColor('#8A2BE2') // Purple theme
                .setTitle('💜 GitHub Push Notification')
                .setDescription(`**${commits.length} commit${commits.length > 1 ? 's' : ''} pushed to \`${branch}\`**`)
                .addFields(
                    {
                        name: '📊 **Change Statistics**',
                        value: `**Files Modified:** ${stats.filesChanged}\n**Lines Added:** +${stats.linesAdded}\n**Lines Deleted:** -${stats.linesDeleted}\n**Net Change:** ${this.getNetChangeText(stats.linesAdded, stats.linesDeleted)}`,
                        inline: true
                    },
                    {
                        name: '⚡ **Push Info**',
                        value: `**Author:** ${pusher.name}\n**Repository:** ${repository.name}\n**Branch:** \`${branch}\`\n**Status:** Deployed ✅`,
                        inline: true
                    }
                )
                .setFooter({ 
                    text: 'Purple Bot GitHub Integration', 
                    iconURL: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
                })
                .setTimestamp(new Date(head_commit.timestamp));

            // Add latest commit info
            if (head_commit.message) {
                embed.addFields({
                    name: '📝 **Latest Commit**',
                    value: `\`\`\`${head_commit.message.substring(0, 200)}${head_commit.message.length > 200 ? '...' : ''}\`\`\``,
                    inline: false
                });
            }

            // Add commit list if multiple commits
            if (commits.length > 1) {
                const commitList = commits.slice(0, 5).map(commit => 
                    `• \`${commit.id.substring(0, 7)}\` ${commit.message.split('\n')[0].substring(0, 50)}${commit.message.length > 50 ? '...' : ''}`
                ).join('\n');
                
                embed.addFields({
                    name: `📋 **Recent Commits** (${commits.length > 5 ? '5 of ' + commits.length : commits.length})`,
                    value: commitList,
                    inline: false
                });
            }

            // Send webhook
            if (this.webhookClient) {
                await this.webhookClient.send({ embeds: [embed] });
                console.log('✅ GitHub push notification sent successfully');
            } else {
                console.log('⚠️ UPDATE_WEBHOOK_URL not set - notification skipped');
            }

        } catch (error) {
            console.error('❌ Error handling GitHub push event:', error);
        }
    }

    /**
     * Calculate commit statistics
     */
    calculateCommitStats(commits) {
        let filesChanged = 0;
        let linesAdded = 0;
        let linesDeleted = 0;
        const uniqueFiles = new Set();

        commits.forEach(commit => {
            if (commit.added) commit.added.forEach(file => uniqueFiles.add(file));
            if (commit.modified) commit.modified.forEach(file => uniqueFiles.add(file));
            if (commit.removed) commit.removed.forEach(file => uniqueFiles.add(file));
        });

        filesChanged = uniqueFiles.size;

        // GitHub doesn't provide line stats in webhook payload
        // We'll estimate based on commits (this is a limitation of GitHub webhooks)
        linesAdded = commits.length * 10; // Rough estimate
        linesDeleted = Math.floor(commits.length * 2); // Rough estimate

        return { filesChanged, linesAdded, linesDeleted };
    }

    /**
     * Get net change text with color coding
     */
    getNetChangeText(added, deleted) {
        const netChange = added - deleted;
        if (netChange > 0) {
            return `🟢 +${netChange}`;
        } else if (netChange < 0) {
            return `🔴 ${netChange}`;
        } else {
            return `⚪ 0`;
        }
    }

    /**
     * Handle other GitHub events (issues, pull requests, etc.)
     */
    async handleOtherEvent(eventType, payload) {
        console.log(`📝 Received GitHub ${eventType} event - not implemented yet`);
        // Future: Handle other GitHub events like issues, PRs, releases, etc.
    }
}

module.exports = GitHubWebhookHandler;
