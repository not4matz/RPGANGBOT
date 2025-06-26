/**
 * Purple-Black Color Scheme for Discord Bot
 * Consistent color palette across all commands and embeds
 */

module.exports = {
    // Primary Colors
    PRIMARY: '#6A0DAD',        // Deep Purple
    SECONDARY: '#4B0082',      // Indigo
    ACCENT: '#9932CC',         // Dark Orchid
    
    // Status Colors
    SUCCESS: '#8A2BE2',        // Blue Violet (success with purple tint)
    WARNING: '#9370DB',        // Medium Purple (warnings)
    ERROR: '#4B0082',          // Indigo (errors - darker purple)
    INFO: '#7B68EE',           // Medium Slate Blue (info)
    
    // Special Colors
    LEVEL_UP: '#DA70D6',       // Orchid (level up celebrations)
    XP_PROGRESS: '#9370DB',    // Medium Purple (XP progress bars)
    LEADERBOARD: '#6A0DAD',    // Deep Purple (leaderboards)
    
    // Dark Theme Colors
    DARK_PRIMARY: '#2E0854',   // Very Dark Purple
    DARK_SECONDARY: '#1A0033', // Almost Black Purple
    BLACK: '#000000',          // Pure Black
    
    // Utility Colors
    TRANSPARENT: '#2C2F33',    // Discord Dark Theme Background
    EMBED_BORDER: '#6A0DAD',   // Primary purple for embed borders
    
    // Gradient Colors (for special effects)
    GRADIENT_START: '#6A0DAD',
    GRADIENT_END: '#4B0082',
    
    // Get random purple shade
    getRandomPurple() {
        const purples = [
            '#6A0DAD', '#4B0082', '#9932CC', '#8A2BE2', 
            '#9370DB', '#7B68EE', '#DA70D6', '#BA55D3'
        ];
        return purples[Math.floor(Math.random() * purples.length)];
    },
    
    // Get color by status
    getStatusColor(status) {
        switch(status.toLowerCase()) {
            case 'success': return this.SUCCESS;
            case 'error': return this.ERROR;
            case 'warning': return this.WARNING;
            case 'info': return this.INFO;
            default: return this.PRIMARY;
        }
    }
};
