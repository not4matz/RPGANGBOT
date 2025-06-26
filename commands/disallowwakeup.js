const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('disallowwakeup')
        .setDescription('Disallow a user from being woken up with the /wakeup command')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to disallow wakeup for')
                .setRequired(true)),

    async execute(interaction) {
        try {
            const targetUser = interaction.options.getUser('user');
            const guildId = interaction.guild.id;

            // Check if target is a bot
            if (targetUser.bot) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Target')
                    .setDescription('You cannot manage wakeup permissions for bots.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Check current permissions
            const currentPermissions = await database.getWakeupPermissions(targetUser.id, guildId);
            
            if (!currentPermissions) {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('⚠️ No Permissions Set')
                    .setDescription(`${targetUser.username} doesn't have any wakeup permissions set. They are already unable to be woken up.`)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (!currentPermissions.allowed) {
                const embed = new EmbedBuilder()
                    .setColor('#ffff00')
                    .setTitle('⚠️ Already Disallowed')
                    .setDescription(`${targetUser.username} is already disallowed from being woken up.`)
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Set wakeup permissions to disallowed
            await database.setWakeupPermissions(targetUser.id, guildId, false);

            const embed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('🚫 Wakeup Disallowed')
                .setDescription(`${targetUser.username} can no longer be woken up using the \`/wakeup\` command.`)
                .addFields(
                    { name: 'User', value: `<@${targetUser.id}>`, inline: true },
                    { name: 'Status', value: 'Wakeup Disallowed', inline: true },
                    { name: 'Changed By', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in disallowwakeup command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while updating wakeup permissions.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
