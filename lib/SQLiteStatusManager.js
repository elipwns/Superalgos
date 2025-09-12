// SQLite-based status manager to replace JSON status files
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class SQLiteStatusManager {
    constructor(dbPath = './data/bot_status.db') {
        this.dbPath = dbPath;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                // Create status table if it doesn't exist
                this.db.run(`
                    CREATE TABLE IF NOT EXISTS bot_status (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        report_key TEXT UNIQUE NOT NULL,
                        exchange TEXT NOT NULL,
                        pair TEXT NOT NULL,
                        bot_type TEXT NOT NULL,
                        last_file_timestamp INTEGER,
                        beginning_of_market_timestamp INTEGER,
                        ui_start_date TEXT,
                        last_candle_of_day TEXT,
                        must_load_raw_data INTEGER DEFAULT 0,
                        last_id TEXT,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    )
                `, (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        });
    }

    async getStatus(reportKey) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT * FROM bot_status 
                WHERE report_key = ?
            `, [reportKey], (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                
                if (!row) {
                    // Return empty status for new bots
                    resolve({
                        file: {},
                        status: 'OK'
                    });
                    return;
                }
                
                // Convert SQLite row to expected format
                const status = {
                    file: {
                        lastFile: row.last_file_timestamp ? this.timestampToDateObject(row.last_file_timestamp) : undefined,
                        beginingOfMarket: row.beginning_of_market_timestamp ? this.timestampToDateObject(row.beginning_of_market_timestamp) : undefined,
                        uiStartDate: row.ui_start_date ? new Date(row.ui_start_date) : undefined,
                        lastCandleOfTheDay: row.last_candle_of_day ? JSON.parse(row.last_candle_of_day) : undefined,
                        mustLoadRawData: Boolean(row.must_load_raw_data),
                        lastId: row.last_id
                    },
                    status: 'OK',
                    save: (callback) => this.saveStatus(reportKey, status.file, callback)
                };
                
                resolve(status);
            });
        });
    }

    async saveStatus(reportKey, fileData, callback) {
        try {
            const now = new Date().toISOString();
            
            // Extract exchange, pair, and bot type from report key
            const parts = reportKey.split('-');
            const exchange = parts[0] || 'unknown';
            const pair = parts[1] || 'unknown';
            const botType = parts[2] || 'unknown';
            
            await new Promise((resolve, reject) => {
                this.db.run(`
                    INSERT OR REPLACE INTO bot_status (
                        report_key, exchange, pair, bot_type,
                        last_file_timestamp, beginning_of_market_timestamp,
                        ui_start_date, last_candle_of_day, must_load_raw_data,
                        last_id, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    reportKey,
                    exchange,
                    pair,
                    botType,
                    fileData.lastFile ? this.dateObjectToTimestamp(fileData.lastFile) : null,
                    fileData.beginingOfMarket ? this.dateObjectToTimestamp(fileData.beginingOfMarket) : null,
                    fileData.uiStartDate ? fileData.uiStartDate.toISOString() : null,
                    fileData.lastCandleOfTheDay ? JSON.stringify(fileData.lastCandleOfTheDay) : null,
                    fileData.mustLoadRawData ? 1 : 0,
                    fileData.lastId || null,
                    now
                ], (err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
            
            if (callback) {
                callback({ result: 'Ok', message: 'Status saved successfully' });
            }
        } catch (error) {
            if (callback) {
                callback({ result: 'Fail', message: error.message });
            }
        }
    }

    timestampToDateObject(timestamp) {
        const date = new Date(timestamp);
        return {
            year: date.getUTCFullYear(),
            month: date.getUTCMonth() + 1,
            days: date.getUTCDate(),
            hours: date.getUTCHours(),
            minutes: date.getUTCMinutes()
        };
    }

    dateObjectToTimestamp(dateObj) {
        if (typeof dateObj === 'object' && dateObj.year) {
            // Convert SA date object format to timestamp
            return new Date(
                dateObj.year + "-" + 
                dateObj.month + "-" + 
                dateObj.days + " " + 
                (dateObj.hours || 0) + ":" + 
                (dateObj.minutes || 0) + ":00Z"
            ).getTime();
        } else if (dateObj instanceof Date) {
            return dateObj.getTime();
        }
        return null;
    }

    async getAllStatuses() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT report_key, exchange, pair, bot_type, 
                       last_file_timestamp, updated_at
                FROM bot_status 
                ORDER BY updated_at DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }
}

module.exports = SQLiteStatusManager;