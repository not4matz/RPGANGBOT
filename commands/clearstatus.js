const { SlashCommandBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearstatus')
        .setDescription('🧹 Clear the bot status (Owner only)'),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        try {
            // Restore member count status
            if (interaction.client.updateMemberCountStatus) {
                interaction.client.updateMemberCountStatus(interaction.client);
            } else {
                // Fallback if function not available
                await interaction.client.user.setActivity(null);
            }

            await interaction.reply({
                content: ' **Status restored to default!**\nThe bot is now showing the member count again.',
                ephemeral: true
            });

            console.log(` Bot status restored to member count by ${interaction.user.tag}`);

        } catch (error) {
            console.error('Error restoring bot status:', error);
            await interaction.reply({
                content: ' Failed to restore bot status!',
                ephemeral: true
            });
        }
    },
};
