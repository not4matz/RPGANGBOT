const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const colors = require('../../utils/colors');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fuck') // Replace with your command name (lowercase, no spaces)
        .setDescription('Fuck someone') // Replace with your command description
        .addUserOption(option =>
            option.setName('target')
                .setDescription('fuck') // Replace with what the command does
                .setRequired(true)),
    
    async execute(interaction) {
        const target = interaction.options.getUser('target');
        const author = interaction.user;
        
        // Handle self-targeting
        if (target.id === author.id) {
            const embed = new EmbedBuilder()
                .setColor(colors.getRandomPurple())
                .setTitle('Self Fuck?') // Replace with self-target title
                .setDescription('How do you even fuck urself?') // Replace with self-target message
                .setThumbnail(author.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
        }
        
        // Handle bot targeting (choose one approach)
        if (target.bot) {
            // OPTION 1: Allow bot targeting with special message
            const embed = new EmbedBuilder()
                .setColor(colors.getRandomPurple())
                .setTitle('Fucking Session') // Replace with bot-target title
                .setDescription('You are fucking a bot!') // Replace with bot-target message
                .setThumbnail(target.displayAvatarURL({ dynamic: true }))
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed] });
            
            // OPTION 2: Prevent bot targeting (uncomment this instead)
            /*
            const embed = new EmbedBuilder()
                .setColor(colors.getRandomPurple())
                .setTitle('❌ Cannot Target Bots')
                .setDescription('BOT_PREVENTION_MESSAGE_HERE') // Replace with prevention message
                .setFooter({ text: 'Purple Bot Social System' })
                .setTimestamp();
            
            return interaction.reply({ embeds: [embed], ephemeral: true });
            */
        }
        
        // Main command execution
        const embed = new EmbedBuilder()
            .setColor(colors.getRandomPurple())
            .setTitle('Fucking Session') // Replace with main command title
            .setDescription(`You are fucking ${target}💕`) // Replace with main message - use ${author} and ${target} for mentions
            .setThumbnail(target.displayAvatarURL({ dynamic: true }))
            .setFooter({ text: 'Purple Bot Social System' })
            .setTimestamp();
        
        await interaction.reply({ embeds: [embed] });
    },
};

/*
TEMPLATE USAGE INSTRUCTIONS:

1. Copy this file and rename it to your command name (e.g., 'flirt.js')

2. Replace all the placeholder text:
   - COMMAND_NAME_HERE: Your command name (lowercase, no spaces)
   - COMMAND_DESCRIPTION_HERE: Brief description of what the command does
   - TARGET_ACTION_HERE: What the command does to the target (e.g., "flirt with")
   - SELF_TARGET_TITLE_HERE: Title when user targets themselves
   - SELF_TARGET_MESSAGE_HERE: Message when user targets themselves
   - BOT_TARGET_TITLE_HERE: Title when targeting a bot (if allowing)
   - BOT_TARGET_MESSAGE_HERE: Message when targeting a bot (if allowing)
   - BOT_PREVENTION_MESSAGE_HERE: Message preventing bot targeting (if not allowing)
   - MAIN_TITLE_HERE: Main command title
   - MAIN_MESSAGE_HERE: Main command message (use ${author} and ${target} for user mentions)

3. Choose bot targeting approach:
   - Keep OPTION 1 code if you want to allow bot targeting with special messages
   - Comment out OPTION 1 and uncomment OPTION 2 if you want to prevent bot targeting

4. Add emojis to make it more engaging (optional)

5. Test your command after creating it

EXAMPLE REPLACEMENTS for a /flirt command:
- COMMAND_NAME_HERE → 'flirt'
- COMMAND_DESCRIPTION_HERE → 'Send a flirty message to someone'
- TARGET_ACTION_HERE → 'flirt with'
- SELF_TARGET_TITLE_HERE → '💕 Self Love'
- SELF_TARGET_MESSAGE_HERE → 'You flirt with yourself in the mirror! Looking good! 😘'
- MAIN_TITLE_HERE → '💕 Flirty Vibes'
- MAIN_MESSAGE_HERE → '${author} sends flirty vibes to ${target}! 😘✨'
*/
