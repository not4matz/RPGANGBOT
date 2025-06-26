const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const colors = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('💜 Delete a specified number of messages from the channel')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        const amount = interaction.options.getInteger('amount');
        
        // Check if user has permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const noPermEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('🔒 Permission Denied')
                .setDescription('You need the **Manage Messages** permission to use this command.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [noPermEmbed], ephemeral: true });
        }
        
        // Check if bot has permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            const botNoPermEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('❌ Bot Missing Permissions')
                .setDescription('I need the **Manage Messages** permission to delete messages.')
                .setTimestamp();
            
            return await interaction.reply({ embeds: [botNoPermEmbed], ephemeral: true });
        }

        try {
            // Delete messages
            const deleted = await interaction.channel.bulkDelete(amount, true);
            
            const successEmbed = new EmbedBuilder()
                .setColor(colors.SUCCESS)
                .setTitle('🧹 Messages Cleared')
                .setDescription(`Successfully deleted **${deleted.size}** messages from this channel.`)
                .addFields(
                    { name: '📊 Requested', value: `${amount} messages`, inline: true },
                    { name: '✅ Deleted', value: `${deleted.size} messages`, inline: true },
                    { name: '👤 Moderator', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setFooter({ text: 'Purple Bot Moderation System' })
                .setTimestamp();

            // Send confirmation and auto-delete after 5 seconds
            const reply = await interaction.reply({ embeds: [successEmbed] });
            
            setTimeout(async () => {
                try {
                    await reply.delete();
                } catch (error) {
                    console.log('Could not delete clear confirmation message:', error.message);
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error clearing messages:', error);
            
            let errorMessage = 'An error occurred while trying to delete messages.';
            
            if (error.code === 50034) {
                errorMessage = 'Cannot delete messages older than 14 days.';
            } else if (error.code === 50013) {
                errorMessage = 'Missing permissions to delete messages.';
            }
            
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('❌ Clear Failed')
                .setDescription(errorMessage)
                .addFields({
                    name: '💡 Tip',
                    value: 'Messages older than 14 days cannot be bulk deleted by Discord bots.',
                    inline: false
                })
                .setTimestamp();
            
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
