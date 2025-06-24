const { Events, ActivityType } = require('discord.js');

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
        console.log(`🎉 ${client.user.tag} is now online!`);
        console.log(`📊 Bot Statistics:`);
        console.log(`   • Servers: ${client.guilds.cache.size}`);
        console.log(`   • Users: ${client.users.cache.size}`);
        console.log(`   • Commands: ${client.commands.size}`);
        
        // Set initial member count status
        updateMemberCountStatus(client);
        
        // Update member count status every 5 minutes
        setInterval(() => {
            updateMemberCountStatus(client);
        }, 300000); // 5 minutes = 300,000ms

        // Store the update function on the client for use in other events
        client.updateMemberCountStatus = updateMemberCountStatus;
    },
};
