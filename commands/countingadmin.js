const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const database = require('../utils/database');
const { isOwner } = require('../utils/ownerCheck');

const COUNTING_CHANNEL_ID = '1225180419402502278';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('countingadmin')
        .setDescription('Admin commands for the counting system :purple_heart: [Owner]')
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('View counting channel status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset the counting to 0'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set the current counting number')
                .addIntegerOption(option =>
                    option.setName('number')
                        .setDescription('The number to set the count to')
                        .setRequired(true)
                        .setMinValue(0)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Initialize the counting system for this server'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete counting data for this server')),

    async execute(interaction) {
        if (!(await isOwner(interaction.user.id))) {
            return interaction.reply({ content: 'This command is only available to the bot owner.', ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;
        const channelId = COUNTING_CHANNEL_ID;

        try {
            switch (subcommand) {
                case 'status': {
                    const countingData = await database.getCountingData(guildId, channelId);
                    
                    if (!countingData) {
                        const embed = new EmbedBuilder()
                            .setColor(0xff6b6b)
                            .setTitle('❌ Counting System Not Set Up')
                            .setDescription('The counting system has not been initialized for this server.\nUse `/countingadmin setup` to initialize it.')
                            .setTimestamp();
                        
                        return await interaction.reply({ embeds: [embed] });
                    }

                    const channel = interaction.guild.channels.cache.get(channelId);
                    const lastUser = countingData.last_user_id ? 
                        await interaction.guild.members.fetch(countingData.last_user_id).catch(() => null) : null;

                    const embed = new EmbedBuilder()
                        .setColor(0x4ecdc4)
                        .setTitle('📊 Counting System Status')
                        .addFields(
                            { name: '📍 Channel', value: channel ? `<#${channelId}>` : 'Channel not found', inline: true },
                            { name: '🔢 Current Number', value: countingData.current_number.toString(), inline: true },
                            { name: '🏆 Highest Number', value: countingData.highest_number.toString(), inline: true },
                            { name: '📈 Total Counts', value: countingData.total_counts.toString(), inline: true },
                            { name: '👤 Last Counter', value: lastUser ? lastUser.user.tag : 'None', inline: true },
                            { name: '🎯 Next Number', value: (countingData.current_number + 1).toString(), inline: true }
                        )
                        .setFooter({ text: `Created: ${new Date(countingData.created_at).toLocaleDateString()}` })
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }

                case 'reset': {
                    const countingData = await database.getCountingData(guildId, channelId);
                    
                    if (!countingData) {
                        const embed = new EmbedBuilder()
                            .setColor(0xff6b6b)
                            .setTitle('❌ Counting System Not Set Up')
                            .setDescription('The counting system has not been initialized for this server.\nUse `/countingadmin setup` to initialize it.')
                            .setTimestamp();
                        
                        return await interaction.reply({ embeds: [embed] });
                    }

                    await database.resetCounting(guildId, channelId);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x95e1d3)
                        .setTitle('🔄 Counting Reset')
                        .setDescription(`The counting has been reset to **0**.\nNext number to count: **1**`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });

                    // Send message to counting channel
                    const channel = interaction.guild.channels.cache.get(channelId);
                    if (channel) {
                        await channel.send('🔄 **Counting has been reset!** Start from **1**.');
                    }
                    break;
                }

                case 'set': {
                    const number = interaction.options.getInteger('number');
                    const countingData = await database.getCountingData(guildId, channelId);
                    
                    if (!countingData) {
                        const embed = new EmbedBuilder()
                            .setColor(0xff6b6b)
                            .setTitle('❌ Counting System Not Set Up')
                            .setDescription('The counting system has not been initialized for this server.\nUse `/countingadmin setup` to initialize it.')
                            .setTimestamp();
                        
                        return await interaction.reply({ embeds: [embed] });
                    }

                    await database.setCountingNumber(guildId, channelId, number);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0x4ecdc4)
                        .setTitle('🔢 Counting Number Set')
                        .setDescription(`The counting has been set to **${number}**.\nNext number to count: **${number + 1}**`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });

                    // Send message to counting channel
                    const channel = interaction.guild.channels.cache.get(channelId);
                    if (channel) {
                        await channel.send(`🔢 **Counting set to ${number}!** Next number: **${number + 1}**`);
                    }
                    break;
                }

                case 'setup': {
                    const existingData = await database.getCountingData(guildId, channelId);
                    
                    if (existingData) {
                        const embed = new EmbedBuilder()
                            .setColor(0xfeca57)
                            .setTitle('⚠️ Already Set Up')
                            .setDescription('The counting system is already initialized for this server.')
                            .addFields(
                                { name: 'Current Number', value: existingData.current_number.toString(), inline: true },
                                { name: 'Total Counts', value: existingData.total_counts.toString(), inline: true }
                            )
                            .setTimestamp();
                        
                        return await interaction.reply({ embeds: [embed] });
                    }

                    await database.initializeCounting(guildId, channelId);
                    
                    const channel = interaction.guild.channels.cache.get(channelId);
                    const embed = new EmbedBuilder()
                        .setColor(0x95e1d3)
                        .setTitle('✅ Counting System Initialized')
                        .setDescription(`The counting system has been set up for ${channel ? `<#${channelId}>` : 'the counting channel'}!\n\n**Rules:**\n• Count in order starting from 1\n• Only one number per message\n• You cannot count twice in a row\n• Wrong numbers will be deleted`)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });

                    // Send welcome message to counting channel
                    if (channel) {
                        await channel.send('🎉 **Counting system activated!** Start counting from **1**!');
                    }
                    break;
                }

                case 'delete': {
                    const countingData = await database.getCountingData(guildId, channelId);
                    
                    if (!countingData) {
                        const embed = new EmbedBuilder()
                            .setColor(0xff6b6b)
                            .setTitle('❌ No Data Found')
                            .setDescription('There is no counting data to delete for this server.')
                            .setTimestamp();
                        
                        return await interaction.reply({ embeds: [embed] });
                    }

                    await database.deleteCounting(guildId, channelId);
                    
                    const embed = new EmbedBuilder()
                        .setColor(0xff6b6b)
                        .setTitle('🗑️ Counting Data Deleted')
                        .setDescription('All counting data has been permanently deleted for this server.')
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed] });
                    break;
                }
            }

        } catch (error) {
            console.error('Error in counting admin command:', error);
            
            const embed = new EmbedBuilder()
                .setColor(0xff6b6b)
                .setTitle('❌ Error')
                .setDescription('An error occurred while executing the command. Please try again.')
                .setTimestamp();

            if (interaction.replied) {
                await interaction.followUp({ embeds: [embed], ephemeral: true });
            } else {
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
    },
};
