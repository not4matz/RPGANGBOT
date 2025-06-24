/**
 * Owner verification utility for Discord bot commands
 */

/**
 * Check if a user is the bot owner
 * @param {string} userId - The Discord user ID to check
 * @returns {boolean} - True if user is the bot owner
 */
function isOwner(userId) {
    const ownerId = process.env.BOT_OWNER_ID;
    
    if (!ownerId) {
        console.warn('⚠️ BOT_OWNER_ID not set in environment variables!');
        return false;
    }
    
    return userId === ownerId;
}

/**
 * Owner-only command wrapper
 * Checks if the user is the bot owner before executing the command
 * @param {Object} interaction - Discord interaction object
 * @param {Function} commandFunction - The command function to execute if user is owner
 */
async function ownerOnly(interaction, commandFunction) {
    if (!isOwner(interaction.user.id)) {
        return await interaction.reply({
            content: '🔒 This command is restricted to the bot owner only!',
            ephemeral: true
        });
    }
    
    return await commandFunction(interaction);
}

/**
 * Create an owner-only command check middleware
 * @param {Object} interaction - Discord interaction object
 * @returns {boolean} - True if user is owner, false otherwise (and sends error message)
 */
async function checkOwner(interaction) {
    if (!isOwner(interaction.user.id)) {
        await interaction.reply({
            content: '🔒 This command is restricted to the bot owner only!',
            ephemeral: true
        });
        return false;
    }
    return true;
}

module.exports = {
    isOwner,
    ownerOnly,
    checkOwner
};
