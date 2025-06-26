const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Shows all available commands and bot information'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(colors.PRIMARY)
            .setTitle('🌟 Bot Commands & Features')
            .setDescription('**Welcome to the ultimate Discord experience!**\n*Here are all the amazing features available:*')
            .addFields(
                {
                    name: '💜 **General Commands**',
                    value: '`/ping` - Check bot latency\n`/help` - Show this menu\n`/userinfo` - User information\n`/serverinfo` - Server statistics',
                    inline: false
                },
                {
                    name: '🎮 **Leveling System**',
                    value: '`/level` - Check your level & XP\n`/leaderboard` - Server rankings\n`/levelexplain` - How leveling works',
                    inline: false
                },
                {
                    name: '🔊 **Voice & Fun**',
                    value: '`/wakeup` - Wake up users in voice\n`/allowwakeup` - Grant wakeup permissions\n`/disallowwakeup` - Remove permissions',
                    inline: false
                },
                {
                    name: '🗳️ **Polls & Interaction**',
                    value: '`/poll create` - Create multiple choice polls\n`/poll yesno` - Simple yes/no polls\n`/poll end` - End polls early',
                    inline: false
                },
                {
                    name: '🔢 **Counting Game**',
                    value: '`/counting` - View counting stats\n`/countingadmin` - Manage counting system',
                    inline: false
                },
                {
                    name: '⚙️ **Admin Tools**',
                    value: '`/clear` - Clear messages\n`/leveladmin` - Manage user levels\n`/syncusers` - Sync server members',
                    inline: false
                }
            )
            .setFooter({ 
                text: `${interaction.guild.name} • Purple-themed bot experience`, 
                iconURL: interaction.guild.iconURL() 
            })
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
