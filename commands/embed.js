const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('embed')
        .setDescription('📝 Create and send custom embeds (Owner only)')
        .addStringOption(option =>
            option.setName('title')
                .setDescription('Embed title')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('description')
                .setDescription('Embed description')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('color')
                .setDescription('Embed color (hex code like #ff0000 or color name)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('thumbnail')
                .setDescription('Thumbnail image URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('image')
                .setDescription('Main image URL')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('footer')
                .setDescription('Footer text')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('author')
                .setDescription('Author name')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('fields')
                .setDescription('Fields in format: "name1|value1|inline,name2|value2|inline" (inline: true/false)')
                .setRequired(false))
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('Channel to send the embed to (default: current channel)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('timestamp')
                .setDescription('Add current timestamp to embed')
                .setRequired(false)),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        try {
            const title = interaction.options.getString('title');
            const description = interaction.options.getString('description');
            const color = interaction.options.getString('color');
            const thumbnail = interaction.options.getString('thumbnail');
            const image = interaction.options.getString('image');
            const footer = interaction.options.getString('footer');
            const author = interaction.options.getString('author');
            const fieldsInput = interaction.options.getString('fields');
            const targetChannel = interaction.options.getChannel('channel') || interaction.channel;
            const addTimestamp = interaction.options.getBoolean('timestamp');

            // Create embed
            const embed = new EmbedBuilder();

            // Set basic properties
            if (title) embed.setTitle(title);
            if (description) embed.setDescription(description);
            
            // Set color
            if (color) {
                // Handle common color names
                const colorMap = {
                    'red': '#ff0000',
                    'green': '#00ff00',
                    'blue': '#0000ff',
                    'yellow': '#ffff00',
                    'orange': '#ffa500',
                    'purple': '#800080',
                    'pink': '#ffc0cb',
                    'black': '#000000',
                    'white': '#ffffff',
                    'gray': '#808080',
                    'grey': '#808080',
                    'discord': '#5865f2',
                    'blurple': '#5865f2'
                };
                
                const finalColor = colorMap[color.toLowerCase()] || color;
                embed.setColor(finalColor);
            } else {
                embed.setColor('#5865f2'); // Default Discord blurple
            }

            // Set images
            if (thumbnail) {
                try {
                    embed.setThumbnail(thumbnail);
                } catch (error) {
                    console.warn('Invalid thumbnail URL:', thumbnail);
                }
            }
            
            if (image) {
                try {
                    embed.setImage(image);
                } catch (error) {
                    console.warn('Invalid image URL:', image);
                }
            }

            // Set footer
            if (footer) {
                embed.setFooter({ text: footer });
            }

            // Set author
            if (author) {
                embed.setAuthor({ name: author });
            }

            // Add timestamp
            if (addTimestamp) {
                embed.setTimestamp();
            }

            // Parse and add fields
            if (fieldsInput) {
                try {
                    const fieldGroups = fieldsInput.split(',');
                    for (const fieldGroup of fieldGroups) {
                        const [name, value, inlineStr] = fieldGroup.split('|').map(s => s.trim());
                        if (name && value) {
                            const inline = inlineStr === 'true';
                            embed.addFields({ name, value, inline });
                        }
                    }
                } catch (error) {
                    console.warn('Error parsing fields:', error);
                }
            }

            // Check if embed has any content
            if (!title && !description && !fieldsInput && !image && !thumbnail) {
                return await interaction.reply({
                    content: '❌ Embed must have at least a title, description, field, or image!',
                    ephemeral: true
                });
            }

            // Send embed to target channel
            await targetChannel.send({ embeds: [embed] });

            // Confirm success
            const confirmEmbed = new EmbedBuilder()
                .setTitle('✅ Embed Sent Successfully!')
                .setDescription(`Embed has been sent to ${targetChannel}`)
                .setColor('#00ff00')
                .setTimestamp();

            await interaction.reply({
                embeds: [confirmEmbed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error creating embed:', error);
            
            let errorMessage = '❌ Failed to create embed!';
            if (error.message.includes('Invalid URL')) {
                errorMessage += ' Check your image/thumbnail URLs.';
            } else if (error.message.includes('Missing Permissions')) {
                errorMessage += ' I don\'t have permission to send messages in that channel.';
            }

            await interaction.reply({
                content: errorMessage,
                ephemeral: true
            });
        }
    },
};
