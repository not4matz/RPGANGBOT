const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');
const { setWakeupPermissions } = require('../utils/database');
const colors = require('../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disallowwakeup')
        .setDescription('💜 [OWNER] Remove wakeup permissions from a user')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to remove wakeup permissions from')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check if user is the bot owner
        if (!await checkOwner(interaction)) {
            return;
        }

        const targetUser = interaction.options.getUser('user');
        const guildId = interaction.guild.id;

        try {
            await setWakeupPermissions(targetUser.id, guildId, false);
            
            const successEmbed = new EmbedBuilder()
                .setColor(colors.WARNING)
                .setTitle('🔒 Permissions Revoked')
                .setDescription(`${targetUser.username} no longer has permission to use the wakeup command.`)
                .addFields(
                    { name: '👤 User', value: `<@${targetUser.id}>`, inline: true },
                    { name: '🎯 Permission', value: 'Wakeup Command Access', inline: true },
                    { name: '⚡ Status', value: 'Revoked', inline: true }
                )
                .setThumbnail(targetUser.displayAvatarURL())
                .setFooter({ text: 'Purple Bot Permission System' })
                .setTimestamp();

            await interaction.reply({ embeds: [successEmbed] });
        } catch (error) {
            console.error('Error revoking wakeup permissions:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(colors.ERROR)
                .setTitle('❌ Permission Error')
                .setDescription('Failed to revoke wakeup permissions. Please try again.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
