const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('join2create')
        .setDescription('🎤 Setup Join2Create voice channel system (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup Join2Create system')
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Category to create voice channels in')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('disable')
                .setDescription('Disable Join2Create system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check Join2Create system status')),

    async execute(interaction) {
        try {
            // Check if user is bot owner
            if (!(await checkOwner(interaction))) {
                return; // checkOwner already sent the error message
            }

            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'setup') {
                await this.handleSetup(interaction);
            } else if (subcommand === 'disable') {
                await this.handleDisable(interaction);
            } else if (subcommand === 'status') {
                await this.handleStatus(interaction);
            }

        } catch (error) {
            console.error('Error in join2create command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('An error occurred while managing Join2Create system.')
                .setColor('#FF0000')
                .setTimestamp();

            try {
                if (interaction.deferred) {
                    await interaction.editReply({ embeds: [errorEmbed] });
                } else {
                    await interaction.reply({ 
                        embeds: [errorEmbed], 
                        flags: MessageFlags.Ephemeral 
                    });
                }
            } catch (replyError) {
                console.error('Failed to send error reply:', replyError);
            }
        }
    },

    async handleSetup(interaction) {
        const category = interaction.options.getChannel('category');
        
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            // Create the Join2Create trigger channel
            const triggerChannel = await interaction.guild.channels.create({
                name: '➕ Join to Create',
                type: ChannelType.GuildVoice,
                parent: category.id,
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect],
                        deny: [PermissionFlagsBits.Speak]
                    }
                ]
            });

            // Create control panel text channel
            const controlChannel = await interaction.guild.channels.create({
                name: '🎛️-voice-control',
                type: ChannelType.GuildText,
                parent: category.id,
                topic: 'Join2Create Voice Channel Control Panel',
                permissionOverwrites: [
                    {
                        id: interaction.guild.roles.everyone.id,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.ReadMessageHistory],
                        deny: [PermissionFlagsBits.SendMessages, PermissionFlagsBits.AddReactions]
                    }
                ]
            });

            // Save configuration to database
            await database.setJoin2CreateConfig(interaction.guild.id, {
                triggerChannelId: triggerChannel.id,
                controlChannelId: controlChannel.id,
                categoryId: category.id,
                enabled: true
            });

            // Create control panel embed and buttons
            await this.createControlPanel(controlChannel);

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Join2Create Setup Complete!')
                .setDescription('The Join2Create system has been successfully configured.')
                .addFields(
                    { 
                        name: '🎤 Trigger Channel', 
                        value: `${triggerChannel}`, 
                        inline: true 
                    },
                    { 
                        name: '🎛️ Control Panel', 
                        value: `${controlChannel}`, 
                        inline: true 
                    },
                    { 
                        name: '📁 Category', 
                        value: `${category}`, 
                        inline: true 
                    },
                    {
                        name: '📋 How it Works',
                        value: '• Users join the trigger channel to create a private voice channel\n• They become the owner of their channel\n• Use the control panel to manage your voice channel\n• Channels are automatically deleted when empty',
                        inline: false
                    }
                )
                .setColor('#8A2BE2')
                .setFooter({ 
                    text: 'Purple Bot • Join2Create System',
                    iconURL: interaction.guild.iconURL()
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error setting up Join2Create:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Setup Failed')
                .setDescription('Failed to setup Join2Create system. Please check bot permissions.')
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async handleDisable(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const config = await database.getJoin2CreateConfig(interaction.guild.id);
            
            if (!config || !config.enabled) {
                const embed = new EmbedBuilder()
                    .setTitle('ℹ️ Already Disabled')
                    .setDescription('Join2Create system is not currently enabled.')
                    .setColor('#6A0DAD')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            // Disable in database
            await database.setJoin2CreateConfig(interaction.guild.id, {
                ...config,
                enabled: false
            });

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Join2Create Disabled')
                .setDescription('The Join2Create system has been disabled. Existing channels will remain but no new ones will be created.')
                .setColor('#8A2BE2')
                .setFooter({ text: 'Purple Bot • Join2Create System' })
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error disabling Join2Create:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to disable Join2Create system.')
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async handleStatus(interaction) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        try {
            const config = await database.getJoin2CreateConfig(interaction.guild.id);
            
            if (!config) {
                const embed = new EmbedBuilder()
                    .setTitle('📊 Join2Create Status')
                    .setDescription('❌ Join2Create system is not configured.')
                    .addFields({
                        name: '🔧 Setup Required',
                        value: 'Use `/join2create setup` to configure the system.',
                        inline: false
                    })
                    .setColor('#6A0DAD')
                    .setTimestamp();

                return await interaction.editReply({ embeds: [embed] });
            }

            const triggerChannel = interaction.guild.channels.cache.get(config.triggerChannelId);
            const controlChannel = interaction.guild.channels.cache.get(config.controlChannelId);
            const category = interaction.guild.channels.cache.get(config.categoryId);

            const statusEmbed = new EmbedBuilder()
                .setTitle('📊 Join2Create Status')
                .setDescription(`**Status:** ${config.enabled ? '✅ Enabled' : '❌ Disabled'}`)
                .addFields(
                    { 
                        name: '🎤 Trigger Channel', 
                        value: triggerChannel ? `${triggerChannel}` : '❌ Channel not found', 
                        inline: true 
                    },
                    { 
                        name: '🎛️ Control Panel', 
                        value: controlChannel ? `${controlChannel}` : '❌ Channel not found', 
                        inline: true 
                    },
                    { 
                        name: '📁 Category', 
                        value: category ? `${category}` : '❌ Category not found', 
                        inline: true 
                    }
                )
                .setColor(config.enabled ? '#8A2BE2' : '#FF6B6B')
                .setFooter({ text: 'Purple Bot • Join2Create System' })
                .setTimestamp();

            await interaction.editReply({ embeds: [statusEmbed] });

        } catch (error) {
            console.error('Error checking Join2Create status:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Error')
                .setDescription('Failed to check Join2Create status.')
                .setColor('#FF0000')
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },

    async createControlPanel(channel) {
        const controlEmbed = new EmbedBuilder()
            .setTitle('🎛️ Voice Channel Control Panel')
            .setDescription('**Welcome to the Join2Create Control Center!**\n\nUse the buttons below to manage your voice channel when you own one.')
            .addFields(
                {
                    name: '🎤 How to Create a Channel',
                    value: 'Join the **➕ Join to Create** voice channel and you\'ll automatically get your own private voice channel!',
                    inline: false
                },
                {
                    name: '🔧 Available Controls',
                    value: '🔒 **Lock/Unlock** - Control who can join\n👥 **Limit** - Set user limit (2-99)\n🏷️ **Rename** - Change channel name\n👑 **Transfer** - Give ownership to someone else\n🚫 **Kick** - Remove users from your channel\n❌ **Delete** - Delete your channel',
                    inline: false
                },
                {
                    name: '💡 Tips',
                    value: '• Only channel owners can use these controls\n• Channels are automatically deleted when empty\n• You can only control channels you created',
                    inline: false
                }
            )
            .setColor('#8A2BE2')
            .setFooter({ 
                text: 'Purple Bot • Join2Create System',
                iconURL: channel.guild.iconURL()
            })
            .setTimestamp();

        const row1 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_lock')
                    .setLabel('Lock')
                    .setEmoji('🔒')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_unlock')
                    .setLabel('Unlock')
                    .setEmoji('🔓')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('j2c_limit')
                    .setLabel('Set Limit')
                    .setEmoji('👥')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('j2c_rename')
                    .setLabel('Rename')
                    .setEmoji('🏷️')
                    .setStyle(ButtonStyle.Primary)
            );

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('j2c_transfer')
                    .setLabel('Transfer')
                    .setEmoji('👑')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('j2c_kick')
                    .setLabel('Kick User')
                    .setEmoji('🚫')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('j2c_delete')
                    .setLabel('Delete')
                    .setEmoji('❌')
                    .setStyle(ButtonStyle.Danger)
            );

        await channel.send({ 
            embeds: [controlEmbed], 
            components: [row1, row2] 
        });
    }
};
