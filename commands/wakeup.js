const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const colors = require('../utils/colors');

// Voice channel IDs for wakeup
const WAKEUP_CHANNELS = [
    '1292438962161320008',
    '1327435099867709521'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wakeup')
        .setDescription('💜 Move a user between voice channels to wake them up')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to wake up')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const guildId = interaction.guild.id;

            // Check if the COMMAND USER has wakeup permissions (not the target)
            const permissions = await database.getWakeupPermissions(interaction.user.id, guildId);
            if (!permissions || !permissions.allowed) {
                const embed = new EmbedBuilder()
                    .setColor(colors.ERROR)
                    .setTitle('🔒 Access Denied')
                    .setDescription('You do not have permission to use the wakeup command.')
                    .addFields({
                        name: '💡 How to get access',
                        value: 'Ask the bot owner to grant you wakeup permissions using `/allowwakeup`',
                        inline: false
                    })
                    .setFooter({ text: 'Purple Bot Security System' })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Get the target user's voice state
            const member = await interaction.guild.members.fetch(targetUser.id);
            if (!member.voice.channel) {
                const embed = new EmbedBuilder()
                    .setColor(colors.WARNING)
                    .setTitle('⚠️ User Not in Voice')
                    .setDescription(`${targetUser.username} is not currently in a voice channel.`)
                    .addFields({
                        name: '💡 Tip',
                        value: 'The user must be connected to voice to be woken up!',
                        inline: false
                    })
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const originalChannel = member.voice.channel;

            // Check if bot has permission to move members
            if (!interaction.guild.members.me.permissions.has('MoveMembers')) {
                const embed = new EmbedBuilder()
                    .setColor(colors.ERROR)
                    .setTitle('❌ Missing Permissions')
                    .setDescription('I need the "Move Members" permission to use this command.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Get the wakeup channels
            const channel1 = interaction.guild.channels.cache.get(WAKEUP_CHANNELS[0]);
            const channel2 = interaction.guild.channels.cache.get(WAKEUP_CHANNELS[1]);

            if (!channel1 || !channel2) {
                const embed = new EmbedBuilder()
                    .setColor(colors.ERROR)
                    .setTitle('❌ Configuration Error')
                    .setDescription('Wakeup channels are not properly configured.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Initial response
            const embed = new EmbedBuilder()
                .setColor(colors.ACCENT)
                .setTitle('💜 Wakeup Initiated')
                .setDescription(`Starting wakeup sequence for ${targetUser.username}...`)
                .addFields(
                    { name: '🎯 Target', value: targetUser.username, inline: true },
                    { name: '📍 Original Channel', value: originalChannel.name, inline: true },
                    { name: '⚡ Status', value: 'Moving between channels...', inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Move user between channels for exactly 10 moves
            let currentChannel = 0;
            let moveCount = 0;
            const maxMoves = 10;

            const moveUser = async () => {
                try {
                    // Failsafe: Check if user is still connected to voice
                    const currentMember = await interaction.guild.members.fetch(targetUser.id);
                    if (!currentMember.voice.channel) {
                        console.log('User disconnected from voice during wakeup - stopping command');
                        
                        const disconnectedEmbed = new EmbedBuilder()
                            .setColor(colors.WARNING)
                            .setTitle('⚠️ Wakeup Stopped')
                            .setDescription(`${targetUser.username} disconnected from voice during wakeup.`)
                            .addFields(
                                { name: '📊 Moves Made', value: `${moveCount} moves`, inline: true },
                                { name: '⚡ Status', value: 'User left voice - command stopped', inline: true }
                            )
                            .setTimestamp();

                        await interaction.editReply({ embeds: [disconnectedEmbed] });
                        return; // Stop the recursive moving
                    }

                    const channelToMoveTo = currentChannel === 0 ? channel1 : channel2;
                    await currentMember.voice.setChannel(channelToMoveTo);
                    currentChannel = currentChannel === 0 ? 1 : 0;
                    moveCount++;
                    
                    // Check if we've completed all moves
                    if (moveCount >= maxMoves) {
                        // Return to original channel after completing all moves
                        try {
                            const finalMember = await interaction.guild.members.fetch(targetUser.id);
                            if (finalMember.voice.channel) {
                                await finalMember.voice.setChannel(originalChannel);
                            }
                            
                            // Update the embed to show completion
                            const completedEmbed = new EmbedBuilder()
                                .setColor(colors.SUCCESS)
                                .setTitle('✅ Wakeup Complete')
                                .setDescription(`${targetUser.username} has been successfully woken up!`)
                                .addFields(
                                    { name: '📊 Moves Made', value: `${moveCount} moves`, inline: true },
                                    { name: '📍 Returned To', value: originalChannel.name, inline: true },
                                    { name: '⚡ Status', value: 'Completed successfully', inline: true }
                                )
                                .setThumbnail(targetUser.displayAvatarURL())
                                .setFooter({ text: 'Purple Bot Wakeup System' })
                                .setTimestamp();

                            await interaction.editReply({ embeds: [completedEmbed] });

                        } catch (returnError) {
                            console.error('Error returning user to original channel:', returnError);
                            
                            const errorEmbed = new EmbedBuilder()
                                .setColor(colors.ERROR)
                                .setTitle('⚠️ Wakeup Completed with Issues')
                                .setDescription(`${targetUser.username} was woken up (${moveCount} moves), but there was an issue returning them to the original channel.`)
                                .setTimestamp();

                            await interaction.editReply({ embeds: [errorEmbed] });
                        }
                    } else {
                        // Continue moving after a short delay
                        setTimeout(moveUser, 500); // 500ms between moves for reliability
                    }
                } catch (error) {
                    console.error('Error during wakeup move:', error);
                    
                    // Try to return user to original channel on error
                    try {
                        const currentMember = await interaction.guild.members.fetch(targetUser.id);
                        if (currentMember.voice.channel) {
                            await currentMember.voice.setChannel(originalChannel);
                        }
                        
                        const errorEmbed = new EmbedBuilder()
                            .setColor(colors.ERROR)
                            .setTitle('⚠️ Wakeup Error')
                            .setDescription(`Error occurred during wakeup after ${moveCount} moves. User returned to original channel.`)
                            .setTimestamp();

                        await interaction.editReply({ embeds: [errorEmbed] });

                    } catch (returnError) {
                        console.error('Error returning user after move error:', returnError);
                        
                        const finalErrorEmbed = new EmbedBuilder()
                            .setColor(colors.ERROR)
                            .setTitle('❌ Wakeup Failed')
                            .setDescription(`Wakeup failed after ${moveCount} moves and could not return user to original channel.`)
                            .setTimestamp();

                        await interaction.editReply({ embeds: [finalErrorEmbed] });
                    }
                }
            };

            // Start the aggressive moving
            moveUser();

        } catch (error) {
            console.error('Error in wakeup command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('❌ Error')
                .setDescription('An error occurred while trying to wake up the user.')
                .setTimestamp();

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};
