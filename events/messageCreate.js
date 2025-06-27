/**
 * Message XP tracking event - Cleaned and optimized
 */

const { EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { generateMessageXP, canGainMessageXP, getLevelFromXP, validateUserData } = require('../utils/leveling');
const { sendLevelUpMessage } = require('../utils/levelUpMessages');
const LEVELING_CONFIG = require('../config/levelingConfig');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Skip bots, system messages, DMs, and commands
        if (message.author.bot || 
            message.system || 
            !message.guild || 
            message.content.startsWith('/')) {
            return;
        }

        try {
            const userId = message.author.id;
            const guildId = message.guild.id;
            
            // Get user data from database
            let userData = await database.getUser(userId, guildId);
            
            // Auto-register user if not in database
            if (!userData) {
                await database.upsertUser(userId, guildId, 0);
                userData = await database.getUser(userId, guildId);
            }
            
            // Validate and fix data consistency
            userData = validateUserData(userData);
            if (!userData) {
                console.error(`❌ Failed to validate user data for ${message.author.tag}`);
                return;
            }
            
            // Check cooldown using centralized config
            if (!canGainMessageXP(userData.last_message_time || 0)) {
                return; // User is on cooldown
            }
            
            // Generate XP using centralized function
            const xpGain = generateMessageXP();
            const newXP = userData.xp + xpGain;
            
            // Calculate levels (with easter egg support)
            const oldLevel = getLevelFromXP(userData.xp, userId);
            const newLevel = getLevelFromXP(newXP, userId);
            
            // Update database with new XP and message count
            await database.addXP(userId, guildId, xpGain);
            await database.incrementMessageCount(userId, guildId);
            
            // Check for level up
            if (newLevel > oldLevel) {
                console.log(`🎉 ${message.author.tag} leveled up from ${oldLevel} to ${newLevel} via message XP`);
                
                // Get updated user data for level-up message
                const updatedUserData = await database.getUser(userId, guildId);
                const member = message.guild.members.cache.get(userId);
                
                if (member && updatedUserData) {
                    // Use centralized level-up message system
                    await sendLevelUpMessage(
                        message.guild, 
                        member, 
                        newLevel, 
                        updatedUserData, 
                        'message',
                        message.channel // Use current channel as fallback
                    );
                }
            }
            
        } catch (error) {
            console.error('❌ Error in messageCreate event:', error);
        }
    }
};
