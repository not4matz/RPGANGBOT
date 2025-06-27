console.log("🚀 Bot script Index.js starting execution...");

// Load environment variables FIRST
require('dotenv').config();

// === Global Error Handlers ===
process.on('unhandledRejection', error => {
    console.error('❌ Unhandled Promise Rejection:', error);
});
process.on('uncaughtException', error => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1); // Optional: exit on uncaught exception
});

// === Imports & Setup ===
const { Client, GatewayIntentBits, Collection, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');
const ChannelUpdater = require('./utils/channelUpdater');
const webhook = require('./utils/webhook');
const WebhookServer = require('./server/webhookServer');

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessageReactions
    ]
});

// Create a collection to store commands
client.commands = new Collection();

// Load commands from the commands directory
const loadCommands = () => {
    const commandsPath = path.join(__dirname, 'commands');
    
    // Create commands directory if it doesn't exist
    if (!fs.existsSync(commandsPath)) {
        fs.mkdirSync(commandsPath);
        console.log('📁 Created commands directory');
    }
    
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const command = require(filePath);
            
            if ('data' in command && 'execute' in command) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️  Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`❌ Error loading command ${file}:`, error);
        }
    }
};

// Load event handlers
const loadEvents = () => {
    const eventsPath = path.join(__dirname, 'events');
    
    // Create events directory if it doesn't exist
    if (!fs.existsSync(eventsPath)) {
        fs.mkdirSync(eventsPath);
        console.log('📁 Created events directory');
    }
    
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        try {
            delete require.cache[require.resolve(filePath)];
            const event = require(filePath);
            
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            console.log(`✅ Loaded event: ${event.name}`);
        } catch (error) {
            console.error(`❌ Error loading event ${file}:`, error);
        }
    }
};

// Bot ready event
client.once(Events.ClientReady, async () => {
    console.log(`🚀 Bot is ready! Logged in as ${client.user.tag}`);
    console.log(`📊 Serving ${client.guilds.cache.size} guilds with ${client.users.cache.size} users`);
    
    // Set bot activity
    client.user.setActivity('💜 Purple Bot Online', { type: 'PLAYING' });
    
    // Send startup notification via webhook
    await webhook.sendStartupNotification();
    
    // Initialize and start channel updater
    const channelUpdater = new ChannelUpdater(client);
    channelUpdater.start();
    
    // Store reference for potential future use
    client.channelUpdater = channelUpdater;
    
    // Start GitHub webhook server
    const webhookServer = new WebhookServer();
    try {
        await webhookServer.start();
        client.webhookServer = webhookServer;
    } catch (error) {
        console.error('❌ Failed to start webhook server:', error);
        console.log('⚠️ Bot will continue without webhook server');
    }
});

// Handle slash command interactions
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`❌ No command matching ${interaction.commandName} was found.`);
        return;
    }

    try {
        await command.execute(interaction);
        console.log(`✅ Command executed: ${interaction.commandName} by ${interaction.user.tag}`);
    } catch (error) {
        console.error(`❌ Error executing command ${interaction.commandName}:`, error);
        
        const errorMessage = {
            content: '❌ There was an error while executing this command!',
            ephemeral: true
        };
        
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(errorMessage);
        } else {
            await interaction.reply(errorMessage);
        }
    }
});

// Handle errors
client.on('error', error => {
    console.error('❌ Discord client error:', error);
});

process.on('unhandledRejection', error => {
    console.error('❌ Unhandled promise rejection:', error);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('🛑 Received SIGINT. Graceful shutdown...');
    
    // Send shutdown notification
    await webhook.sendShutdownNotification();
    
    if (client.channelUpdater) {
        client.channelUpdater.stop();
    }
    if (client.webhookServer) {
        await client.webhookServer.stop();
    }
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('🛑 Received SIGTERM. Graceful shutdown...');
    
    // Send shutdown notification
    await webhook.sendShutdownNotification();
    
    if (client.channelUpdater) {
        client.channelUpdater.stop();
    }
    if (client.webhookServer) {
        await client.webhookServer.stop();
    }
    client.destroy();
    process.exit(0);
});

// Load commands and events
loadCommands();
loadEvents();

// Login to Discord
if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN is not set in environment variables!');
    console.log('📝 Please create a .env file with your bot token (see .env.example)');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Failed to login:', error);
    process.exit(1);
});

module.exports = client;
