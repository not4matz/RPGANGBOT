const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildDelete,
    execute(guild) {
        console.log(`❌ Left guild: ${guild.name} (${guild.id})`);
        console.log(`   • Members: ${guild.memberCount}`);
        
        // Update member count status
        if (guild.client.updateMemberCountStatus) {
            guild.client.updateMemberCountStatus(guild.client);
        }
        
        // You can add additional cleanup logic here if needed
        // For example, removing guild-specific data from a database
    },
};
