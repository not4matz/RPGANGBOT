/**
 * Leveling system utilities
 */

// XP configuration
const CONFIG = {
    XP_PER_MESSAGE: 5,
    XP_PER_VOICE_MINUTE: 5,
    MESSAGE_COOLDOWN: 60000, // 1 minute cooldown between message XP gains
    VOICE_INTERVAL: 60000,   // 1 minute intervals for voice XP
    BASE_XP: 50,             // XP needed for level 2
    XP_INCREMENT: 50         // Additional XP needed per level
};

/**
 * Calculate XP needed for a specific level
 * @param {number} level - Target level
 * @returns {number} - Total XP needed for that level
 */
function getXPForLevel(level) {
    if (level <= 1) return 0;
    
    // Cumulative XP system: Level 2 = 50, Level 3 = 100, Level 4 = 200, Level 5 = 350, etc.
    // Each level requires: 50 * level_number XP to advance
    // Formula: Sum of (50 * i) for i from 1 to (level-1)
    // This equals: 50 * (level-1) * level / 2
    return CONFIG.BASE_XP * (level - 1) * level / 2;
}

/**
 * Calculate level from total XP
 * @param {number} xp - Total XP
 * @returns {number} - Current level
 */
function getLevelFromXP(xp) {
    if (xp < CONFIG.BASE_XP) return 1;
    
    // Since XP requirement grows, we need to find the level by iteration
    let level = 1;
    while (getXPForLevel(level + 1) <= xp) {
        level++;
    }
    return level;
}

/**
 * Get XP needed for next level
 * @param {number} currentXP - Current XP
 * @param {number} currentLevel - Current level
 * @returns {object} - Object with current progress and XP needed
 */
function getXPProgress(currentXP, currentLevel) {
    const currentLevelXP = getXPForLevel(currentLevel);
    const nextLevelXP = getXPForLevel(currentLevel + 1);
    const xpInCurrentLevel = currentXP - currentLevelXP;
    const xpNeededForNext = nextLevelXP - currentLevelXP;
    const xpRemaining = nextLevelXP - currentXP;
    
    return {
        currentLevelXP: xpInCurrentLevel,
        xpNeededForNext,
        xpRemaining,
        progress: Math.floor((xpInCurrentLevel / xpNeededForNext) * 100)
    };
}

/**
 * Generate message XP amount
 * @returns {number} - Fixed XP for messages
 */
function generateMessageXP() {
    return CONFIG.XP_PER_MESSAGE;
}

/**
 * Generate voice XP amount
 * @returns {number} - Fixed XP for voice activity
 */
function generateVoiceXP() {
    return CONFIG.XP_PER_VOICE_MINUTE;
}

/**
 * Check if user can gain message XP (cooldown check)
 * @param {number} lastMessageTime - Timestamp of last message
 * @returns {boolean} - True if user can gain XP
 */
function canGainMessageXP(lastMessageTime) {
    return Date.now() - lastMessageTime >= CONFIG.MESSAGE_COOLDOWN;
}

/**
 * Create a progress bar
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {number} length - Length of progress bar
 * @returns {string} - Progress bar string
 */
function createProgressBar(current, max, length = 10) {
    const progress = Math.min(current / max, 1);
    const filled = Math.floor(progress * length);
    const empty = length - filled;
    
    return '█'.repeat(filled) + '░'.repeat(empty);
}

/**
 * Format XP number with commas
 * @param {number} xp - XP amount
 * @returns {string} - Formatted XP string
 */
function formatXP(xp) {
    return xp.toLocaleString();
}

/**
 * Get level color based on level
 * @param {number} level - User level
 * @returns {string} - Hex color code
 */
function getLevelColor(level) {
    if (level >= 100) return '#ff0000'; // Red for 100+
    if (level >= 75) return '#ff4500';  // Orange Red for 75+
    if (level >= 50) return '#ffa500';  // Orange for 50+
    if (level >= 25) return '#ffff00';  // Yellow for 25+
    if (level >= 10) return '#00ff00';  // Green for 10+
    if (level >= 5) return '#00ffff';   // Cyan for 5+
    return '#5865f2';                   // Discord blue for <5
}

/**
 * Get level badge emoji
 * @param {number} level - User level
 * @returns {string} - Emoji badge
 */
function getLevelBadge(level) {
    if (level >= 100) return '👑'; // Crown for 100+
    if (level >= 75) return '💎';  // Diamond for 75+
    if (level >= 50) return '🏆';  // Trophy for 50+
    if (level >= 25) return '🥇';  // Gold medal for 25+
    if (level >= 10) return '🥈';  // Silver medal for 10+
    if (level >= 5) return '🥉';   // Bronze medal for 5+
    return '🌟';                   // Star for <5
}

module.exports = {
    CONFIG,
    getXPForLevel,
    getLevelFromXP,
    getXPProgress,
    generateMessageXP,
    generateVoiceXP,
    canGainMessageXP,
    createProgressBar,
    formatXP,
    getLevelColor,
    getLevelBadge
};
