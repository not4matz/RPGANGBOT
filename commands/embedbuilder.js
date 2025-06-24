const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embedbuilder')
        .setDescription('🔒 [OWNER ONLY] Interactive embed builder with preview'),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        try {
            // Create initial embed
            const embed = new EmbedBuilder()
                .setTitle('📝 Embed Builder')
                .setDescription('Use the buttons below to customize your embed. Click "Preview" to see changes and "Send" when ready.')
                .setColor('#5865f2')
                .addFields(
                    { name: '📋 Instructions', value: 'Click the buttons below to add content to your embed:', inline: false },
                    { name: '🎨 Available Options', value: '• Title & Description\n• Color & Images\n• Fields & Footer\n• Author & Timestamp', inline: true },
                    { name: '📤 When Ready', value: 'Click "Send Embed" to post it to a channel', inline: true }
                )
                .setTimestamp();

            // Create buttons
            const row1 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('embed_title_desc')
                        .setLabel('Title & Description')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📝'),
                    new ButtonBuilder()
                        .setCustomId('embed_color_images')
                        .setLabel('Color & Images')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎨'),
                    new ButtonBuilder()
                        .setCustomId('embed_fields')
                        .setLabel('Add Fields')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('📋'),
                    new ButtonBuilder()
                        .setCustomId('embed_footer_author')
                        .setLabel('Footer & Author')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('👤')
                );

            const row2 = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('embed_preview')
                        .setLabel('Preview Embed')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('👁️'),
                    new ButtonBuilder()
                        .setCustomId('embed_send')
                        .setLabel('Send Embed')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📤'),
                    new ButtonBuilder()
                        .setCustomId('embed_reset')
                        .setLabel('Reset')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🔄')
                );

            await interaction.reply({
                embeds: [embed],
                components: [row1, row2],
                ephemeral: true
            });

            // Store embed data in a temporary object (in a real bot, you'd use a database)
            if (!interaction.client.embedBuilderData) {
                interaction.client.embedBuilderData = new Map();
            }
            
            interaction.client.embedBuilderData.set(interaction.user.id, {
                title: null,
                description: null,
                color: '#5865f2',
                thumbnail: null,
                image: null,
                footer: null,
                author: null,
                fields: [],
                timestamp: false
            });

        } catch (error) {
            console.error('Error starting embed builder:', error);
            await interaction.reply({
                content: '❌ Failed to start embed builder!',
                ephemeral: true
            });
        }
    },
};
