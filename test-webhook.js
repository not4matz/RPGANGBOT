const { WebhookClient, EmbedBuilder } = require('discord.js');
require('dotenv').config();

async function testWebhook() {
    console.log('🔍 Testing webhook...');
    console.log('Webhook URL:', process.env.UPDATE_WEBHOOK_URL ? 'Set' : 'Not set');
    
    if (!process.env.UPDATE_WEBHOOK_URL) {
        console.log('❌ UPDATE_WEBHOOK_URL not found in environment');
        return;
    }
    
    try {
        const webhook = new WebhookClient({ url: process.env.UPDATE_WEBHOOK_URL });
        
        const embed = new EmbedBuilder()
            .setColor('#6A0DAD')
            .setTitle('🧪 Webhook Test')
            .setDescription('This is a test message to verify webhook functionality')
            .setTimestamp();
        
        await webhook.send({ embeds: [embed] });
        console.log('✅ Test webhook sent successfully!');
        
    } catch (error) {
        console.error('❌ Webhook test failed:', error.message);
        console.error('Full error:', error);
    }
}

testWebhook();
