const { SlashCommandBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('clearstatus')
        .setDescription('🔒 [OWNER ONLY] Clear the bot\'s activity status'),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        try {
            // Clear the activity by setting it to null
            await interaction.client.user.setActivity(null);

            await interaction.reply({
                content: '✅ **Bot status cleared!**\nThe bot no longer shows any activity.',
                ephemeral: true
            });

            console.log(`🎭 Bot status cleared by ${interaction.user.tag}`);

        } catch (error) {
            console.error('Error clearing bot status:', error);
            await interaction.reply({
                content: '❌ Failed to clear bot status!',
                ephemeral: true
            });
        }
    },
};
