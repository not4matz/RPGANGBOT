const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// Check if commands directory exists
if (!fs.existsSync(commandsPath)) {
    console.log('❌ Commands directory not found. Please create some commands first.');
    process.exit(1);
}

const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

// Load all command data
for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    try {
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
            console.log(`✅ Loaded command data: ${command.data.name}`);
        } else {
            console.log(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
        }
    } catch (error) {
        console.error(`❌ Error loading command ${file}:`, error);
    }
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

// Function to clean up orphaned commands
async function cleanupOrphanedCommands() {
    try {
        console.log(`🧹 Checking for orphaned commands...`);
        
        const localCommandNames = commands.map(cmd => cmd.name);
        let registeredCommands;
        let routeType;

        // Get registered commands
        if (process.env.GUILD_ID) {
            registeredCommands = await rest.get(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
            );
            routeType = 'guild';
        } else {
            registeredCommands = await rest.get(
                Routes.applicationCommands(process.env.CLIENT_ID)
            );
            routeType = 'global';
        }

        // Find orphaned commands
        const orphanedCommands = registeredCommands.filter(
            registeredCmd => !localCommandNames.includes(registeredCmd.name)
        );

        if (orphanedCommands.length > 0) {
            console.log(`🗑️  Found ${orphanedCommands.length} orphaned ${routeType} commands to clean up:`);
            orphanedCommands.forEach(cmd => console.log(`   - ${cmd.name}`));

            // Delete orphaned commands
            for (const cmd of orphanedCommands) {
                try {
                    if (process.env.GUILD_ID) {
                        await rest.delete(
                            Routes.applicationGuildCommand(process.env.CLIENT_ID, process.env.GUILD_ID, cmd.id)
                        );
                    } else {
                        await rest.delete(
                            Routes.applicationCommand(process.env.CLIENT_ID, cmd.id)
                        );
                    }
                    console.log(`🗑️  Deleted orphaned command: ${cmd.name}`);
                } catch (error) {
                    console.error(`❌ Failed to delete ${cmd.name}:`, error.message);
                }
            }
        } else {
            console.log(`✅ No orphaned commands found`);
        }
    } catch (error) {
        console.error('⚠️  Error during cleanup (continuing with deployment):', error.message);
    }
}

// Deploy commands
(async () => {
    try {
        // Clean up orphaned commands first
        await cleanupOrphanedCommands();
        
        console.log(`🚀 Started refreshing ${commands.length} application (/) commands.`);

        // Check if we should deploy globally or to a specific guild
        if (process.env.GUILD_ID) {
            // Deploy to specific guild (faster for development)
            const data = await rest.put(
                Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} guild application (/) commands.`);
        } else {
            // Deploy globally (takes up to 1 hour to propagate)
            const data = await rest.put(
                Routes.applicationCommands(process.env.CLIENT_ID),
                { body: commands },
            );
            console.log(`✅ Successfully reloaded ${data.length} global application (/) commands.`);
            console.log('ℹ️  Global commands may take up to 1 hour to appear in all servers.');
        }
    } catch (error) {
        console.error('❌ Error deploying commands:', error);
    }
})();
