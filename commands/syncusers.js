const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../utils/database');
const { isOwner } = require('../utils/ownerCheck');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('syncusers')
        .setDescription('🔒 [OWNER ONLY] Sync all server members to the database'),

    async execute(interaction) {
        // Check if user is owner
        if (!isOwner(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ This command is only available to the bot owner.',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: true });

        try {
            const guild = interaction.guild;
            
            // Fetch all members if not cached
            await guild.members.fetch();
            
            const allMembers = guild.members.cache;
            const humanMembers = allMembers.filter(member => !member.user.bot);
            
            let addedCount = 0;
            let existingCount = 0;
            let errorCount = 0;

            const embed = new EmbedBuilder()
                .setTitle('🔄 Syncing Users to Database')
                .setDescription('Processing all server members...')
                .setColor('#0099ff')
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });

            console.log(`🔄 Starting user sync for ${guild.name} - ${humanMembers.size} human members to process`);

            for (const [userId, member] of humanMembers) {
                try {
                    // Check if user already exists
                    const existingUser = await database.getUser(userId, guild.id);
                    
                    if (existingUser) {
                        existingCount++;
                        console.log(`✓ User ${member.user.tag} already exists in database`);
                    } else {
                        // Add user to database with default values
                        await database.upsertUser(userId, guild.id, 0);
                        addedCount++;
                        console.log(`📊 Added ${member.user.tag} to database`);
                    }
                } catch (error) {
                    errorCount++;
                    console.error(`❌ Error processing ${member.user.tag}:`, error);
                }
            }

            // Update embed with results
            const resultEmbed = new EmbedBuilder()
                .setTitle('✅ User Sync Complete')
                .setDescription('Finished syncing all server members to the database')
                .setColor('#00ff00')
                .addFields(
                    { 
                        name: '📊 Results', 
                        value: `**Total Members:** ${humanMembers.size}\n**Added to DB:** ${addedCount}\n**Already Existed:** ${existingCount}\n**Errors:** ${errorCount}`, 
                        inline: false 
                    },
                    {
                        name: '💡 Info',
                        value: 'All server members are now in the database and ready for XP tracking!',
                        inline: false
                    }
                )
                .setTimestamp();

            await interaction.editReply({ embeds: [resultEmbed] });
            
            console.log(`✅ User sync complete for ${guild.name}: ${addedCount} added, ${existingCount} existing, ${errorCount} errors`);

        } catch (error) {
            console.error('Error in syncusers command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Sync Error')
                .setDescription('An error occurred while syncing users to the database')
                .setColor('#ff0000')
                .addFields({
                    name: 'Error Details',
                    value: error.message || 'Unknown error',
                    inline: false
                })
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};
