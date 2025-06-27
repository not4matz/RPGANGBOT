/**
 * Leveling system utilities
 */

// XP configuration
const CONFIG = {
    XP_PER_MESSAGE: 1,
    XP_PER_VOICE_MINUTE: 5,
    MESSAGE_COOLDOWN: 300000, // 5 minute cooldown between message XP gains
    VOICE_INTERVAL: 60000,   // 1 minute intervals for voice XP
    BASE_XP: 35,             // XP needed for level 2
    MULTIPLIER: 1.041        // Exponential multiplier (1.041x growth per level)
};

/**
 * Calculate XP needed for a specific level
 * @param {number} level - Target level
 * @returns {number} - Total XP needed for that level
 */
function getXPForLevel(level) {
    if (level <= 1) return 0;
    
    // Exponential XP system: Each level requires exponentially more XP
    // Level 2: 100 XP
    // Level 3: 100 + 150 = 250 XP  
    // Level 4: 250 + 225 = 475 XP
    // Level 5: 475 + 337.5 = 812.5 XP (rounded to 813)
    // Formula: Sum of (BASE_XP * MULTIPLIER^(i-2)) for i from 2 to level
    
    let totalXP = 0;
    for (let i = 2; i <= level; i++) {
        totalXP += Math.floor(CONFIG.BASE_XP * Math.pow(CONFIG.MULTIPLIER, i - 2));
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
    // Easter egg: Special user always shows level -69
    if (userId === '1362836529008869587') {
        return -69;
    }
    
    if (xp < CONFIG.BASE_XP) return 1;
    
    // Find the highest level where required XP <= current XP
    let level = 1;
    while (getXPForLevel(level + 1) <= xp) {
        level++;
        // Safety check to prevent infinite loops for very high XP
        if (level > 200) break;
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
 * Create progress bar - Purple aesthetic theme
 * @param {number} current - Current value
 * @param {number} max - Maximum value
 * @param {number} length - Length of progress bar
 * @returns {string} - Progress bar string
 */
function createProgressBar(current, max, length = 10) {
    // Safety checks to prevent negative values
    const safeCurrent = Math.max(0, current || 0);
    const safeMax = Math.max(1, max || 1); // Ensure max is at least 1 to prevent division by zero
    const safeLength = Math.max(1, length || 10);
    
    const progress = Math.min(safeCurrent / safeMax, 1);
    const filled = Math.floor(progress * safeLength);
    const empty = Math.max(0, safeLength - filled); // Ensure non-negative
    
    // Purple-themed progress bar
    return '🟣'.repeat(filled) + '⚫'.repeat(empty);
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
    // Easter egg: Special red for level -69
    if (level === -69) return '#ff0000';
    
    // Purple gradient theme
    if (level >= 100) return '#4B0082'; // Indigo for 100+
    if (level >= 75) return '#6A0DAD';  // Purple for 75+
    if (level >= 50) return '#8A2BE2';  // Blue Violet for 50+
    if (level >= 25) return '#9932CC';  // Dark Orchid for 25+
    if (level >= 10) return '#BA55D3';  // Medium Orchid for 10+
    if (level >= 5) return '#DA70D6';   // Orchid for 5+
    return '#DDA0DD';                   // Plum for <5
}

/**
 * Get level badge emoji - Purple aesthetic theme
 * @param {number} level - User level
 * @returns {string} - Emoji badge
 */
function getLevelBadge(level) {
    // Easter egg: Special skull for level -69
    if (level === -69) return '💀';
    
    // Purple-themed badges
    if (level >= 100) return '👑'; // Crown for 100+
    if (level >= 75) return '💎';  // Diamond for 75+
    if (level >= 50) return '🔮';  // Crystal ball for 50+
    if (level >= 25) return '💜';  // Purple heart for 25+
    if (level >= 10) return '🌟';  // Star for 10+
    if (level >= 5) return '✨';   // Sparkles for 5+
    return '🟣';                   // Purple circle for <5
}

/**
 * Validate and fix user level data consistency
 * @param {object} userData - User data from database
 * @returns {object} - Corrected user data
 */
function validateUserData(userData) {
    if (!userData) return null;
    
    // Skip validation for easter egg user to avoid console warnings
    if (userData.user_id === '1362836529008869587') {
        return userData;
    }
    
    // Calculate what level the user should be based on their XP (with easter egg support)
    const correctLevel = getLevelFromXP(userData.xp, userData.user_id);
    
    // If the stored level is incorrect, return corrected data
    // Note: Easter egg users (level -69) are handled by getLevelFromXP, so this will work correctly
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
    getLevelBadge,
    validateUserData
};
