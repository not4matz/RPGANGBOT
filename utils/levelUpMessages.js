/**
 * Centralized level-up message utilities
 * Eliminates code duplication and provides consistent level-up messaging
 */

const { EmbedBuilder } = require('discord.js');
const LEVELING_CONFIG = require('../config/levelingConfig');
const { getLevelColor, getLevelBadge, formatXP } = require('./leveling');

/**
 * Find the best channel to send level-up messages
 * @param {Guild} guild - Discord guild
 * @returns {TextChannel|null} - Best channel to send to, or null if none found
 */
function findLevelUpChannel(guild) {
    // Try the configured level-up channel first
    const levelUpChannel = guild.channels.cache.get(LEVELING_CONFIG.LEVEL_UP_CHANNEL_ID);
    if (levelUpChannel && levelUpChannel.isTextBased()) {
        return levelUpChannel;
    }
    
    // Log warning if configured channel not found
    if (LEVELING_CONFIG.LEVEL_UP_CHANNEL_ID !== '1361198962488381490') { // Only warn if not default
        console.warn(`⚠️ Configured level-up channel ${LEVELING_CONFIG.LEVEL_UP_CHANNEL_ID} not found, searching for fallback`);
    }
    
    // Search for fallback channels in order of preference
    for (const channelName of LEVELING_CONFIG.FALLBACK_CHANNEL_NAMES) {
        const fallbackChannel = guild.channels.cache.find(ch => 
            ch.isTextBased() && 
            ch.name.toLowerCase().includes(channelName.toLowerCase())
        );
        if (fallbackChannel) {
            console.log(`📢 Using fallback channel: ${fallbackChannel.name} for level-up messages`);
            return fallbackChannel;
        }
    }
    
    // Last resort: find any text channel the bot can send to
    const anyTextChannel = guild.channels.cache.find(ch => 
        ch.isTextBased() && 
        ch.permissionsFor(guild.members.me)?.has(['SendMessages', 'EmbedLinks'])
    );
    
    if (anyTextChannel) {
        console.log(`📢 Using any available channel: ${anyTextChannel.name} for level-up messages`);
        return anyTextChannel;
    }
    
    console.error('❌ No suitable channel found for level-up messages');
    return null;
}

/**
 * Create a standardized level-up embed
 * @param {GuildMember} member - Discord guild member
 * @param {number} newLevel - New level achieved
 * @param {object} userData - User data from database
 * @param {string} source - Source of level-up ('message' or 'voice')
 * @returns {EmbedBuilder} - Level-up embed
 */
function createLevelUpEmbed(member, newLevel, userData, source = 'message') {
    const levelColor = getLevelColor(newLevel);
    const levelBadge = getLevelBadge(newLevel);
    const isVoice = source === 'voice';
    
    // Special handling for easter egg user
    const isEasterEgg = newLevel === LEVELING_CONFIG.EASTER_EGG_LEVEL;
    
    const embed = new EmbedBuilder()
        .setTitle(`🎉 Level Up! ${levelBadge}`)
        .setDescription(`${member} ${isEasterEgg ? 'remains eternal at' : 'reached'} **Level ${newLevel}**!`)
        .setColor(levelColor)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            {
                name: '💜 **Stats**',
                value: `**XP:** ${formatXP(userData.xp)}\n**Messages:** ${userData.total_messages?.toLocaleString() || 0}\n**Voice Time:** ${Math.floor((userData.voice_time_minutes || 0) / 60)}h ${(userData.voice_time_minutes || 0) % 60}m`,
                inline: true
            }
        )
        .setFooter({
            text: isVoice ? LEVELING_CONFIG.EMBED_FOOTER_VOICE_TEXT : LEVELING_CONFIG.EMBED_FOOTER_TEXT,
            iconURL: member.guild.iconURL()
        })
        .setTimestamp();
    
    return embed;
}

/**
 * Send level-up message to appropriate channel
 * @param {Guild} guild - Discord guild
 * @param {GuildMember} member - Discord guild member
 * @param {number} newLevel - New level achieved
 * @param {object} userData - User data from database
 * @param {string} source - Source of level-up ('message' or 'voice')
 * @param {TextChannel} fallbackChannel - Fallback channel if main channel fails
 * @returns {Promise<boolean>} - True if message was sent successfully
 */
async function sendLevelUpMessage(guild, member, newLevel, userData, source = 'message', fallbackChannel = null) {
    try {
        const levelUpEmbed = createLevelUpEmbed(member, newLevel, userData, source);
        const targetChannel = findLevelUpChannel(guild);
        
        if (!targetChannel) {
            console.error(`❌ No channel available for level-up message for ${member.user.tag}`);
            return false;
        }
        
        // Try to send to the target channel
        try {
            await targetChannel.send({ embeds: [levelUpEmbed] });
            console.log(`🎉 ${member.user.tag} leveled up to ${newLevel} via ${source} in ${guild.name}`);
            return true;
        } catch (channelError) {
            console.warn(`⚠️ Failed to send level-up message to ${targetChannel.name}:`, channelError.message);
            
            // Try fallback channel if provided
            if (fallbackChannel && fallbackChannel !== targetChannel) {
                try {
                    await fallbackChannel.send({ embeds: [levelUpEmbed] });
                    console.log(`🎉 ${member.user.tag} leveled up to ${newLevel} via ${source} (sent to fallback channel)`);
                    return true;
                } catch (fallbackError) {
                    console.error('❌ Failed to send fallback level-up message:', fallbackError.message);
                }
            }
        }
        
        return false;
    } catch (error) {
        console.error('❌ Error creating/sending level-up message:', error);
        return false;
    }
}

module.exports = {
    findLevelUpChannel,
    createLevelUpEmbed,
    sendLevelUpMessage
};
