const { SlashCommandBuilder, EmbedBuilder, MessageFlags } = require('discord.js');
const database = require('../utils/database');
const { isOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voicefix')
        .setDescription('🔒 Manually fix voice XP tracking for a user (Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('Register a user for voice XP tracking')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to register')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('unregister')
                .setDescription('Unregister a user from voice XP tracking')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to unregister')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset voice tracking for a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('The user to reset')
                        .setRequired(true))),

    async execute(interaction) {
        // Check if user is owner
        if (!isOwner(interaction.user.id)) {
            const embed = new EmbedBuilder()
                .setTitle('❌ Access Denied')
                .setDescription('This command is restricted to bot owners only.')
                .setColor('#FF0000')
                .setTimestamp();

            return await interaction.reply({ 
                embeds: [embed], 
                flags: MessageFlags.Ephemeral 
            });
        }

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser('user');
        const guild = interaction.guild;

        try {
            const member = guild.members.cache.get(targetUser.id);
            
            if (!member) {
                return await interaction.editReply({
                    content: '❌ User not found in this server.',
                    flags: MessageFlags.Ephemeral
                });
            }

            switch (subcommand) {
                case 'register':
                    // Check if user is in voice
                    if (!member.voice.channel) {
                        return await interaction.editReply({
                            content: '❌ User is not in a voice channel.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Check if user is alone
                    if (member.voice.channel.members.filter(m => !m.user.bot).size <= 1) {
                        return await interaction.editReply({
                            content: '❌ User is alone in the voice channel.',
                            flags: MessageFlags.Ephemeral
                        });
                    }

                    // Register user
                    const now = Date.now();
                    await database.updateVoiceJoinTime(targetUser.id, guild.id, now);

                    const registerEmbed = new EmbedBuilder()
                        .setTitle('✅ Voice XP Registration')
                        .setDescription(`Successfully registered ${targetUser.tag} for voice XP tracking`)
                        .setColor('#00ff00')
                        .addFields({
                            name: 'Details',
                            value: `**Channel:** ${member.voice.channel.name}\n**Join Time:** ${new Date(now).toLocaleString()}\n**Status:** Now earning voice XP`,
                            inline: false
                        })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [registerEmbed], flags: MessageFlags.Ephemeral });
                    console.log(`🎤 Manually registered ${targetUser.tag} for voice XP tracking`);
                    break;

                case 'unregister':
                    // Unregister user
                    await database.clearVoiceJoinTime(targetUser.id, guild.id);

                    const unregisterEmbed = new EmbedBuilder()
                        .setTitle('✅ Voice XP Unregistration')
                        .setDescription(`Successfully unregistered ${targetUser.tag} from voice XP tracking`)
                        .setColor('#ff9900')
                        .addFields({
                            name: 'Details',
                            value: `**Status:** No longer earning voice XP\n**Action:** Voice join time cleared`,
                            inline: false
                        })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [unregisterEmbed], flags: MessageFlags.Ephemeral });
                    console.log(`🎤 Manually unregistered ${targetUser.tag} from voice XP tracking`);
                    break;

                case 'reset':
                    // Get current user data
                    const userData = await database.getUser(targetUser.id, guild.id);
                    
                    // Clear voice tracking data
                    await database.clearVoiceJoinTime(targetUser.id, guild.id);
                    
                    // If user is currently in voice and eligible, re-register them
                    let reregistered = false;
                    if (member.voice.channel && 
                        member.voice.channel.members.filter(m => !m.user.bot).size > 1 &&
                        !member.voice.mute && !member.voice.deaf && 
                        !member.voice.selfMute && !member.voice.selfDeaf) {
                        
                        await database.updateVoiceJoinTime(targetUser.id, guild.id, Date.now());
                        reregistered = true;
                    }

                    const resetEmbed = new EmbedBuilder()
                        .setTitle('✅ Voice XP Reset')
                        .setDescription(`Successfully reset voice XP tracking for ${targetUser.tag}`)
                        .setColor('#0099ff')
                        .addFields({
                            name: 'Details',
                            value: `**Previous Voice Time:** ${userData?.voice_time_minutes || 0} minutes\n**Status:** ${reregistered ? 'Re-registered for tracking' : 'Not currently tracking'}\n**Action:** Voice tracking data reset`,
                            inline: false
                        })
                        .setTimestamp();

                    await interaction.editReply({ embeds: [resetEmbed], flags: MessageFlags.Ephemeral });
                    console.log(`🎤 Reset voice XP tracking for ${targetUser.tag} (reregistered: ${reregistered})`);
                    break;
            }

        } catch (error) {
            console.error('Error in voicefix command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while fixing voice XP tracking.',
                flags: MessageFlags.Ephemeral
            });
        }
    },
};
