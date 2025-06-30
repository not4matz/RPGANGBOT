const { EmbedBuilder } = require('discord.js');
const database = require('./database');
const { COLORS } = require('./colors');

class JailManager {
    constructor(client) {
        this.client = client;
        this.checkInterval = null;
    }

    /**
     * Start the automatic jail expiration checker
     */
    start() {
        if (this.checkInterval) {
            console.log('⚠️ Jail manager already running');
            return;
        }

        // Check every 30 seconds for expired jails
        this.checkInterval = setInterval(() => {
            this.checkExpiredJails();
        }, 30000);

        console.log('✅ Jail manager started - checking for expired jails every 30 seconds');
    }

    /**
     * Stop the automatic jail expiration checker
     */
    stop() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
            console.log('🛑 Jail manager stopped');
        }
    }

    /**
     * Check for expired jails across all guilds and automatically unjail users
     */
    async checkExpiredJails() {
        try {
            const guilds = this.client.guilds.cache;
            
            for (const [guildId, guild] of guilds) {
                await this.processGuildExpiredJails(guild);
            }
        } catch (error) {
            console.error('❌ Error checking expired jails:', error);
        }
    }

    /**
     * Process expired jails for a specific guild
     * @param {Guild} guild - Discord guild object
     */
    async processGuildExpiredJails(guild) {
        try {
            const expiredJails = await database.getExpiredJails(guild.id);
            
            if (expiredJails.length === 0) {
                return; // No expired jails
            }

            console.log(`🔓 Found ${expiredJails.length} expired jail(s) in ${guild.name}`);

            for (const jailData of expiredJails) {
                await this.unjailUser(guild, jailData);
            }
        } catch (error) {
            console.error(`❌ Error processing expired jails for guild ${guild.name}:`, error);
        }
    }

    /**
     * Automatically unjail a user
     * @param {Guild} guild - Discord guild object
     * @param {Object} jailData - Jail data from database
     */
    async unjailUser(guild, jailData) {
        try {
            const userId = jailData.user_id;
            
            // Try to get the member
            const member = await guild.members.fetch(userId).catch(() => null);
            
            if (member) {
                // Get the jailed role
                const jailedRole = guild.roles.cache.find(role => role.name === 'Jailed');
                
                // Remove jailed role
                if (jailedRole && member.roles.cache.has(jailedRole.id)) {
                    await member.roles.remove(jailedRole);
                }

                // Restore original roles
                if (jailData.original_roles) {
                    const roleIds = jailData.original_roles.split(',').filter(id => id);
                    const validRoles = [];
                    
                    for (const roleId of roleIds) {
                        const role = guild.roles.cache.get(roleId);
                        if (role && role.id !== guild.id) { // Exclude @everyone
                            validRoles.push(role);
                        }
                    }
                    
                    if (validRoles.length > 0) {
                        try {
                            await member.roles.add(validRoles);
                        } catch (error) {
                            console.error(`❌ Error restoring roles for user ${userId}:`, error);
                        }
                    }
                }

                // Send DM to the user
                try {
                    const user = await this.client.users.fetch(userId);
                    const dmEmbed = new EmbedBuilder()
                        .setColor(COLORS.SUCCESS)
                        .setTitle('🔓 Jail Time Expired')
                        .setDescription(`Your jail time has expired in **${guild.name}**.`)
                        .addFields(
                            { name: '📝 Original Reason', value: jailData.reason || 'No reason provided', inline: false },
                            { name: '⏰ Jail Duration', value: `${jailData.jail_time} minutes`, inline: true },
                            { name: '🎉 Status', value: 'You now have full access to the server again!', inline: false }
                        )
                        .setFooter({ text: 'Purple Bot Jail System' })
                        .setTimestamp();

                    await user.send({ embeds: [dmEmbed] });
                } catch (error) {
                    console.log(`❌ Could not send DM to user ${userId}:`, error.message);
                }

                console.log(`🔓 Automatically unjailed user ${userId} in ${guild.name} (jail expired)`);
            } else {
                console.log(`🔓 User ${userId} not found in ${guild.name}, removing from jail database`);
            }

            // Remove from database
            await database.unjailUser(userId, guild.id);

        } catch (error) {
            console.error(`❌ Error unjailing user ${jailData.user_id}:`, error);
        }
    }

    /**
     * Get jail status for a user
     * @param {string} userId - User ID
     * @param {string} guildId - Guild ID
     * @returns {Object|null} Jail data or null if not jailed
     */
    async getJailStatus(userId, guildId) {
        try {
            return await database.getJailData(userId, guildId);
        } catch (error) {
            console.error('❌ Error getting jail status:', error);
            return null;
        }
    }

    /**
     * Get all active jails for a guild
     * @param {string} guildId - Guild ID
     * @returns {Array} Array of active jail data
     */
    async getActiveJails(guildId) {
        try {
            return await database.getActiveJails(guildId);
        } catch (error) {
            console.error('❌ Error getting active jails:', error);
            return [];
        }
    }

    /**
     * Manual check for expired jails (for testing/debugging)
     */
    async manualCheck() {
        console.log('🔍 Manual jail expiration check started...');
        await this.checkExpiredJails();
        console.log('✅ Manual jail expiration check completed');
    }
}

module.exports = JailManager;
