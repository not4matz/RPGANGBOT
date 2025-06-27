/**
 * Leveling system utilities - Cleaned and optimized
 */

const LEVELING_CONFIG = require('../config/levelingConfig');

// Legacy CONFIG export for backward compatibility
const CONFIG = {
    XP_PER_MESSAGE: LEVELING_CONFIG.XP_PER_MESSAGE,
    XP_PER_VOICE_MINUTE: LEVELING_CONFIG.XP_PER_VOICE_MINUTE,
    MESSAGE_COOLDOWN: LEVELING_CONFIG.MESSAGE_COOLDOWN,
    VOICE_INTERVAL: LEVELING_CONFIG.VOICE_INTERVAL,
    BASE_XP: LEVELING_CONFIG.BASE_XP,
    MULTIPLIER: LEVELING_CONFIG.MULTIPLIER
};

/**
 * Calculate XP needed for a specific level
 * @param {number} level - Target level
 * @returns {number} - Total XP needed for that level
 */
function getXPForLevel(level) {
    if (level <= 1) return 0;
    
    // Exponential XP system using centralized config
    let totalXP = 0;
    for (let i = 2; i <= level; i++) {
        totalXP += Math.floor(LEVELING_CONFIG.BASE_XP * Math.pow(LEVELING_CONFIG.MULTIPLIER, i - 2));
    }
    return totalXP;
}

/**
 * Calculate level from total XP with easter egg support
 * @param {number} xp - Total XP
 * @param {string} userId - User ID for easter egg check
 * @returns {number} - Current level (or easter egg level)
 */
function getLevelFromXP(xp, userId = null) {
    // Easter egg: Special user always shows configured easter egg level
    if (userId === LEVELING_CONFIG.EASTER_EGG_USER_ID) {
        return LEVELING_CONFIG.EASTER_EGG_LEVEL;
    }
    
    if (xp < LEVELING_CONFIG.BASE_XP) return 1;
    
    // Find the highest level where required XP <= current XP
    let level = 1;
    while (getXPForLevel(level + 1) <= xp) {
        level++;
        // Safety check to prevent infinite loops for very high XP
        if (level > LEVELING_CONFIG.MAX_LEVEL_SAFETY) break;
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
    const xpInCurrentLevel = Math.max(0, currentXP - currentLevelXP); // Ensure non-negative
    const xpNeededForNext = nextLevelXP - currentLevelXP;
    const xpRemaining = Math.max(0, nextLevelXP - currentXP); // Ensure non-negative
    
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
    return LEVELING_CONFIG.XP_PER_MESSAGE;
}

/**
 * Generate voice XP amount
 * @returns {number} - Fixed XP for voice activity
 */
function generateVoiceXP() {
    return LEVELING_CONFIG.XP_PER_VOICE_MINUTE;
}

/**
 * Check if user can gain message XP (cooldown check)
 * @param {number} lastMessageTime - Timestamp of last message
 * @returns {boolean} - True if user can gain XP
 */
function canGainMessageXP(lastMessageTime) {
    return Date.now() - lastMessageTime >= LEVELING_CONFIG.MESSAGE_COOLDOWN;
}

/**
 * Create progress bar - Purple aesthetic theme
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {number} length - Length of progress bar
 * @returns {string} - Progress bar string
 */
function createProgressBar(current, max, length = LEVELING_CONFIG.PROGRESS_BAR_LENGTH) {
    // Safety checks to prevent negative values
    const safeCurrent = Math.max(0, current || 0);
    const safeMax = Math.max(1, max || 1); // Ensure max is at least 1 to prevent division by zero
    const safeLength = Math.max(1, length || LEVELING_CONFIG.PROGRESS_BAR_LENGTH);
    
    const progress = Math.min(safeCurrent / safeMax, 1);
    const filled = Math.floor(progress * safeLength);
    const empty = Math.max(0, safeLength - filled); // Ensure non-negative
    
    // Purple-themed progress bar using config
    return LEVELING_CONFIG.PROGRESS_BAR_FILLED.repeat(filled) + LEVELING_CONFIG.PROGRESS_BAR_EMPTY.repeat(empty);
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
 * Get level color based on level - Purple aesthetic theme
 * @param {number} level - User level
 * @returns {string} - Hex color code
 */
function getLevelColor(level) {
    // Easter egg: Special color for easter egg level
    if (level === LEVELING_CONFIG.EASTER_EGG_LEVEL) return LEVELING_CONFIG.LEVEL_COLORS.EASTER_EGG;
    
    // Purple gradient theme using centralized config
    if (level >= 100) return LEVELING_CONFIG.LEVEL_COLORS.LEVEL_100_PLUS;
    if (level >= 75) return LEVELING_CONFIG.LEVEL_COLORS.LEVEL_75_PLUS;
    if (level >= 50) return LEVELING_CONFIG.LEVEL_COLORS.LEVEL_50_PLUS;
    if (level >= 25) return LEVELING_CONFIG.LEVEL_COLORS.LEVEL_25_PLUS;
    if (level >= 10) return LEVELING_CONFIG.LEVEL_COLORS.LEVEL_10_PLUS;
    if (level >= 5) return LEVELING_CONFIG.LEVEL_COLORS.LEVEL_5_PLUS;
    return LEVELING_CONFIG.LEVEL_COLORS.LEVEL_DEFAULT;
}

/**
 * Get level badge emoji - Purple aesthetic theme
 * @param {number} level - User level
 * @returns {string} - Emoji badge
 */
function getLevelBadge(level) {
    // Easter egg: Special badge for easter egg level
    if (level === LEVELING_CONFIG.EASTER_EGG_LEVEL) return LEVELING_CONFIG.LEVEL_BADGES.EASTER_EGG;
    
    // Purple-themed badges using centralized config
    if (level >= 100) return LEVELING_CONFIG.LEVEL_BADGES.LEVEL_100_PLUS;
    if (level >= 75) return LEVELING_CONFIG.LEVEL_BADGES.LEVEL_75_PLUS;
    if (level >= 50) return LEVELING_CONFIG.LEVEL_BADGES.LEVEL_50_PLUS;
    if (level >= 25) return LEVELING_CONFIG.LEVEL_BADGES.LEVEL_25_PLUS;
    if (level >= 10) return LEVELING_CONFIG.LEVEL_BADGES.LEVEL_10_PLUS;
    if (level >= 5) return LEVELING_CONFIG.LEVEL_BADGES.LEVEL_5_PLUS;
    return LEVELING_CONFIG.LEVEL_BADGES.LEVEL_DEFAULT;
}

/**
 * Validate and fix user level data consistency
 * @param {object} userData - User data from database
 * @returns {object} - Corrected user data
 */
function validateUserData(userData) {
    if (!userData) return null;
    
    // Skip validation for easter egg user to avoid console warnings
    if (userData.user_id === LEVELING_CONFIG.EASTER_EGG_USER_ID) {
        return userData;
    }
    
    // Calculate what level the user should be based on their XP (with easter egg support)
    const correctLevel = getLevelFromXP(userData.xp, userData.user_id);
    
    // If the stored level is incorrect, return corrected data
    if (userData.level !== correctLevel) {
        console.log(`⚠️ Level inconsistency detected for user ${userData.user_id}: stored level ${userData.level}, should be ${correctLevel} (XP: ${userData.xp})`);
        return {
            ...userData,
            level: correctLevel
        };
    }
    
    return userData;
}

module.exports = {
    CONFIG, // Legacy export for backward compatibility
    LEVELING_CONFIG, // New centralized config
    getXPForLevel,
    getLevelFromXP,
    getXPProgress,
    generateMessageXP,
    generateVoiceXP,
    canGainMessageXP,
    createProgressBar,
    formatXP,
    getLevelColor,
    getLevelBadge,
    validateUserData
};
