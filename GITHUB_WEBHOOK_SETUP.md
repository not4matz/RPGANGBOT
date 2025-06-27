# 🚀 GitHub Webhook Setup Guide

This guide will help you set up automatic Discord notifications when you push commits to GitHub.

## 📋 Prerequisites

1. ✅ Discord webhook URL
2. ✅ GitHub repository
3. ✅ Server with public IP or domain
4. ✅ Port 3000 open on your server (or custom port)

## 🔧 Step 1: Environment Variables

Add these to your server's `.env` file:

```bash
# Discord webhook URL (same as before)
UPDATE_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_TOKEN

# GitHub webhook configuration
GITHUB_WEBHOOK_SECRET=your_secret_key_here
WEBHOOK_PORT=3000
```

**Generate a secret key:**
```bash
# On Linux/Mac
openssl rand -hex 20

# Or use any random string
echo "my_super_secret_webhook_key_12345"
```

## 🌐 Step 2: Configure GitHub Webhook

1. **Go to your GitHub repository**
2. **Settings** → **Webhooks** → **Add webhook**
3. **Configure the webhook:**
   ```
   Payload URL: http://your-server-ip:3000/webhook/github
   Content type: application/json
   Secret: your_secret_key_here (same as GITHUB_WEBHOOK_SECRET)
   Events: Just the push event
   Active: ✅ Checked
   ```

## 🚀 Step 3: Deploy to Server

1. **Upload your bot files to `~/bots/Goated`**
2. **Install dependencies:**
   ```bash
   cd ~/bots/Goated
   npm install
   ```
3. **Set environment variables in `.env`**
4. **Start the bot:**
   ```bash
   npm start
   # or with PM2
   pm2 start index.js --name "purple-bot"
   ```

## 🧪 Step 4: Test the Setup

1. **Check if webhook server is running:**
   ```bash
   curl http://your-server-ip:3000/health
   ```
   Should return: `{"status":"healthy","timestamp":"...","service":"Purple Bot Webhook Server"}`

2. **Test with a commit:**
   ```bash
   echo "test" >> README.md
   git add README.md
   git commit -m "Test GitHub webhook"
   git push origin main
   ```

3. **Check Discord channel** - you should see a purple notification! 💜

## 🎯 What You'll See

When you push to GitHub, you'll get a beautiful notification like this:

```
💜 GitHub Push Notification

2 commits pushed to main

📊 Change Statistics          ⚡ Push Info
Files Modified: 3             Author: YourName
Lines Added: +25              Repository: YourRepo
Lines Deleted: -5             Branch: main
Net Change: 🟢 +20            Status: Deployed ✅

📝 Latest Commit
```
Your latest commit message here
```

📋 Recent Commits (2)
• a1b2c3d Added new feature
• d4e5f6g Fixed bug in handler
```

## 🔧 Troubleshooting

### Webhook not receiving events:
- ✅ Check if port 3000 is open on your server
- ✅ Verify your server's public IP/domain is correct
- ✅ Check GitHub webhook delivery logs in repository settings

### Bot not sending Discord messages:
- ✅ Verify `UPDATE_WEBHOOK_URL` is set correctly
- ✅ Check Discord webhook permissions
- ✅ Look at bot console logs for errors

### Server errors:
- ✅ Check if Express is installed: `npm list express`
- ✅ Verify all environment variables are set
- ✅ Check server logs: `pm2 logs purple-bot`

## 🔒 Security Notes

- ✅ Always use a secret key for webhook verification
- ✅ Don't expose your webhook URLs publicly
- ✅ Consider using HTTPS in production
- ✅ Regularly rotate your secrets

## 🎉 Advanced Features

The webhook system supports:
- ✅ Multiple commit notifications
- ✅ Branch information
- ✅ File change statistics
- ✅ Author information
- ✅ Timestamp tracking
- ✅ Purple-themed embeds
- ✅ Automatic signature verification

## 📞 Need Help?

If the webhook isn't working:
1. Check the bot console logs
2. Check GitHub webhook delivery logs
3. Test the health endpoint
4. Verify all environment variables
5. Check firewall/port settings

---

**Happy coding! Your GitHub pushes will now automatically notify your Discord server! 🎉💜**
