const { Events } = require('discord.js');
const database = require('../utils/database');
const Join2CreateHandler = require('./join2createHandler');

module.exports = {
    name: Events.VoiceStateUpdate,
    async execute(oldState, newState) {
        // Ignore bots
        if (newState.member.user.bot) return;

        const userId = newState.member.id;
        const guildId = newState.guild.id;

        try {
            // Handle Join2Create functionality first
            await Join2CreateHandler.handleVoiceStateUpdate(oldState, newState);

            // User joined a voice channel
            if (!oldState.channel && newState.channel) {
                console.log(`🎤 ${newState.member.user.tag} joined voice channel: ${newState.channel.name}`);
                
                // Ensure user exists in database
                await database.upsertUser(userId, guildId, 0);
                
                // Set voice join time
                await database.updateVoiceJoinTime(userId, guildId, Date.now());
            }
            
            // User left a voice channel
            else if (oldState.channel && !newState.channel) {
                console.log(`🎤 ${newState.member.user.tag} left voice channel: ${oldState.channel.name}`);
                
                // Clear voice join time
                await database.clearVoiceJoinTime(userId, guildId);
            }
            
            // User switched voice channels (optional: could track this differently)
            else if (oldState.channel && newState.channel && oldState.channel.id !== newState.channel.id) {
                console.log(`🎤 ${newState.member.user.tag} switched from ${oldState.channel.name} to ${newState.channel.name}`);
                
                // Update join time to current time for the new channel
                await database.updateVoiceJoinTime(userId, guildId, Date.now());
            }

        } catch (error) {
            console.error('Error handling voice state update:', error);
        }
    },
};
