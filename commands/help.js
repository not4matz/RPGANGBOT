const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Display all available commands and their descriptions'),
    
    async execute(interaction) {
        const commands = interaction.client.commands;
        
        const embed = new EmbedBuilder()
            .setColor('#0099ff')
            .setTitle('📚 Bot Commands')
            .setDescription('Here are all the available commands:')
            .setTimestamp()
            .setFooter({ 
                text: `Requested by ${interaction.user.tag}`, 
                iconURL: interaction.user.displayAvatarURL() 
            });

        // Categorize commands
        const ownerCommands = [];
        const publicCommands = [];
        const adminCommands = [];

        commands.forEach(command => {
            const description = command.data.description;
            const name = command.data.name;
            
            if (description.includes('[OWNER ONLY]') || description.includes('🔒')) {
                ownerCommands.push(`**/${name}** - ${description.replace('🔒 [OWNER ONLY] ', '').replace('[OWNER ONLY] ', '')}`);
            } else if (description.includes('Admin') || name.includes('admin')) {
                adminCommands.push(`**/${name}** - ${description}`);
            } else {
                publicCommands.push(`**/${name}** - ${description}`);
            }
        });

        // Add fields with character limit checking
        if (publicCommands.length > 0) {
            const publicList = publicCommands.join('\n');
            if (publicList.length <= 1024) {
                embed.addFields({
                    name: '🌟 Public Commands',
                    value: publicList,
                    inline: false
                });
            } else {
                // Split into multiple fields if too long
                const chunks = [];
                let currentChunk = '';
                
                for (const cmd of publicCommands) {
                    if ((currentChunk + cmd + '\n').length > 1024) {
                        chunks.push(currentChunk);
                        currentChunk = cmd + '\n';
                    } else {
                        currentChunk += cmd + '\n';
                    }
                }
                if (currentChunk) chunks.push(currentChunk);
                
                chunks.forEach((chunk, index) => {
                    embed.addFields({
                        name: index === 0 ? '🌟 Public Commands' : '🌟 Public Commands (cont.)',
                        value: chunk.trim(),
                        inline: false
                    });
                });
            }
        }

        if (adminCommands.length > 0) {
            const adminList = adminCommands.join('\n');
            embed.addFields({
                name: '⚙️ Admin Commands',
                value: adminList.length <= 1024 ? adminList : adminList.substring(0, 1020) + '...',
                inline: false
            });
        }

        if (ownerCommands.length > 0) {
            const ownerList = ownerCommands.join('\n');
            if (ownerList.length <= 1024) {
                embed.addFields({
                    name: '🔒 Owner Commands',
                    value: ownerList,
                    inline: false
                });
            } else {
                // Split owner commands if too long
                const chunks = [];
                let currentChunk = '';
                
                for (const cmd of ownerCommands) {
                    if ((currentChunk + cmd + '\n').length > 1024) {
                        chunks.push(currentChunk);
                        currentChunk = cmd + '\n';
                    } else {
                        currentChunk += cmd + '\n';
                    }
                }
                if (currentChunk) chunks.push(currentChunk);
                
                chunks.forEach((chunk, index) => {
                    embed.addFields({
                        name: index === 0 ? '🔒 Owner Commands' : '🔒 Owner Commands (cont.)',
                        value: chunk.trim(),
                        inline: false
                    });
                });
            }
        }

        embed.addFields({
            name: '💡 Need Help?',
            value: 'Use `/ping` to check bot status\nUse `/levelexplain` to learn about leveling\nUse `/counting` for counting game info',
            inline: false
        });

        await interaction.reply({ embeds: [embed] });
    },
};
