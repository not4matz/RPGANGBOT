# MainBot - All-Around Discord Bot

A comprehensive, modular Discord bot built with Discord.js v14 featuring slash commands, event handling, and a clean architecture.

## 🚀 Features

- **Slash Commands**: Modern Discord slash command support
- **Modular Architecture**: Easy to add new commands and features
- **Event Handling**: Comprehensive event system
- **Error Handling**: Robust error handling and logging
- **Auto-reload**: Hot reload commands during development
- **Permission Checks**: Built-in permission validation
- **Rich Embeds**: Beautiful message formatting
- **Webhook Update Notifications**: Automatic notifications for code updates, deployments, and bot status changes

## 📋 Commands

### General Commands
- `/ping` - Check bot latency and response time
- `/help` - Display all available commands
- `/userinfo [user]` - Get information about a user
- `/serverinfo` - Display server information
- `/update notify` - Send manual update notification
- `/update status` - Check webhook configuration and send test
- `/update startup` - Send bot startup notification
- `/update shutdown` - Send bot shutdown notification

### Moderation Commands
- `/clear <amount>` - Delete multiple messages (requires Manage Messages permission)

## 🛠️ Setup

### Prerequisites
- Node.js 16.11.0 or higher
- A Discord application and bot token

### Installation

1. **Clone or download this repository**

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure your bot**
   Edit `.env` file with your bot credentials:
   ```env
   DISCORD_TOKEN=your_bot_token_here
   CLIENT_ID=your_client_id_here
   GUILD_ID=your_guild_id_here  # Optional: for faster command deployment during development
   UPDATE_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url_here
   ```

5. **Deploy slash commands**
   ```bash
   node deploy-commands.js
   ```

6. **Start the bot**
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## 🔧 Configuration

### Getting Bot Credentials

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to the "Bot" section and create a bot
4. Copy the bot token for `DISCORD_TOKEN`
5. Go to "General Information" and copy the Application ID for `CLIENT_ID`
6. For `GUILD_ID`, right-click your server in Discord and copy the server ID (requires Developer Mode)

### Bot Permissions

Your bot needs the following permissions:
- Send Messages
- Use Slash Commands
- Embed Links
- Read Message History
- Manage Messages (for moderation commands)
- Add Reactions

Invite URL template:
```
https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=274878221312&scope=bot%20applications.commands
```

## 📁 Project Structure

```
MainBot/
├── commands/           # Slash commands
│   ├── wakeup.js
│   ├── allowwakeup.js
│   ├── disallowwakeup.js
│   ├── ping.js
│   ├── help.js
│   ├── userinfo.js
│   ├── serverinfo.js
│   ├── clear.js
│   └── update.js       # Update notification management
├── events/            # Event handlers
│   ├── ready.js
│   ├── guildCreate.js
│   └── guildDelete.js
├── utils/             # Utility modules
│   ├── colors.js      # Purple-black color scheme
│   ├── webhook.js     # Update notification system
│   ├── database.js    # Database operations
│   └── ownerCheck.js  # Owner verification
├── scripts/           # Automation scripts
│   └── git-webhook.js # Git integration for auto-notifications
├── index.js           # Main bot file
├── deploy-commands.js # Command deployment script
├── package.json       # Dependencies and scripts
├── .env.example       # Environment variables template
└── README.md         # This file
```

## 📡 Webhook Update Notifications

The bot includes a sophisticated webhook system that sends purple-themed notifications about code updates, deployments, and bot status changes.

### 🔧 Setup Webhook Notifications

1. **Create a Discord Webhook:**
   - Go to your Discord channel settings
   - Navigate to "Integrations" → "Webhooks"
   - Click "Create Webhook"
   - Copy the webhook URL

2. **Configure Environment:**
   ```bash
   # Add to your .env file
   UPDATE_WEBHOOK_URL=https://discord.com/api/webhooks/your_webhook_url_here
   ```

3. **Automatic Notifications:**
   - Bot startup/shutdown notifications
   - Git commit notifications (when using git-webhook.js)
   - Manual update notifications via `/update` command

### 🎨 Notification Features

- **Purple-themed embeds** matching the bot's aesthetic
- **Detailed statistics** (files changed, lines added/deleted)
- **Author tracking** and timestamps
- **File change lists** with truncation for large updates
- **Status indicators** with emojis and color coding

### 📊 Available Commands

- `/update notify` - Send manual update notification
- `/update status` - Check webhook configuration and send test
- `/update startup` - Send bot startup notification
- `/update shutdown` - Send bot shutdown notification

### 🔄 Git Integration

Use the included git webhook script for automatic notifications:

```bash
# Send notification for last commit
node scripts/git-webhook.js

# Send notification for commit range
node scripts/git-webhook.js range abc123 def456

# Send manual notification
node scripts/git-webhook.js manual "Feature Update" "Added new commands"
```

### 🎯 Example Notification

The webhook sends beautifully formatted purple embeds with:
- 📊 Change statistics (files, lines added/deleted)
- 📁 List of modified files
- 👤 Author information and timestamps
- 🌟 Special features and deployment status
- 💜 Consistent purple-black branding

## 🔨 Adding New Commands

1. Create a new file in the `commands/` directory
2. Use this template:

```javascript
const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('commandname')
        .setDescription('Command description'),
    
    async execute(interaction) {
        await interaction.reply('Hello World!');
    },
};
```

3. Run `node deploy-commands.js` to register the new command
4. Restart the bot

## 🎯 Adding New Events

1. Create a new file in the `events/` directory
2. Use this template:

```javascript
const { Events } = require('discord.js');

module.exports = {
    name: Events.EventName,
    once: false, // Set to true for one-time events
    execute(/* event parameters */) {
        // Event logic here
    },
};
```

3. Restart the bot (events are loaded on startup)

## 🐛 Troubleshooting

### Common Issues

1. **"Invalid Token" error**
   - Check that your `DISCORD_TOKEN` is correct
   - Make sure there are no extra spaces in your `.env` file

2. **Commands not appearing**
   - Run `node deploy-commands.js` to register commands
   - If using `GUILD_ID`, commands appear instantly in that server
   - Global commands (without `GUILD_ID`) take up to 1 hour to appear

3. **Permission errors**
   - Ensure the bot has necessary permissions in your server
   - Check that the bot's role is above roles it needs to manage

4. **Bot not responding**
   - Check console for error messages
   - Verify the bot is online in your server
   - Ensure intents are properly configured

### Debug Mode

For additional logging, you can modify the console.log statements in `index.js` or add:

```javascript
client.on('debug', console.log);
```

## 🚀 Deployment

### Development
```bash
npm run dev  # Uses nodemon for auto-restart
```

### Production
```bash
npm start
```

For production deployment, consider using:
- PM2 for process management
- Docker for containerization
- Cloud platforms like Heroku, Railway, or DigitalOcean

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📞 Support

If you need help with the bot:
1. Check this README
2. Look at the console logs for errors
3. Join our support server (if available)
4. Create an issue on GitHub

---
.
**Happy coding! 🎉**

webhook mook look
