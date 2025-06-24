const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isOwner } = require('../utils/ownerCheck');

// Emoji options for polls
const POLL_EMOJIS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const YES_NO_EMOJIS = ['✅', '❌'];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('poll')
        .setDescription('🔒 [OWNER ONLY] Create interactive polls')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a multiple choice poll')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('The poll question')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('options')
                        .setDescription('Poll options separated by | (e.g., "Option 1|Option 2|Option 3")')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send the poll to (defaults to current channel)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Poll duration in minutes (0 = no time limit)')
                        .setMinValue(0)
                        .setMaxValue(10080)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('yesno')
                .setDescription('Create a simple yes/no poll')
                .addStringOption(option =>
                    option.setName('question')
                        .setDescription('The poll question')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel to send the poll to (defaults to current channel)')
                        .setRequired(false))
                .addIntegerOption(option =>
                    option.setName('duration')
                        .setDescription('Poll duration in minutes (0 = no time limit)')
                        .setMinValue(0)
                        .setMaxValue(10080)
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('End a poll early')
                .addStringOption(option =>
                    option.setName('message_id')
                        .setDescription('Message ID of the poll to end')
                        .setRequired(true))
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('Channel where the poll is located (defaults to current channel)')
                        .setRequired(false))),

    async execute(interaction) {
        // Owner check
        if (!isOwner(interaction.user.id)) {
            return await interaction.reply({
                content: '🔒 This command is restricted to the bot owner only!',
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await handleCreatePoll(interaction);
                    break;
                case 'yesno':
                    await handleYesNoPoll(interaction);
                    break;
                case 'end':
                    await handleEndPoll(interaction);
                    break;
            }
        } catch (error) {
            console.error('Error in poll command:', error);
            
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setTitle('❌ Error')
                .setDescription('An error occurred while creating the poll. Please try again.')
                .setTimestamp();

            if (interaction.replied) {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};

async function handleCreatePoll(interaction) {
    const question = interaction.options.getString('question');
    const optionsString = interaction.options.getString('options');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const duration = interaction.options.getInteger('duration') || 0;

    // Parse options
    const options = optionsString.split('|').map(opt => opt.trim()).filter(opt => opt.length > 0);

    if (options.length < 2) {
        return await interaction.reply({
            content: '❌ You need at least 2 options for a poll!',
            ephemeral: true
        });
    }

    if (options.length > 10) {
        return await interaction.reply({
            content: '❌ Maximum 10 options allowed for a poll!',
            ephemeral: true
        });
    }

    // Create poll embed
    const embed = new EmbedBuilder()
        .setColor(0x4ecdc4)
        .setTitle('📊 Poll')
        .setDescription(`**${question}**`)
        .setFooter({ 
            text: `Poll created by ${interaction.user.tag}${duration > 0 ? ` • Ends in ${duration} minutes` : ''}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

    // Add options to embed
    let optionsText = '';
    for (let i = 0; i < options.length; i++) {
        optionsText += `${POLL_EMOJIS[i]} ${options[i]}\n`;
    }
    embed.addFields({ name: 'Options', value: optionsText, inline: false });

    if (duration > 0) {
        const endTime = Math.floor((Date.now() + (duration * 60 * 1000)) / 1000);
        embed.addFields({ name: 'Ends', value: `<t:${endTime}:R>`, inline: true });
    }

    // Send poll
    const pollMessage = await channel.send({ embeds: [embed] });

    // Add reactions
    for (let i = 0; i < options.length; i++) {
        await pollMessage.react(POLL_EMOJIS[i]);
    }

    // Schedule auto-end if duration is set
    if (duration > 0) {
        setTimeout(async () => {
            try {
                await endPoll(pollMessage, interaction.user);
            } catch (error) {
                console.error('Error auto-ending poll:', error);
            }
        }, duration * 60 * 1000);
    }

    await interaction.reply({
        content: `✅ Poll created in ${channel}!`,
        ephemeral: true
    });
}

async function handleYesNoPoll(interaction) {
    const question = interaction.options.getString('question');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const duration = interaction.options.getInteger('duration') || 0;

    // Create poll embed
    const embed = new EmbedBuilder()
        .setColor(0x4ecdc4)
        .setTitle('📊 Yes/No Poll')
        .setDescription(`**${question}**`)
        .addFields({ 
            name: 'Options', 
            value: '✅ Yes\n❌ No', 
            inline: false 
        })
        .setFooter({ 
            text: `Poll created by ${interaction.user.tag}${duration > 0 ? ` • Ends in ${duration} minutes` : ''}`,
            iconURL: interaction.user.displayAvatarURL()
        })
        .setTimestamp();

    if (duration > 0) {
        const endTime = Math.floor((Date.now() + (duration * 60 * 1000)) / 1000);
        embed.addFields({ name: 'Ends', value: `<t:${endTime}:R>`, inline: true });
    }

    // Send poll
    const pollMessage = await channel.send({ embeds: [embed] });

    // Add reactions
    await pollMessage.react('✅');
    await pollMessage.react('❌');

    // Schedule auto-end if duration is set
    if (duration > 0) {
        setTimeout(async () => {
            try {
                await endPoll(pollMessage, interaction.user);
            } catch (error) {
                console.error('Error auto-ending poll:', error);
            }
        }, duration * 60 * 1000);
    }

    await interaction.reply({
        content: `✅ Yes/No poll created in ${channel}!`,
        ephemeral: true
    });
}

async function handleEndPoll(interaction) {
    const messageId = interaction.options.getString('message_id');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    try {
        const message = await channel.messages.fetch(messageId);
        
        if (!message) {
            return await interaction.reply({
                content: '❌ Could not find a message with that ID in the specified channel.',
                ephemeral: true
            });
        }

        if (message.author.id !== interaction.client.user.id) {
            return await interaction.reply({
                content: '❌ That message is not a bot poll.',
                ephemeral: true
            });
        }

        await endPoll(message, interaction.user);
        
        await interaction.reply({
            content: '✅ Poll ended successfully!',
            ephemeral: true
        });

    } catch (error) {
        console.error('Error ending poll:', error);
        await interaction.reply({
            content: '❌ Could not find or access that message.',
            ephemeral: true
        });
    }
}

async function endPoll(message, endedBy) {
    try {
        const embed = message.embeds[0];
        if (!embed) return;

        // Get reaction counts
        const reactions = message.reactions.cache;
        let resultsText = '';
        let totalVotes = 0;

        // Calculate results
        const results = [];
        reactions.forEach((reaction, emoji) => {
            if (reaction.me) { // Only count reactions the bot added
                const count = reaction.count - 1; // Subtract bot's reaction
                totalVotes += count;
                results.push({ emoji, count });
            }
        });

        // Sort by vote count
        results.sort((a, b) => b.count - a.count);

        // Create results text
        if (totalVotes === 0) {
            resultsText = 'No votes were cast.';
        } else {
            results.forEach((result, index) => {
                const percentage = ((result.count / totalVotes) * 100).toFixed(1);
                const bar = createProgressBar(result.count, totalVotes);
                resultsText += `${result.emoji} **${result.count}** votes (${percentage}%)\n${bar}\n\n`;
            });
        }

        // Update embed
        const newEmbed = EmbedBuilder.from(embed)
            .setColor(0x95e1d3)
            .setTitle('📊 Poll Results')
            .addFields({ 
                name: `Results (${totalVotes} total votes)`, 
                value: resultsText, 
                inline: false 
            })
            .setFooter({ 
                text: `Poll ended by ${endedBy.tag}`,
                iconURL: endedBy.displayAvatarURL()
            });

        await message.edit({ embeds: [newEmbed] });
        
        // Remove all reactions
        await message.reactions.removeAll().catch(() => {});

    } catch (error) {
        console.error('Error in endPoll function:', error);
    }
}

function createProgressBar(votes, totalVotes, length = 20) {
    if (totalVotes === 0) return '▱'.repeat(length);
    
    const percentage = votes / totalVotes;
    const filledLength = Math.round(length * percentage);
    const emptyLength = length - filledLength;
    
    return '▰'.repeat(filledLength) + '▱'.repeat(emptyLength);
}
