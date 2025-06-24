const { Events } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    name: Events.GuildMemberAdd,
    async execute(member) {
        console.log(`➕ Member joined ${member.guild.name}: ${member.user.tag}`);
        
        try {
            // Skip bots
            if (member.user.bot) {
                console.log(`🤖 Skipping bot user: ${member.user.tag}`);
                return;
            }

            // Add user to database with default values
            await database.upsertUser(member.user.id, member.guild.id, 0);
            console.log(`📊 Added ${member.user.tag} to database for ${member.guild.name}`);
            
        } catch (error) {
            console.error(`❌ Error adding user ${member.user.tag} to database:`, error);
        }
        
        // Update member count status
        if (member.client.updateMemberCountStatus) {
            member.client.updateMemberCountStatus(member.client);
        }
    },
};
