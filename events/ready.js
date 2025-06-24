const { Events, ActivityType } = require('discord.js');
const VoiceXPTracker = require('../utils/voiceXPTracker');

// Function to update member count status
function updateMemberCountStatus(client) {
    try {
        // Calculate total member count across all guilds
        let totalMembers = 0;
        client.guilds.cache.forEach(guild => {
            totalMembers += guild.memberCount;
        });

        // Set the status to show member count
        client.user.setActivity(`${totalMembers.toLocaleString()} Members`, { 
            type: ActivityType.Watching 
        });

        console.log(`📊 Status updated: Watching ${totalMembers.toLocaleString()} Members`);
    } catch (error) {
        console.error('❌ Error updating member count status:', error);
    }
}

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`✅ Ready! Logged in as ${client.user.tag}`);
        
        // Initialize member count status
        updateMemberCountStatus(client);
        
        // Update member count every 5 minutes
        setInterval(() => {
            updateMemberCountStatus(client);
        }, 5 * 60 * 1000);
        
        // Store the function on client for other events to use
        client.updateMemberCountStatus = () => updateMemberCountStatus(client);

        // Initialize voice XP tracker
        const voiceTracker = new VoiceXPTracker(client);
        voiceTracker.start();
        
        // Store tracker on client for cleanup if needed
        client.voiceXPTracker = voiceTracker;
        
        console.log('🎤 Voice XP tracking system initialized');
    },
};
