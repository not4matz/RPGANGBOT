/**
 * Voice XP Tracking System - Cleaned and optimized
 * Handles automatic XP gain for users in voice channels
 */

const { EmbedBuilder } = require('discord.js');
const database = require('./database');
const { generateVoiceXP, getLevelFromXP, validateUserData } = require('./leveling');
const { sendLevelUpMessage } = require('./levelUpMessages');
const LEVELING_CONFIG = require('../config/levelingConfig');

class VoiceXPTracker {
    constructor(client) {
        this.client = client;
        this.isRunning = false;
        this.intervalId = null;
    }

    /**
     * Start the voice XP tracking system
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Voice XP tracker is already running');
            return;
        }

        console.log('🎤 Starting Voice XP tracker...');
        this.isRunning = true;
        
        // Check for users already in voice channels on startup
        this.checkStartupVoiceUsers();
        
        // Start the interval timer using centralized config
        this.intervalId = setInterval(() => {
            this.processAllGuilds();
        }, LEVELING_CONFIG.VOICE_INTERVAL);
        
        console.log(`✅ Voice XP tracker started (${LEVELING_CONFIG.VOICE_INTERVAL / 1000}s intervals)`);
    }

    /**
     * Stop the voice XP tracking system
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Voice XP tracker is not running');
            return;
        }

        console.log('🛑 Stopping Voice XP tracker...');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        
        console.log('✅ Voice XP tracker stopped');
    }

    /**
     * Check for users already in voice channels on bot startup
     * Prevents XP loss after bot restarts
     */
    async checkStartupVoiceUsers() {
        console.log('🔍 Checking for users already in voice channels...');
        let totalUsersFound = 0;
        let totalUsersRegistered = 0;

        try {
            for (const guild of this.client.guilds.cache.values()) {
                let guildUsersFound = 0;
                let guildUsersRegistered = 0;

                for (const channel of guild.channels.cache.values()) {
                    if (channel.isVoiceBased() && channel.members.size > 0) {
                        for (const member of channel.members.values()) {
                            if (member.user.bot) continue;
                            
                            guildUsersFound++;
                            totalUsersFound++;

                            // Skip if user is muted/deafened or alone
                            if (member.voice.mute || member.voice.deaf || 
                                member.voice.selfMute || member.voice.selfDeaf) {
                                continue;
                            }
                            
                            if (channel.members.filter(m => !m.user.bot).size <= 1) {
                                continue;
                            }

                            // Always reset voice join time to current time to prevent XP abuse
                            await database.updateVoiceJoinTime(member.id, guild.id, Date.now());
                            guildUsersRegistered++;
                            totalUsersRegistered++;
                        }
                    }
                }

                if (guildUsersFound > 0) {
                    console.log(`📊 ${guild.name}: Found ${guildUsersFound} users, registered ${guildUsersRegistered} for XP tracking`);
                }
            }

            console.log(`✅ Startup voice check complete: ${totalUsersFound} users found, ${totalUsersRegistered} registered for tracking`);
        } catch (error) {
            console.error('❌ Error during startup voice user check:', error);
        }
    }

    /**
     * Process voice XP for all guilds
     */
    async processAllGuilds() {
        if (!this.isRunning) return;

        try {
            for (const guild of this.client.guilds.cache.values()) {
                await this.processGuildVoiceXP(guild);
            }
        } catch (error) {
            console.error('❌ Error processing guild voice XP:', error);
        }
    }

    /**
     * Process voice XP for a specific guild
     * @param {Guild} guild - Discord guild to process
     */
    async processGuildVoiceXP(guild) {
        try {
            const usersInVoice = await database.getUsersInVoice(guild.id);
            
            for (const userData of usersInVoice) {
                const member = guild.members.cache.get(userData.user_id);
                if (!member) {
                    // User no longer in guild, clear their voice join time
                    await database.clearVoiceJoinTime(userData.user_id, guild.id);
                    continue;
                }

                // Check if user is still in a voice channel
                if (!member.voice.channel) {
                    await database.clearVoiceJoinTime(userData.user_id, guild.id);
                    continue;
                }

                // Skip if user is muted/deafened
                if (member.voice.mute || member.voice.deaf || 
                    member.voice.selfMute || member.voice.selfDeaf) {
                    continue;
                }

                // Skip if user is alone in voice channel
                if (member.voice.channel.members.filter(m => !m.user.bot).size <= 1) {
                    continue;
                }

                // Calculate time since last XP gain
                const now = Date.now();
                const lastXPTime = userData.last_voice_xp_time || userData.voice_join_time;
                
                if (now - lastXPTime >= LEVELING_CONFIG.VOICE_INTERVAL) {
                    // Calculate minutes elapsed (with safety cap)
                    const rawMinutes = Math.floor((now - lastXPTime) / 60000);
                    const cappedMinutes = Math.min(rawMinutes, LEVELING_CONFIG.MAX_VOICE_MINUTES_PER_INTERVAL);
                    
                    // Log if XP was capped to prevent abuse
                    if (rawMinutes > LEVELING_CONFIG.MAX_VOICE_MINUTES_PER_INTERVAL) {
                        console.warn(`⚠️ Voice XP capped for ${member.user.tag}: ${rawMinutes} minutes -> ${cappedMinutes} minutes`);
                    }

                    // Calculate XP gain using centralized function
                    const xpGain = generateVoiceXP() * cappedMinutes;
                    
                    // Get current user data and validate
                    let currentUserData = await database.getUser(userData.user_id, guild.id);
                    if (!currentUserData) {
                        await database.upsertUser(userData.user_id, guild.id, 0);
                        currentUserData = await database.getUser(userData.user_id, guild.id);
                    }
                    
                    currentUserData = validateUserData(currentUserData);
                    if (!currentUserData) continue;

                    // Calculate levels (with easter egg support)
                    const oldLevel = getLevelFromXP(currentUserData.xp, userData.user_id);
                    const newXP = currentUserData.xp + xpGain;
                    const newLevel = getLevelFromXP(newXP, userData.user_id);

                    // Update database with voice XP and time (single call handles everything)
                    await database.addVoiceXP(userData.user_id, guild.id, xpGain, cappedMinutes);

                    // Check for level up
                    if (newLevel > oldLevel) {
                        console.log(`🎉 ${member.user.tag} leveled up from ${oldLevel} to ${newLevel} via voice XP`);
                        
                        // Get updated user data for level-up message
                        const updatedUserData = await database.getUser(userData.user_id, guild.id);
                        
                        if (updatedUserData) {
                            // Use centralized level-up message system
                            await sendLevelUpMessage(
                                guild, 
                                member, 
                                newLevel, 
                                updatedUserData, 
                                'voice'
                            );
                        }
                    }
                }
            }
        } catch (error) {
            console.error(`❌ Error processing voice XP for guild ${guild.name}:`, error);
        }
    }

    /**
     * Emergency function to reset all voice join times
     * Used to fix bad timestamps that could cause XP abuse
     */
    async emergencyResetVoiceTimes() {
        console.log('🚨 Emergency reset of all voice join times...');
        try {
            await database.clearAllVoiceJoinTimes();
            
            // Re-register users currently in voice channels
            await this.checkStartupVoiceUsers();
            
            console.log('✅ Emergency voice time reset completed');
            return true;
        } catch (error) {
            console.error('❌ Error during emergency voice time reset:', error);
            return false;
        }
    }

    /**
     * Get tracker status information
     * @returns {object} - Status information
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            interval: LEVELING_CONFIG.VOICE_INTERVAL,
            maxMinutesPerInterval: LEVELING_CONFIG.MAX_VOICE_MINUTES_PER_INTERVAL,
            xpPerMinute: generateVoiceXP()
        };
    }
}

module.exports = VoiceXPTracker;
