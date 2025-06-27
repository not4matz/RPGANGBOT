/**
 * Centralized Leveling System Configuration
 * All leveling-related constants and settings in one place
 */

const LEVELING_CONFIG = {
    // XP Configuration
    XP_PER_MESSAGE: 1,
    XP_PER_VOICE_MINUTE: 5,
    MESSAGE_COOLDOWN: 300000, // 5 minutes in milliseconds
    VOICE_INTERVAL: 60000,    // 1 minute in milliseconds
    
    // Level Calculation
    BASE_XP: 35,              // XP needed for level 2
    MULTIPLIER: 1.041,        // Exponential multiplier (1.041x growth per level)
    MAX_LEVEL_SAFETY: 200,    // Safety cap to prevent infinite loops
    
    // Channel Configuration
    LEVEL_UP_CHANNEL_ID: process.env.LEVEL_UP_CHANNEL_ID || '1361198962488381490',
    
    // Easter Egg Configuration
    EASTER_EGG_USER_ID: process.env.EASTER_EGG_USER_ID || '1362836529008869587',
    EASTER_EGG_LEVEL: -69,
    
    // Voice XP Abuse Prevention
    MAX_VOICE_MINUTES_PER_INTERVAL: 5, // Cap XP gain to prevent abuse
    VOICE_XP_CAP_HOURS: 24,           // 24-hour maximum for safety
    
    // Progress Bar Configuration
    PROGRESS_BAR_LENGTH: 10,
    PROGRESS_BAR_FILLED: '🟣',        // Purple circle
    PROGRESS_BAR_EMPTY: '⚫',          // Black circle
    
    // Purple Theme Colors (Level-based gradient)
    LEVEL_COLORS: {
        EASTER_EGG: '#ff0000',        // Red for easter egg
        LEVEL_100_PLUS: '#4B0082',    // Indigo for 100+
        LEVEL_75_PLUS: '#6A0DAD',     // Purple for 75+
        LEVEL_50_PLUS: '#8A2BE2',     // Blue Violet for 50+
        LEVEL_25_PLUS: '#9932CC',     // Dark Orchid for 25+
        LEVEL_10_PLUS: '#BA55D3',     // Medium Orchid for 10+
        LEVEL_5_PLUS: '#DA70D6',      // Orchid for 5+
        LEVEL_DEFAULT: '#DDA0DD'      // Plum for <5
    },
    
    // System Colors
    SUCCESS_COLOR: '#00ff00',         // Green for success messages
    ERROR_COLOR: '#ff0000',           // Red for error messages
    
    // Purple Theme Badges (Level-based)
    LEVEL_BADGES: {
        EASTER_EGG: '💀',             // Skull for easter egg
        LEVEL_100_PLUS: '👑',         // Crown for 100+
        LEVEL_75_PLUS: '💎',          // Diamond for 75+
        LEVEL_50_PLUS: '🔮',          // Crystal ball for 50+
        LEVEL_25_PLUS: '💜',          // Purple heart for 25+
        LEVEL_10_PLUS: '🌟',          // Star for 10+
        LEVEL_5_PLUS: '✨',           // Sparkles for 5+
        LEVEL_DEFAULT: '🟣'           // Purple circle for <5
    },
    
    // Embed Branding
    EMBED_FOOTER_TEXT: 'Purple Bot • Leveling System',
    EMBED_FOOTER_VOICE_TEXT: 'Purple Bot • Voice Activity Leveling',
    
    // Fallback Channel Search Terms (in order of preference)
    FALLBACK_CHANNEL_NAMES: [
        'general',
        'chat',
        'main',
        'lobby',
        'welcome'
    ]
};

module.exports = LEVELING_CONFIG;
