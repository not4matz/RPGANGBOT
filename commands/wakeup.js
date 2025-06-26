const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

// Voice channel IDs for wakeup
const WAKEUP_CHANNELS = [
    '1292438962161320008',
    '1327435099867709521'
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wakeup')
        .setDescription('Wake up a user by moving them between voice channels')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to wake up')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const guildId = interaction.guild.id;

            // Check if the target user has wakeup permissions
            const permissions = await database.getWakeupPermissions(targetUser.id, guildId);
            if (!permissions || !permissions.allowed) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Permission Denied')
                    .setDescription(`${targetUser.username} has not allowed wakeup commands.\nThey need to be added with \`/allowwakeup\` first.`)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Get the target user's voice state
            const member = await interaction.guild.members.fetch(targetUser.id);
            if (!member.voice.channel) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ User Not in Voice')
                    .setDescription(`${targetUser.username} is not currently in a voice channel.`)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const originalChannel = member.voice.channel;

            // Check if bot has permission to move members
            if (!interaction.guild.members.me.permissions.has('MoveMembers')) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
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
                    .setColor('#ff0000')
                    .setTitle('❌ Channels Not Found')
                    .setDescription('One or both wakeup channels could not be found.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Start the wakeup process
            const embed = new EmbedBuilder()
                .setColor('#ffff00')
                .setTitle('⏰ Waking Up User')
                .setDescription(`Starting wakeup sequence for ${targetUser.username}...\nMoving between channels for 10 seconds.`)
                .addFields(
                    { name: 'Original Channel', value: originalChannel.name, inline: true },
                    { name: 'Wakeup Channels', value: `${channel1.name}\n${channel2.name}`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

            // Move user between channels for 10 seconds
            let currentChannel = 0;
            const moveInterval = setInterval(async () => {
                try {
                    const channelToMoveTo = currentChannel === 0 ? channel1 : channel2;
                    await member.voice.setChannel(channelToMoveTo);
                    currentChannel = currentChannel === 0 ? 1 : 0;
                } catch (error) {
                    console.error('Error moving user during wakeup:', error);
                }
            }, 500); // Move every 500ms (0.5 seconds)

            // Stop after 10 seconds and move back to original channel
            setTimeout(async () => {
                clearInterval(moveInterval);
                
                try {
                    // Move back to original channel
                    await member.voice.setChannel(originalChannel);

                    // Update the embed to show completion
                    const completedEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Wakeup Complete')
                        .setDescription(`${targetUser.username} has been woken up and returned to ${originalChannel.name}.`)
                        .addFields(
                            { name: 'Duration', value: '10 seconds', inline: true },
                            { name: 'Status', value: 'Completed successfully', inline: true }
                        )
                        .setTimestamp();

                    await interaction.editReply({ embeds: [completedEmbed] });

                } catch (error) {
                    console.error('Error returning user to original channel:', error);
                    
                    const errorEmbed = new EmbedBuilder()
                        .setColor('#ff0000')
                        .setTitle('⚠️ Wakeup Completed with Issues')
                        .setDescription(`${targetUser.username} was woken up, but there was an issue returning them to the original channel.`)
                        .setTimestamp();

                    await interaction.editReply({ embeds: [errorEmbed] });
                }
            }, 10000); // 10 seconds

        } catch (error) {
            console.error('Error in wakeup command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
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
