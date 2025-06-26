const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');
const { setWakeupPermissions } = require('../utils/database');
const colors = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('allowwakeup')
        .setDescription('💜 [OWNER] Grant wakeup permissions to a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to grant wakeup permissions to')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check if user is the bot owner
        if (!await checkOwner(interaction)) {
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        // Prevent granting permissions to bots
        if (targetUser.bot) {
            const botEmbed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('⚠️ Invalid Target')
                .setDescription('Cannot grant wakeup permissions to bots.')
                .setTimestamp();

            return await interaction.reply({ embeds: [botEmbed], ephemeral: true });
        }

        try {
            await setWakeupPermissions(targetUser.id, guildId, true);
            
            const successEmbed = new EmbedBuilder()
                .setColor(colors.SUCCESS)
                .setTitle('✅ Permissions Granted')
                .setDescription(`${targetUser.username} now has permission to use the wakeup command.`)
                .addFields(
                    { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
                    { name: '🎯 Permission', value: 'Wakeup Command Access', inline: true },
                    { name: '⚡ Status', value: 'Active', inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: 'Purple Bot Permission System' })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error granting wakeup permissions:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('❌ Permission Error')
                .setDescription('Failed to grant wakeup permissions. Please try again.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
