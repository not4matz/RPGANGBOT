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

        const createWakeupPermissionsTable = `
            CREATE TABLE IF NOT EXISTS wakeup_permissions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                allowed BOOLEAN DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, guild_id)
            )
        `;

        const createJailTable = `
            CREATE TABLE IF NOT EXISTS jail (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                reason TEXT,
                jail_time INTEGER NOT NULL,
                jail_end_time INTEGER NOT NULL,
                jailed_by TEXT NOT NULL,
                original_roles TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, guild_id)
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

        this.db.run(createWakeupPermissionsTable, (err) => {
            if (err) {
                console.error('❌ Error creating wakeup_permissions table:', err.message);
            } else {
                console.log('✅ Wakeup permissions table ready');
            }
        });

        this.db.run(createJailTable, (err) => {
            if (err) {
                console.error('❌ Error creating jail table:', err.message);
            } else {
                console.log('✅ Jail table ready');
            }
        });

        // Initialize Join2Create tables
        this.initJoin2CreateTable().then(() => {
            console.log('✅ Join2Create config table ready');
        }).catch(err => {
            console.error('❌ Error creating join2create_config table:', err.message);
        });

        this.initJoin2CreateChannelsTable().then(() => {
            console.log('✅ Join2Create channels table ready');
        }).catch(err => {
            console.error('❌ Error creating join2create_channels table:', err.message);
        });

        // Run migrations to add missing columns
        this.runMigrations();
    }

    runMigrations() {
        // Check if voice columns exist and add them if they don't
        this.db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
                console.error('❌ Error checking table structure:', err.message);
                return;
            }

            const columnNames = columns.map(col => col.name);
            const requiredColumns = [
                { name: 'voice_time_minutes', type: 'INTEGER DEFAULT 0' },
                { name: 'voice_join_time', type: 'INTEGER DEFAULT 0' },
                { name: 'last_voice_xp_time', type: 'INTEGER DEFAULT 0' }
            ];

            requiredColumns.forEach(column => {
                if (!columnNames.includes(column.name)) {
                    const alterQuery = `ALTER TABLE users ADD COLUMN ${column.name} ${column.type}`;
                    this.db.run(alterQuery, (err) => {
                        if (err) {
                            console.error(`❌ Error adding column ${column.name}:`, err.message);
                        } else {
                            console.log(`✅ Added missing column: ${column.name}`);
                        }
                    });
                }
            });
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
    getLeaderboard(guildId, limit = 10, offset = 0) {
        return new Promise((resolve, reject) => {
            const query = `
                SELECT user_id, xp, level, total_messages, voice_time_minutes
                FROM users 
                WHERE guild_id = ? 
                ORDER BY xp DESC 
                LIMIT ? OFFSET ?
            `;
            this.db.all(query, [guildId, limit, offset], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // Get total number of users in a guild
    getTotalUsers(guildId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT COUNT(*) as count FROM users WHERE guild_id = ?';
            this.db.get(query, [guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row ? row.count : 0);
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

    // Set user XP to a specific amount
    setUserXP(userId, guildId, newXP) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO users (user_id, guild_id, xp, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET
                    xp = ?,
                    updated_at = CURRENT_TIMESTAMP
            `;
            
            this.db.run(query, [userId, guildId, newXP, newXP], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Clear all voice join times for a guild (emergency cleanup)
    clearAllVoiceJoinTimes(guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET voice_join_time = 0, 
                    last_voice_xp_time = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE guild_id = ?
            `;
            this.db.run(query, [guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Reset all voice minutes for a guild (owner only)
    resetAllVoiceMinutes(guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE users 
                SET voice_time_minutes = 0,
                    updated_at = CURRENT_TIMESTAMP
                WHERE guild_id = ?
            `;
            this.db.run(query, [guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Join2Create Configuration Methods
    async initJoin2CreateTable() {
        return new Promise((resolve, reject) => {
            const query = `
                CREATE TABLE IF NOT EXISTS join2create_config (
                    guild_id TEXT PRIMARY KEY,
                    trigger_channel_id TEXT,
                    control_channel_id TEXT,
                    category_id TEXT,
                    enabled BOOLEAN DEFAULT 1,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;
            this.db.run(query, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    async initJoin2CreateChannelsTable() {
        return new Promise((resolve, reject) => {
            const query = `
                CREATE TABLE IF NOT EXISTS join2create_channels (
                    channel_id TEXT PRIMARY KEY,
                    guild_id TEXT,
                    owner_id TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (guild_id) REFERENCES join2create_config(guild_id)
                )
            `;
            this.db.run(query, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    setJoin2CreateConfig(guildId, config) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT OR REPLACE INTO join2create_config 
                (guild_id, trigger_channel_id, control_channel_id, category_id, enabled, updated_at)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            `;
            this.db.run(query, [
                guildId, 
                config.triggerChannelId, 
                config.controlChannelId, 
                config.categoryId, 
                config.enabled ? 1 : 0
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    getJoin2CreateConfig(guildId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM join2create_config WHERE guild_id = ?`;
            this.db.get(query, [guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    if (row) {
                        resolve({
                            triggerChannelId: row.trigger_channel_id,
                            controlChannelId: row.control_channel_id,
                            categoryId: row.category_id,
                            enabled: Boolean(row.enabled)
                        });
                    } else {
                        resolve(null);
                    }
                }
            });
        });
    }

    addJoin2CreateChannel(channelId, guildId, ownerId) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO join2create_channels (channel_id, guild_id, owner_id)
                VALUES (?, ?, ?)
            `;
            this.db.run(query, [channelId, guildId, ownerId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    getJoin2CreateChannel(channelId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM join2create_channels WHERE channel_id = ?`;
            this.db.get(query, [channelId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    removeJoin2CreateChannel(channelId) {
        return new Promise((resolve, reject) => {
            const query = `DELETE FROM join2create_channels WHERE channel_id = ?`;
            this.db.run(query, [channelId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    getJoin2CreateChannelsByOwner(guildId, ownerId) {
        return new Promise((resolve, reject) => {
            const query = `SELECT * FROM join2create_channels WHERE guild_id = ? AND owner_id = ?`;
            this.db.all(query, [guildId, ownerId], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
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

    // Wakeup permissions methods
    // Get wakeup permissions for a user
    getWakeupPermissions(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM wakeup_permissions WHERE user_id = ? AND guild_id = ?';
            this.db.get(query, [userId, guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Initialize wakeup permissions for a user
    initializeWakeupPermissions(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO wakeup_permissions (user_id, guild_id, allowed, updated_at)
                VALUES (?, ?, 1, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, guild_id) DO NOTHING
            `;
            this.db.run(query, [userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    // Update wakeup permissions for a user
    updateWakeupPermissions(userId, guildId, allowed) {
        return new Promise((resolve, reject) => {
            const query = `
                UPDATE wakeup_permissions 
                SET allowed = ?, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE user_id = ? AND guild_id = ?
            `;
            this.db.run(query, [allowed, userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Set wakeup permissions for a user (upsert)
    setWakeupPermissions(userId, guildId, allowed) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO wakeup_permissions (user_id, guild_id, allowed, updated_at)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET
                    allowed = excluded.allowed,
                    updated_at = CURRENT_TIMESTAMP
            `;
            this.db.run(query, [userId, guildId, allowed], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID || this.changes);
                }
            });
        });
    }

    // Delete wakeup permissions for a user
    deleteWakeupPermissions(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM wakeup_permissions WHERE user_id = ? AND guild_id = ?';
            this.db.run(query, [userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Jail system methods
    // Add user to jail
    jailUser(userId, guildId, reason, jailTimeMinutes, jailedBy, originalRoles) {
        return new Promise((resolve, reject) => {
            const jailEndTime = Date.now() + (jailTimeMinutes * 60 * 1000);
            const query = `
                INSERT INTO jail (user_id, guild_id, reason, jail_time, jail_end_time, jailed_by, original_roles)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(user_id, guild_id) DO UPDATE SET
                    reason = excluded.reason,
                    jail_time = excluded.jail_time,
                    jail_end_time = excluded.jail_end_time,
                    jailed_by = excluded.jailed_by,
                    original_roles = excluded.original_roles,
                    created_at = CURRENT_TIMESTAMP
            `;
            this.db.run(query, [userId, guildId, reason, jailTimeMinutes, jailEndTime, jailedBy, originalRoles], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.lastID || this.changes);
                }
            });
        });
    }

    // Get jail data for a user
    getJailData(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = 'SELECT * FROM jail WHERE user_id = ? AND guild_id = ?';
            this.db.get(query, [userId, guildId], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // Remove user from jail
    unjailUser(userId, guildId) {
        return new Promise((resolve, reject) => {
            const query = 'DELETE FROM jail WHERE user_id = ? AND guild_id = ?';
            this.db.run(query, [userId, guildId], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this.changes);
                }
            });
        });
    }

    // Get all expired jail entries
    getExpiredJails(guildId) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const query = 'SELECT * FROM jail WHERE guild_id = ? AND jail_end_time <= ?';
            this.db.all(query, [guildId, now], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
                }
            });
        });
    }

    // Get all active jails for a guild
    getActiveJails(guildId) {
        return new Promise((resolve, reject) => {
            const now = Date.now();
            const query = 'SELECT * FROM jail WHERE guild_id = ? AND jail_end_time > ?';
            this.db.all(query, [guildId, now], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows || []);
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
