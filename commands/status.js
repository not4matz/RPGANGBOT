const { SlashCommandBuilder, ActivityType } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('🔒 [OWNER ONLY] Set the bot\'s activity status')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of activity')
                .setRequired(true)
                .addChoices(
                    { name: '🎮 Playing', value: 'playing' },
                    { name: '👀 Watching', value: 'watching' },
                    { name: '🎵 Listening to', value: 'listening' },
                    { name: '📺 Streaming', value: 'streaming' },
                    { name: '🏆 Competing in', value: 'competing' },
                    { name: '🎯 Custom', value: 'custom' }
                ))
        .addStringOption(option =>
            option.setName('text')
                .setDescription('Activity text (what the bot is doing)')
                .setRequired(true)
                .setMaxLength(128))
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Stream URL (only for streaming type)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('state')
                .setDescription('Additional state text (for custom activities)')
                .setRequired(false)
                .setMaxLength(128)),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        try {
            const type = interaction.options.getString('type');
            const text = interaction.options.getString('text');
            const url = interaction.options.getString('url');
            const state = interaction.options.getString('state');

            let activityType;
            let activityOptions = { name: text };

            // Map string choices to ActivityType enum
            switch (type) {
                case 'playing':
                    activityType = ActivityType.Playing;
                    break;
                case 'watching':
                    activityType = ActivityType.Watching;
                    break;
                case 'listening':
                    activityType = ActivityType.Listening;
                    break;
                case 'streaming':
                    activityType = ActivityType.Streaming;
                    if (url) {
                        activityOptions.url = url;
                    } else {
                        return await interaction.reply({
                            content: '❌ Streaming activities require a URL!',
                            ephemeral: true
                        });
                    }
                    break;
                case 'competing':
                    activityType = ActivityType.Competing;
                    break;
                case 'custom':
                    activityType = ActivityType.Custom;
                    if (state) {
                        activityOptions.state = state;
                    }
                    break;
                default:
                    activityType = ActivityType.Playing;
            }

            // Set the activity
            activityOptions.type = activityType;
            
            await interaction.client.user.setActivity(activityOptions);

            // Create response message
            let statusText = '';
            switch (type) {
                case 'playing':
                    statusText = `🎮 Playing ${text}`;
                    break;
                case 'watching':
                    statusText = `👀 Watching ${text}`;
                    break;
                case 'listening':
                    statusText = `🎵 Listening to ${text}`;
                    break;
                case 'streaming':
                    statusText = `📺 Streaming ${text}`;
                    if (url) statusText += `\n🔗 URL: ${url}`;
                    break;
                case 'competing':
                    statusText = `🏆 Competing in ${text}`;
                    break;
                case 'custom':
                    statusText = `🎯 Custom: ${text}`;
                    if (state) statusText += `\n📝 State: ${state}`;
                    break;
            }

            await interaction.reply({
                content: `✅ **Bot status updated!**\n${statusText}`,
                ephemeral: true
            });

            console.log(`🎭 Bot status changed by ${interaction.user.tag}: ${statusText}`);

        } catch (error) {
            console.error('Error setting bot status:', error);
            await interaction.reply({
                content: '❌ Failed to update bot status!',
                ephemeral: true
            });
        }
    },
};
