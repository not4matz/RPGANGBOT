const { SlashCommandBuilder } = require('discord.js');
const { checkOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('eval')
        .setDescription('⚠️ Execute JavaScript code (Owner only)')
        .addStringOption(option =>
            option.setName('code')
                .setDescription('JavaScript code to execute')
                .setRequired(true)),
    
    async execute(interaction) {
        // Check if user is bot owner
        if (!(await checkOwner(interaction))) {
            return; // checkOwner already sent the error message
        }

        const code = interaction.options.getString('code');
        
        try {
            await interaction.deferReply({ ephemeral: true });
            
            // Execute the code
            let result = eval(code);
            
            // Handle promises
            if (result instanceof Promise) {
                result = await result;
            }
            
            // Convert result to string
            let output = typeof result === 'string' ? result : require('util').inspect(result, { depth: 1 });
            
            // Limit output length
            if (output.length > 1900) {
                output = output.substring(0, 1900) + '...';
            }
            
            await interaction.editReply({
                content: `\`\`\`js\n// Input:\n${code}\n\n// Output:\n${output}\`\`\``
            });
            
        } catch (error) {
            console.error('Eval error:', error);
            await interaction.editReply({
                content: `\`\`\`js\n// Input:\n${code}\n\n// Error:\n${error.message}\`\`\``
            });
        }
    },
};
