const { Events } = require('discord.js');

module.exports = {
    name: Events.GuildMemberRemove,
    execute(member) {
        console.log(`➖ Member left ${member.guild.name}: ${member.user.tag}`);
        
        // Update member count status
        if (member.client.updateMemberCountStatus) {
            member.client.updateMemberCountStatus(member.client);
        }
    },
};
