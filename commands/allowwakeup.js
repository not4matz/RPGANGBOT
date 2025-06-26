const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('allowwakeup')
        .setDescription('Allow a user to be woken up with the /wakeup command (Owner only)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('The user to allow wakeup for')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Check if user is the bot owner
            if (!(await checkOwner(interaction))) {
                return;
            }

            const targetUser = interaction.options.getUser('user');
            const guildId = interaction.guild.id;

            // Check if target is a bot
            if (targetUser.bot) {
                const embed = new EmbedBuilder()
                    .setColor('#ff0000')
                    .setTitle('❌ Invalid Target')
                    .setDescription('You cannot allow wakeup for bots.')
                    .setTimestamp();

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            // Set wakeup permissions to allowed
            await database.setWakeupPermissions(targetUser.id, guildId, true);

            const embed = new EmbedBuilder()
                .setColor('#00ff00')
                .setTitle('✅ Wakeup Allowed')
                .setDescription(`${targetUser.username} can now be woken up using the \`/wakeup\` command.`)
                .addFields(
                    { name: 'User', value: `<@${targetUser.id}>`, inline: true },
                    { name: 'Status', value: 'Wakeup Allowed', inline: true },
                    { name: 'Added By', value: `<@${interaction.user.id}>`, inline: true }
                )
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in allowwakeup command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor('#ff0000')
                .setTitle('❌ Error')
                .setDescription('An error occurred while updating wakeup permissions.')
                .setTimestamp();

            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }
    },
};
