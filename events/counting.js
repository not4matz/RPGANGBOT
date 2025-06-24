const { Events } = require('discord.js');
const database = require('../utils/database');

const COUNTING_CHANNEL_ID = '1225180419402502278';

module.exports = {
    name: Events.MessageCreate,
    async execute(message) {
        // Ignore bot messages
        if (message.author.bot) return;
        
        // Only process messages in the counting channel
        if (message.channel.id !== COUNTING_CHANNEL_ID) return;

        try {
            // Get or initialize counting data for this channel
            let countingData = await database.getCountingData(message.guild.id, message.channel.id);
            
            if (!countingData) {
                await database.initializeCounting(message.guild.id, message.channel.id);
                countingData = await database.getCountingData(message.guild.id, message.channel.id);
            }

            // Parse the message content as a number
            const messageNumber = parseInt(message.content.trim());
            
            // Check if the message is a valid number
            if (isNaN(messageNumber)) {
                await message.delete();
                const errorMsg = await message.channel.send(`❌ ${message.author}, please only send numbers in this channel!`);
                setTimeout(() => errorMsg.delete().catch(() => {}), 3000);
                return;
            }

            // Check if it's the correct next number
            const expectedNumber = countingData.current_number + 1;
            if (messageNumber !== expectedNumber) {
                await message.delete();
                const errorMsg = await message.channel.send(`❌ ${message.author}, the next number should be **${expectedNumber}**, not ${messageNumber}!`);
                setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
                return;
            }

            // Check if the same user is counting consecutively
            if (countingData.last_user_id === message.author.id) {
                await message.delete();
                const errorMsg = await message.channel.send(`❌ ${message.author}, you can't count twice in a row! Let someone else count **${expectedNumber}**.`);
                setTimeout(() => errorMsg.delete().catch(() => {}), 5000);
                return;
            }

            // Valid count! Update the database
            await database.updateCounting(
                message.guild.id, 
                message.channel.id, 
                messageNumber, 
                message.author.id
            );

            // Add reaction to show it's correct
            await message.react('✅');

            // Check for milestone numbers and celebrate
            if (messageNumber % 100 === 0) {
                await message.channel.send(`🎉 **Milestone reached!** We've hit **${messageNumber}**! 🎉`);
            } else if (messageNumber % 50 === 0) {
                await message.channel.send(`🌟 **${messageNumber}** - Great job everyone! 🌟`);
            }

        } catch (error) {
            console.error('Error in counting system:', error);
            const errorMsg = await message.channel.send('❌ An error occurred while processing the count.');
            setTimeout(() => errorMsg.delete().catch(() => {}), 3000);
        }
    },
};
