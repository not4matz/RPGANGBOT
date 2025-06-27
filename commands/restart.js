const { SlashCommandBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('restart')
        .setDescription('🔄 Restart the bot (Owner only)'),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        try {
            await interaction.reply({
                content: '🔄 Restarting bot...',
                ephemeral: true
            });

            console.log(`🔄 Bot restart initiated by owner: ${interaction.user.tag}`);
            
            // Give a moment for the reply to send
            setTimeout(() => {
                process.exit(0); // Exit the process (assuming you have a process manager to restart it)
            }, 1000);

        } catch (error) {
            console.error('Error during restart:', error);
            await interaction.editReply({
                content: '❌ Failed to restart the bot!'
            });
        }
    },
};
