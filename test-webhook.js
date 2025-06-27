#!/usr/bin/env node

/**
 * Test script to debug webhook issues on server
 */

console.log('🔍 Testing webhook system...');
console.log('📁 Current directory:', process.cwd());
console.log('🌍 Environment variables:');
console.log('  - UPDATE_WEBHOOK_URL:', process.env.UPDATE_WEBHOOK_URL ? 'SET' : 'NOT SET');
console.log('  - NODE_ENV:', process.env.NODE_ENV || 'not set');

// Test if webhook module can be loaded
try {
    console.log('📦 Loading webhook module...');
    const webhook = require('./utils/webhook');
    console.log('✅ Webhook module loaded successfully');
    
    // Test sending a notification
    console.log('📡 Testing webhook notification...');
    webhook.sendUpdateNotification({
        title: 'Server Test',
        description: 'Testing webhook from server',
        filesChanged: 1,
        linesAdded: 5,
        linesDeleted: 0,
        author: 'Server Test',
        timestamp: new Date()
    }).then(() => {
        console.log('✅ Test notification sent successfully!');
    }).catch(error => {
        console.error('❌ Test notification failed:', error.message);
    });
    
} catch (error) {
    console.error('❌ Failed to load webhook module:', error.message);
    console.error('📍 Make sure you are in the correct directory and dependencies are installed');
}

// Test git webhook script
try {
    console.log('📦 Testing git webhook script...');
    const GitAnalyzer = require('./scripts/git-webhook');
    console.log('✅ Git webhook script loaded successfully');
} catch (error) {
    console.error('❌ Failed to load git webhook script:', error.message);
}
