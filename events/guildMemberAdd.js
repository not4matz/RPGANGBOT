const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberAdd,
    execute(member) {
        console.log(`➕ Member joined ${member.guild.name}: ${member.user.tag}`);
        
        // Update member count status
        if (member.client.updateMemberCountStatus) {
            member.client.updateMemberCountStatus(member.client);
        }
    },
};
