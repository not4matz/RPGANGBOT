const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');
const colors = require('../utils/colors');
const GitHooksSetup = require('../setup-git-hooks');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('githooks')
        .setDescription('Manage automatic GitHub notification hooks (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup automatic git commit notifications'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove git hooks'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check git hooks status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('test')
                .setDescription('Send a test git notification')),

    async execute(interaction) {
        // Check if user is owner
        if (!isOwner(interaction.user.id)) {
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('🔒 Access Denied')
                .setDescription('This command is restricted to the bot owner only!')
                .setTimestamp();

            return await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const setup = new GitHooksSetup();

        switch (subcommand) {
            case 'setup':
                await this.handleSetup(interaction, setup);
                break;
            case 'remove':
                await this.handleRemove(interaction, setup);
                break;
            case 'status':
                await this.handleStatus(interaction, setup);
                break;
            case 'test':
                await this.handleTest(interaction);
                break;
        }
    },

    async handleSetup(interaction, setup) {
        await interaction.deferReply({ ephemeral: true });

        const success = setup.setupHooks();
        
        const embed = new EmbedBuilder()
            .setColor(success ? colors.SUCCESS : colors.ERROR)
            .setTitle(success ? '🎉 Git Hooks Setup Complete!' : '❌ Setup Failed')
            .setTimestamp();

        if (success) {
            embed.setDescription('**Automatic GitHub notifications are now active!**')
                .addFields(
                    {
                        name: '🔄 **What Happens Now**',
                        value: '• Every commit sends Discord notification\n• Shows commit message & file changes\n• Beautiful purple-themed embeds',
                        inline: false
                    },
                    {
                        name: '💡 **Usage**',
                        value: '```bash\ngit add .\ngit commit -m "Your message"\n# 📡 Auto notification sent!```',
                        inline: false
                    }
                );
        } else {
            embed.setDescription('Failed to setup git hooks. Check console for details.');
        }

        await interaction.editReply({ embeds: [embed] });
    },

    async handleRemove(interaction, setup) {
        await interaction.deferReply({ ephemeral: true });

        const removed = setup.removeHooks();
        
        const embed = new EmbedBuilder()
            .setColor(removed ? colors.WARNING : colors.ERROR)
            .setTitle(removed ? '🗑️ Git Hooks Removed' : '❌ No Hooks Found')
            .setDescription(removed ? 'Automatic git notifications have been disabled.' : 'No git hooks were found to remove.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async handleStatus(interaction, setup) {
        const hooksDir = path.join(process.cwd(), '.git', 'hooks');
        const postCommitExists = fs.existsSync(path.join(hooksDir, 'post-commit'));
        const postPushExists = fs.existsSync(path.join(hooksDir, 'post-push'));
        const isGitRepo = setup.isGitRepo();
        const webhookConfigured = !!process.env.UPDATE_WEBHOOK_URL;

        const embed = new EmbedBuilder()
            .setColor(colors.PRIMARY)
            .setTitle('📊 Git Hooks Status')
            .addFields(
                {
                    name: '🔧 **System Status**',
                    value: `**Git Repository:** ${isGitRepo ? '✅ Yes' : '❌ No'}\n**Webhook URL:** ${webhookConfigured ? '✅ Configured' : '❌ Not set'}`,
                    inline: true
                },
                {
                    name: '🪝 **Git Hooks**',
                    value: `**Post-Commit:** ${postCommitExists ? '✅ Active' : '❌ Not installed'}\n**Post-Push:** ${postPushExists ? '✅ Active' : '❌ Not installed'}`,
                    inline: true
                },
                {
                    name: '📋 **Quick Actions**',
                    value: '• `/githooks setup` - Install hooks\n• `/githooks test` - Test notification\n• `/githooks remove` - Remove hooks',
                    inline: false
                }
            )
            .setFooter({ text: 'Goated Bot Git Integration' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleTest(interaction) {
        await interaction.deferReply({ ephemeral: true });

        try {
            const GitAnalyzer = require('../scripts/git-webhook');
            const analyzer = new GitAnalyzer();
            
            await analyzer.sendGitNotification({
                title: '🧪 Test Notification',
                description: 'This is a test of the automatic git notification system!',
                author: interaction.user.username,
                timestamp: new Date()
            });

            const embed = new EmbedBuilder()
                .setColor(colors.SUCCESS)
                .setTitle('✅ Test Notification Sent')
                .setDescription('Check your webhook channel for the test notification!')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            const embed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('❌ Test Failed')
                .setDescription(`Error: ${error.message}`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        }
    }
};
