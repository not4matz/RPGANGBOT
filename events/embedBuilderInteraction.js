const { Events, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ChannelSelectMenuBuilder, ChannelType } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        // Only handle button interactions for embed builder
        if (!interaction.isButton() && !interaction.isModalSubmit() && !interaction.isChannelSelectMenu()) return;
        
        // Check if it's an embed builder interaction
        if (!interaction.customId?.startsWith('embed_')) return;

        // Check if user is owner
        if (!isOwner(interaction.user.id)) {
            return await interaction.reply({
                content: '🔒 This is restricted to the bot owner only!',
                ephemeral: true
            });
        }

        try {
            // Initialize embed data if not exists
            if (!interaction.client.embedBuilderData) {
                interaction.client.embedBuilderData = new Map();
            }

            let embedData = interaction.client.embedBuilderData.get(interaction.user.id);
            if (!embedData) {
                embedData = {
                    title: null,
                    description: null,
                    color: '#5865f2',
                    thumbnail: null,
                    image: null,
                    footer: null,
                    author: null,
                    fields: [],
                    timestamp: false
                };
                interaction.client.embedBuilderData.set(interaction.user.id, embedData);
            }

            // Handle button interactions
            if (interaction.isButton()) {
                switch (interaction.customId) {
                    case 'embed_title_desc':
                        await handleTitleDescModal(interaction);
                        break;
                    case 'embed_color_images':
                        await handleColorImagesModal(interaction);
                        break;
                    case 'embed_fields':
                        await handleFieldsModal(interaction);
                        break;
                    case 'embed_footer_author':
                        await handleFooterAuthorModal(interaction);
                        break;
                    case 'embed_preview':
                        await handlePreview(interaction, embedData);
                        break;
                    case 'embed_send':
                        await handleSendEmbed(interaction, embedData);
                        break;
                    case 'embed_reset':
                        await handleReset(interaction);
                        break;
                }
            }

            // Handle modal submissions
            if (interaction.isModalSubmit()) {
                switch (interaction.customId) {
                    case 'title_desc_modal':
                        await handleTitleDescSubmit(interaction, embedData);
                        break;
                    case 'color_images_modal':
                        await handleColorImagesSubmit(interaction, embedData);
                        break;
                    case 'fields_modal':
                        await handleFieldsSubmit(interaction, embedData);
                        break;
                    case 'footer_author_modal':
                        await handleFooterAuthorSubmit(interaction, embedData);
                        break;
                }
            }

            // Handle channel select
            if (interaction.isChannelSelectMenu() && interaction.customId === 'embed_channel_select') {
                await handleChannelSelect(interaction, embedData);
            }

        } catch (error) {
            console.error('Error in embed builder interaction:', error);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({
                    content: '❌ An error occurred while processing your request!',
                    ephemeral: true
                });
            }
        }
    },
};

// Modal handlers
async function handleTitleDescModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('title_desc_modal')
        .setTitle('Set Title & Description');

    const titleInput = new TextInputBuilder()
        .setCustomId('title_input')
        .setLabel('Embed Title')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(256);

    const descInput = new TextInputBuilder()
        .setCustomId('desc_input')
        .setLabel('Embed Description')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setMaxLength(4000);

    const row1 = new ActionRowBuilder().addComponents(titleInput);
    const row2 = new ActionRowBuilder().addComponents(descInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}

async function handleColorImagesModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('color_images_modal')
        .setTitle('Set Color & Images');

    const colorInput = new TextInputBuilder()
        .setCustomId('color_input')
        .setLabel('Color (hex code like #ff0000 or color name)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('#5865f2 or red, blue, green, etc.');

    const thumbnailInput = new TextInputBuilder()
        .setCustomId('thumbnail_input')
        .setLabel('Thumbnail URL')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('https://example.com/image.png');

    const imageInput = new TextInputBuilder()
        .setCustomId('image_input')
        .setLabel('Main Image URL')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('https://example.com/image.png');

    const timestampInput = new TextInputBuilder()
        .setCustomId('timestamp_input')
        .setLabel('Add Timestamp? (yes/no)')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setPlaceholder('yes or no');

    const row1 = new ActionRowBuilder().addComponents(colorInput);
    const row2 = new ActionRowBuilder().addComponents(thumbnailInput);
    const row3 = new ActionRowBuilder().addComponents(imageInput);
    const row4 = new ActionRowBuilder().addComponents(timestampInput);

    modal.addComponents(row1, row2, row3, row4);
    await interaction.showModal(modal);
}

async function handleFieldsModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('fields_modal')
        .setTitle('Add Fields');

    const fieldsInput = new TextInputBuilder()
        .setCustomId('fields_input')
        .setLabel('Fields (format: name|value|inline, name2|value2|inline)')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(false)
        .setPlaceholder('Field Name|Field Value|true, Another Field|Another Value|false')
        .setMaxLength(1000);

    const row = new ActionRowBuilder().addComponents(fieldsInput);
    modal.addComponents(row);
    await interaction.showModal(modal);
}

async function handleFooterAuthorModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('footer_author_modal')
        .setTitle('Set Footer & Author');

    const footerInput = new TextInputBuilder()
        .setCustomId('footer_input')
        .setLabel('Footer Text')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(2048);

    const authorInput = new TextInputBuilder()
        .setCustomId('author_input')
        .setLabel('Author Name')
        .setStyle(TextInputStyle.Short)
        .setRequired(false)
        .setMaxLength(256);

    const row1 = new ActionRowBuilder().addComponents(footerInput);
    const row2 = new ActionRowBuilder().addComponents(authorInput);

    modal.addComponents(row1, row2);
    await interaction.showModal(modal);
}

// Submit handlers
async function handleTitleDescSubmit(interaction, embedData) {
    const title = interaction.fields.getTextInputValue('title_input');
    const description = interaction.fields.getTextInputValue('desc_input');

    embedData.title = title || null;
    embedData.description = description || null;

    await interaction.reply({
        content: '✅ Title and description updated!',
        ephemeral: true
    });
}

async function handleColorImagesSubmit(interaction, embedData) {
    const color = interaction.fields.getTextInputValue('color_input');
    const thumbnail = interaction.fields.getTextInputValue('thumbnail_input');
    const image = interaction.fields.getTextInputValue('image_input');
    const timestamp = interaction.fields.getTextInputValue('timestamp_input');

    if (color) {
        const colorMap = {
            'red': '#ff0000', 'green': '#00ff00', 'blue': '#0000ff',
            'yellow': '#ffff00', 'orange': '#ffa500', 'purple': '#800080',
            'pink': '#ffc0cb', 'black': '#000000', 'white': '#ffffff',
            'gray': '#808080', 'grey': '#808080', 'discord': '#5865f2'
        };
        embedData.color = colorMap[color.toLowerCase()] || color;
    }
    
    embedData.thumbnail = thumbnail || null;
    embedData.image = image || null;
    embedData.timestamp = timestamp?.toLowerCase() === 'yes';

    await interaction.reply({
        content: '✅ Color and images updated!',
        ephemeral: true
    });
}

async function handleFieldsSubmit(interaction, embedData) {
    const fieldsInput = interaction.fields.getTextInputValue('fields_input');
    
    if (fieldsInput) {
        try {
            const fieldGroups = fieldsInput.split(',');
            const newFields = [];
            
            for (const fieldGroup of fieldGroups) {
                const [name, value, inlineStr] = fieldGroup.split('|').map(s => s.trim());
                if (name && value) {
                    newFields.push({
                        name,
                        value,
                        inline: inlineStr === 'true'
                    });
                }
            }
            
            embedData.fields = newFields;
            await interaction.reply({
                content: `✅ Added ${newFields.length} field(s)!`,
                ephemeral: true
            });
        } catch (error) {
            await interaction.reply({
                content: '❌ Error parsing fields! Use format: name|value|inline, name2|value2|inline',
                ephemeral: true
            });
        }
    } else {
        embedData.fields = [];
        await interaction.reply({
            content: '✅ Fields cleared!',
            ephemeral: true
        });
    }
}

async function handleFooterAuthorSubmit(interaction, embedData) {
    const footer = interaction.fields.getTextInputValue('footer_input');
    const author = interaction.fields.getTextInputValue('author_input');

    embedData.footer = footer || null;
    embedData.author = author || null;

    await interaction.reply({
        content: '✅ Footer and author updated!',
        ephemeral: true
    });
}

async function handlePreview(interaction, embedData) {
    const embed = buildEmbed(embedData);
    
    await interaction.reply({
        content: '👁️ **Embed Preview:**',
        embeds: [embed],
        ephemeral: true
    });
}

async function handleSendEmbed(interaction, embedData) {
    const embed = buildEmbed(embedData);
    
    // Check if embed has content
    if (!embedData.title && !embedData.description && embedData.fields.length === 0 && !embedData.image && !embedData.thumbnail) {
        return await interaction.reply({
            content: '❌ Embed must have at least a title, description, field, or image!',
            ephemeral: true
        });
    }

    // Create channel select menu
    const selectMenu = new ChannelSelectMenuBuilder()
        .setCustomId('embed_channel_select')
        .setPlaceholder('Select a channel to send the embed to')
        .setChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    await interaction.reply({
        content: '📤 Select a channel to send your embed to:',
        components: [row],
        ephemeral: true
    });
}

async function handleChannelSelect(interaction, embedData) {
    const channel = interaction.channels.first();
    const embed = buildEmbed(embedData);

    try {
        await channel.send({ embeds: [embed] });
        await interaction.update({
            content: `✅ Embed sent successfully to ${channel}!`,
            components: []
        });
        
        // Clear the embed data
        interaction.client.embedBuilderData.delete(interaction.user.id);
    } catch (error) {
        await interaction.update({
            content: `❌ Failed to send embed to ${channel}. Check permissions!`,
            components: []
        });
    }
}

async function handleReset(interaction) {
    interaction.client.embedBuilderData.delete(interaction.user.id);
    await interaction.reply({
        content: '🔄 Embed builder reset! All data cleared.',
        ephemeral: true
    });
}

function buildEmbed(embedData) {
    const embed = new EmbedBuilder();
    
    if (embedData.title) embed.setTitle(embedData.title);
    if (embedData.description) embed.setDescription(embedData.description);
    if (embedData.color) embed.setColor(embedData.color);
    if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);
    if (embedData.image) embed.setImage(embedData.image);
    if (embedData.footer) embed.setFooter({ text: embedData.footer });
    if (embedData.author) embed.setAuthor({ name: embedData.author });
    if (embedData.timestamp) embed.setTimestamp();
    if (embedData.fields.length > 0) embed.addFields(embedData.fields);
    
    return embed;
}
