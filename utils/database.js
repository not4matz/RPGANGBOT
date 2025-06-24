const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
    constructor() {
        this.db = null;
        this.init();
    }

    init() {
        const dbPath = path.join(__dirname, '..', 'levels.db');
        this.db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('❌ Error opening database:', err.message);
            } else {
                console.log('✅ Connected to SQLite database');
                this.createTables();
            }
        });
    }

    createTables() {
        const createUsersTable = `
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                xp INTEGER DEFAULT 0,
                level INTEGER DEFAULT 1,
                total_messages INTEGER DEFAULT 0,
                voice_time_minutes INTEGER DEFAULT 0,
                last_message_time INTEGER DEFAULT 0,
                voice_join_time INTEGER DEFAULT 0,
                last_voice_xp_time INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, guild_id)
            )
        `;

        const createCountingTable = `
            CREATE TABLE IF NOT EXISTS counting (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                guild_id TEXT NOT NULL,
                channel_id TEXT NOT NULL,
                current_number INTEGER DEFAULT 0,
                last_user_id TEXT,
                highest_number INTEGER DEFAULT 0,
                total_counts INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(guild_id, channel_id)
            )
        `;

        this.db.run(createUsersTable, (err) => {
            if (err) {
                console.error('❌ Error creating users table:', err.message);
            } else {
                console.log('✅ Users table ready');
            }
        });

        this.db.run(createCountingTable, (err) => {
            if (err) {
                console.error('❌ Error creating counting table:', err.message);
            } else {
                console.log('✅ Counting table ready');
            }
        });
    }

    // Get user data
    getUser(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM users WHERE user_id = ? AND guild_id = ?';
            this.db.get(query, [userId, guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Create or update user
    upsertUser(userId, guildId, xpGain = 0) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const query = `
                INSERT INTO users (user_id, guild_id, xp, total_messages, last_message_time, updated_at)
                VALUES (?, ?, ?, 1, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET
                    xp = xp + ?,
                    total_messages = total_messages + 1,
                    last_message_time = ?,
                    updated_at = CURRENT_TIMESTAMP
            `;
            
            this.db.run(query, [userId, guildId, xpGain, now, xpGain, now], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Update user level
    updateUserLevel(userId, guildId, newLevel) {
        return new Promise((resolve, reject) => {
            const query = 'UPDATE users SET level = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ? AND guild_id = ?';
            this.db.run(query, [newLevel, userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Get leaderboard
    getLeaderboard(guildId, limit = 10) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT user_id, xp, level, total_messages, voice_time_minutes
                FROM users 
                WHERE guild_id = ? 
                ORDER BY xp DESC 
                LIMIT ?
            `;
            this.db.all(query, [guildId, limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Get user rank
    getUserRank(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT COUNT(*) + 1 as rank
                FROM users 
                WHERE guild_id = ? AND xp > (
                    SELECT xp FROM users WHERE user_id = ? AND guild_id = ?
                )
            `;
            this.db.get(query, [guildId, userId, guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.rank : null);
                }
            });
        });
    }

    // Reset user data (owner only)
    resetUser(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM users WHERE user_id = ? AND guild_id = ?';
            this.db.run(query, [userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Reset all guild data (owner only)
    resetGuild(guildId) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM users WHERE guild_id = ?';
            this.db.run(query, [guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Update voice join time
    updateVoiceJoinTime(userId, guildId, joinTime = Date.now()) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET voice_join_time = ?, updated_at = CURRENT_TIMESTAMP 
                WHERE user_id = ? AND guild_id = ?
            `;
            this.db.run(query, [joinTime, userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Add voice XP and update voice time
    addVoiceXP(userId, guildId, xpGain, minutesInVoice) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const query = `
                INSERT INTO users (user_id, guild_id, xp, voice_time_minutes, last_voice_xp_time, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET
                    xp = xp + ?,
                    voice_time_minutes = voice_time_minutes + ?,
                    last_voice_xp_time = ?,
                    updated_at = CURRENT_TIMESTAMP
            `;
            
            this.db.run(query, [userId, guildId, xpGain, minutesInVoice, now, xpGain, minutesInVoice, now], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Clear voice join time (when user leaves voice)
    clearVoiceJoinTime(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET voice_join_time = 0, updated_at = CURRENT_TIMESTAMP 
                WHERE user_id = ? AND guild_id = ?
            `;
            this.db.run(query, [userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Get users currently in voice channels
    getUsersInVoice(guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT user_id, voice_join_time, last_voice_xp_time
                FROM users 
                WHERE guild_id = ? AND voice_join_time > 0
            `;
            this.db.all(query, [guildId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Set user XP and level (admin function)
    setUserXP(userId, guildId, xp, level) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO users (user_id, guild_id, xp, level, updated_at)
                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET
                    xp = ?,
                    level = ?,
                    updated_at = CURRENT_TIMESTAMP
            `;
            
            this.db.run(query, [userId, guildId, xp, level, xp, level], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Counting system methods
    // Get counting data for a channel
    getCountingData(guildId, channelId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM counting WHERE guild_id = ? AND channel_id = ?';
            this.db.get(query, [guildId, channelId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Initialize counting for a channel
    initializeCounting(guildId, channelId) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO counting (guild_id, channel_id, current_number, highest_number, total_counts, updated_at)
                VALUES (?, ?, 0, 0, 0, CURRENT_TIMESTAMP)
                ON CONFLICT(guild_id, channel_id) DO NOTHING
            `;
            this.db.run(query, [guildId, channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Update counting data
    updateCounting(guildId, channelId, newNumber, userId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE counting 
                SET current_number = ?, 
                    last_user_id = ?, 
                    highest_number = MAX(highest_number, ?),
                    total_counts = total_counts + 1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE guild_id = ? AND channel_id = ?
            `;
            this.db.run(query, [newNumber, userId, newNumber, guildId, channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Reset counting for a channel
    resetCounting(guildId, channelId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE counting 
                SET current_number = 0, 
                    last_user_id = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE guild_id = ? AND channel_id = ?
            `;
            this.db.run(query, [guildId, channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Set counting number for a channel
    setCountingNumber(guildId, channelId, number) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE counting 
                SET current_number = ?, 
                    highest_number = MAX(highest_number, ?),
                    updated_at = CURRENT_TIMESTAMP
                WHERE guild_id = ? AND channel_id = ?
            `;
            this.db.run(query, [number, number, guildId, channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Delete counting data for a channel
    deleteCounting(guildId, channelId) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM counting WHERE guild_id = ? AND channel_id = ?';
            this.db.run(query, [guildId, channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
            });
        }
    }
}

module.exports = new Database();
