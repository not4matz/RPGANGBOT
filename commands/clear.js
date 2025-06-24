const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('🔒 [OWNER ONLY] Delete a specified number of messages')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Number of messages to delete (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        const amount = interaction.options.getInteger('amount');

        // Check if user has permission
        if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({ 
                content: '❌ You need the "Manage Messages" permission to use this command!', 
                ephemeral: true 
            });
        }

        // Check if bot has permission
        if (!interaction.guild.members.me.permissions.has(PermissionFlagsBits.ManageMessages)) {
            return await interaction.reply({ 
                content: '❌ I need the "Manage Messages" permission to delete messages!', 
                ephemeral: true 
            });
        }

        try {
            await interaction.deferReply({ ephemeral: true });
            
            const deleted = await interaction.channel.bulkDelete(amount, true);
            
            await interaction.editReply({ 
                content: `✅ Successfully deleted ${deleted.size} message(s)!` 
            });
            
            // Auto-delete the confirmation message after 5 seconds
            setTimeout(async () => {
                try {
                    await interaction.deleteReply();
                } catch (error) {
                    // Ignore errors if message is already deleted
                }
            }, 5000);
            
        } catch (error) {
            console.error('Error deleting messages:', error);
            await interaction.editReply({ 
                content: '❌ There was an error trying to delete messages! Messages older than 14 days cannot be bulk deleted.' 
            });
        }
    },
};
