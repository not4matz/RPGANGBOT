const { Events, ActivityType } = require('discord.js');

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`🎉 ${client.user.tag} is now online!`);
        console.log(`📊 Bot Statistics:`);
        console.log(`   • Servers: ${client.guilds.cache.size}`);
        console.log(`   • Users: ${client.users.cache.size}`);
        console.log(`   • Commands: ${client.commands.size}`);
        
        // Set rotating status messages
        const activities = [
            { name: 'with Discord.js', type: ActivityType.Playing },
            { name: 'your commands', type: ActivityType.Listening },
            { name: 'over the server', type: ActivityType.Watching },
            { name: '/help for commands', type: ActivityType.Playing }
        ];
        
        let currentActivity = 0;
        
        // Set initial activity
        client.user.setActivity(activities[currentActivity]);
        
        // Rotate activities every 30 seconds
        setInterval(() => {
            currentActivity = (currentActivity + 1) % activities.length;
            client.user.setActivity(activities[currentActivity]);
        }, 30000);
    },
};
