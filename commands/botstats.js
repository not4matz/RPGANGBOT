const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('botstats')
        .setDescription('🔒 [OWNER ONLY] Display detailed bot statistics'),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        try {
            const client = interaction.client;
            
            // Calculate uptime
            const uptime = process.uptime();
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor(uptime / 3600) % 24;
            const minutes = Math.floor(uptime / 60) % 60;
            const seconds = Math.floor(uptime % 60);
            
            // Memory usage
            const memoryUsage = process.memoryUsage();
            const memoryUsed = (memoryUsage.heapUsed / 1024 / 1024).toFixed(2);
            const memoryTotal = (memoryUsage.heapTotal / 1024 / 1024).toFixed(2);
            
            // System info
            const cpuUsage = process.cpuUsage();
            const platform = os.platform();
            const nodeVersion = process.version;
            
            const embed = new EmbedBuilder()
                .setTitle('🤖 Bot Statistics')
                .setColor('#00ff00')
                .setThumbnail(client.user.displayAvatarURL())
                .addFields(
                    {
                        name: '📊 General Stats',
                        value: `**Guilds:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Channels:** ${client.channels.cache.size}\n**Commands:** ${client.commands.size}`,
                        inline: true
                    },
                    {
                        name: '⏱️ Uptime',
                        value: `${days}d ${hours}h ${minutes}m ${seconds}s`,
                        inline: true
                    },
                    {
                        name: '💾 Memory Usage',
                        value: `**Used:** ${memoryUsed} MB\n**Total:** ${memoryTotal} MB`,
                        inline: true
                    },
                    {
                        name: '🖥️ System Info',
                        value: `**Platform:** ${platform}\n**Node.js:** ${nodeVersion}\n**Discord.js:** ${require('discord.js').version}`,
                        inline: true
                    },
                    {
                        name: '🏓 Latency',
                        value: `**API:** ${Math.round(client.ws.ping)}ms`,
                        inline: true
                    },
                    {
                        name: '📅 Bot Created',
                        value: `<t:${Math.floor(client.user.createdTimestamp / 1000)}:R>`,
                        inline: true
                    }
                )
                .setFooter({
                    text: `Requested by ${interaction.user.tag}`,
                    iconURL: interaction.user.displayAvatarURL()
                })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            console.error('Error getting bot stats:', error);
            await interaction.reply({
                content: '❌ Failed to retrieve bot statistics!',
                ephemeral: true
            });
        }
    },
};
