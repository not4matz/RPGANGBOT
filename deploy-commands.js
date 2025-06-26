require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const clientId = process.env.CLIENT_ID || require('./config.json').clientId;
const token = process.env.DISCORD_TOKEN || require('./config.json').token;
const guildId = process.env.GUILD_ID;

const commands = [];
const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Get existing commands
        let existingCommands;
        if (guildId) {
            existingCommands = await rest.get(
                Routes.applicationGuildCommands(clientId, guildId)
            );
        } else {
            existingCommands = await rest.get(
                Routes.applicationCommands(clientId)
            );
        }

        // Delete commands that are not present locally
        for (const cmd of existingCommands) {
            if (!commands.some(c => c.name === cmd.name)) {
                if (guildId) {
                    await rest.delete(
                        Routes.applicationGuildCommand(clientId, guildId, cmd.id)
                    );
                } else {
                    await rest.delete(
                        Routes.applicationCommand(clientId, cmd.id)
                    );
                }
                console.log(`Deleted command: ${cmd.name}`);
            }
        }

        // Deploy commands
        let data;
        if (guildId) {
            data = await rest.put(
                Routes.applicationGuildCommands(clientId, guildId),
                { body: commands }
            );
            console.log(`Successfully reloaded ${data.length} guild application (/) commands.`);
        } else {
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`Successfully reloaded ${data.length} global application (/) commands.`);
            console.log('Global commands may take up to 1 hour to propagate to all servers.');
        }
    } catch (error) {
        console.error(error);
    }
})();
