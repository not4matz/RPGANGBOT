const { PermissionsBitField } = require('discord.js');

class ChannelUpdater {
    constructor(client) {
        this.client = client;
        this.updateInterval = 5 * 60 * 1000; // 5 minutes in milliseconds
        this.isRunning = false;
        
        // Channel configurations
        this.channels = {
            memberCount: {
                id: '1242542257458909235',
                format: (count) => `👥 Members: ${count.toLocaleString()}`
            },
            banCount: {
                id: '1384988265303769179',
                format: (count) => `🔨 Bans: ${count.toLocaleString()}`
            }
        };
    }

    /**
     * Start the channel updater
     */
    start() {
        if (this.isRunning) {
            console.log('⚠️ Channel updater is already running');
            return;
        }

        console.log('🔄 Starting channel updater (5-minute intervals)');
        this.isRunning = true;
        
        // Update immediately on start
        this.updateChannels();
        
        // Set up interval for updates
        this.intervalId = setInterval(() => {
            this.updateChannels();
        }, this.updateInterval);
    }

    /**
     * Stop the channel updater
     */
    stop() {
        if (!this.isRunning) {
            console.log('⚠️ Channel updater is not running');
            return;
        }

        console.log('🛑 Stopping channel updater');
        this.isRunning = false;
        
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    /**
     * Update all configured channels
     */
    async updateChannels() {
        try {
            console.log('🔄 Updating channel names...');
            
            // Update member count channel
            await this.updateMemberCountChannel();
            
            // Update ban count channel
            await this.updateBanCountChannel();
            
            console.log('✅ Channel names updated successfully');
        } catch (error) {
            console.error('❌ Error updating channels:', error);
        }
    }

    /**
     * Update the member count channel
     */
    async updateMemberCountChannel() {
        try {
            const channel = this.client.channels.cache.get(this.channels.memberCount.id);
            if (!channel) {
                console.error(`❌ Member count channel not found: ${this.channels.memberCount.id}`);
                return;
            }

            const guild = channel.guild;
            if (!guild) {
                console.error('❌ Guild not found for member count channel');
                return;
            }

            // Check bot permissions
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                console.error('❌ Bot lacks ManageChannels permission for member count update');
                return;
            }

            const memberCount = guild.memberCount;
            const newName = this.channels.memberCount.format(memberCount);
            
            if (channel.name !== newName) {
                await channel.setName(newName);
                console.log(`✅ Updated member count channel: ${newName}`);
            } else {
                console.log(`ℹ️ Member count channel already up to date: ${newName}`);
            }
        } catch (error) {
            console.error('❌ Error updating member count channel:', error);
        }
    }

    /**
     * Update the ban count channel
     */
    async updateBanCountChannel() {
        try {
            const channel = this.client.channels.cache.get(this.channels.banCount.id);
            if (!channel) {
                console.error(`❌ Ban count channel not found: ${this.channels.banCount.id}`);
                return;
            }

            const guild = channel.guild;
            if (!guild) {
                console.error('❌ Guild not found for ban count channel');
                return;
            }

            // Check bot permissions
            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                console.error('❌ Bot lacks ManageChannels permission for ban count update');
                return;
            }

            if (!guild.members.me.permissions.has(PermissionsBitField.Flags.BanMembers)) {
                console.error('❌ Bot lacks BanMembers permission to view ban count');
                return;
            }

            // Fetch ban count
            const bans = await guild.bans.fetch();
            const banCount = bans.size;
            const newName = this.channels.banCount.format(banCount);
            
            if (channel.name !== newName) {
                await channel.setName(newName);
                console.log(`✅ Updated ban count channel: ${newName}`);
            } else {
                console.log(`ℹ️ Ban count channel already up to date: ${newName}`);
            }
        } catch (error) {
            console.error('❌ Error updating ban count channel:', error);
        }
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            updateInterval: this.updateInterval,
            channels: this.channels
        };
    }
}

module.exports = ChannelUpdater;
