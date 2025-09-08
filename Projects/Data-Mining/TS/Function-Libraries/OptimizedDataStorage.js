exports.newDataMiningFunctionLibrariesOptimizedDataStorage = function () {
    const sqlite3 = require('sqlite3').verbose()
    const path = require('path')
    const fs = require('fs')

    let thisObject = {
        initialize: initialize,
        saveOHLCVBatch: saveOHLCVBatch,
        getOHLCVRange: getOHLCVRange,
        getLastTimestamp: getLastTimestamp,
        cleanup: cleanup
    }

    let db = null
    let dbPath = null

    return thisObject

    function initialize(exchangeName, symbol, callback) {
        try {
            // Create database directory if it doesn't exist
            const dbDir = path.join(process.cwd(), 'Data', 'SQLite')
            if (!fs.existsSync(dbDir)) {
                fs.mkdirSync(dbDir, { recursive: true })
            }

            // Create database file path
            const sanitizedSymbol = symbol.replace(/[^a-zA-Z0-9]/g, '_')
            dbPath = path.join(dbDir, `${exchangeName}_${sanitizedSymbol}.db`)

            // Open database connection
            db = new sqlite3.Database(dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err.message)
                    return callback(err)
                }

                // Create tables if they don't exist
                createTables(callback)
            })

        } catch (err) {
            callback(err)
        }
    }

    function createTables(callback) {
        const createOHLCVTable = `
            CREATE TABLE IF NOT EXISTS ohlcv (
                timestamp INTEGER PRIMARY KEY,
                open REAL NOT NULL,
                high REAL NOT NULL,
                low REAL NOT NULL,
                close REAL NOT NULL,
                volume REAL NOT NULL,
                created_at INTEGER DEFAULT (strftime('%s', 'now'))
            )
        `

        const createIndexes = `
            CREATE INDEX IF NOT EXISTS idx_ohlcv_timestamp ON ohlcv(timestamp);
            CREATE INDEX IF NOT EXISTS idx_ohlcv_created_at ON ohlcv(created_at);
        `

        db.serialize(() => {
            db.run(createOHLCVTable, (err) => {
                if (err) return callback(err)
                
                db.exec(createIndexes, (err) => {
                    if (err) return callback(err)
                    callback(null)
                })
            })
        })
    }

    function saveOHLCVBatch(ohlcvArray, callback) {
        if (!db || !ohlcvArray || ohlcvArray.length === 0) {
            return callback(new Error('Database not initialized or empty data'))
        }

        const stmt = db.prepare(`
            INSERT OR REPLACE INTO ohlcv (timestamp, open, high, low, close, volume)
            VALUES (?, ?, ?, ?, ?, ?)
        `)

        db.serialize(() => {
            db.run('BEGIN TRANSACTION')
            
            for (const ohlcv of ohlcvArray) {
                stmt.run([
                    ohlcv[0], // timestamp
                    ohlcv[1], // open
                    ohlcv[2], // high
                    ohlcv[3], // low
                    ohlcv[4], // close
                    ohlcv[5]  // volume
                ])
            }
            
            db.run('COMMIT', (err) => {
                stmt.finalize()
                if (err) return callback(err)
                callback(null, ohlcvArray.length)
            })
        })
    }

    function getOHLCVRange(startTimestamp, endTimestamp, callback) {
        if (!db) {
            return callback(new Error('Database not initialized'))
        }

        const query = `
            SELECT timestamp, open, high, low, close, volume
            FROM ohlcv
            WHERE timestamp >= ? AND timestamp <= ?
            ORDER BY timestamp ASC
        `

        db.all(query, [startTimestamp, endTimestamp], (err, rows) => {
            if (err) return callback(err)
            
            // Convert back to OHLCV array format
            const ohlcvArray = rows.map(row => [
                row.timestamp,
                row.open,
                row.high,
                row.low,
                row.close,
                row.volume
            ])
            
            callback(null, ohlcvArray)
        })
    }

    function getLastTimestamp(callback) {
        if (!db) {
            return callback(new Error('Database not initialized'))
        }

        const query = 'SELECT MAX(timestamp) as last_timestamp FROM ohlcv'
        
        db.get(query, (err, row) => {
            if (err) return callback(err)
            callback(null, row ? row.last_timestamp : null)
        })
    }

    function cleanup() {
        if (db) {
            db.close((err) => {
                if (err) {
                    console.error('Error closing database:', err.message)
                } else {
                    console.log('Database connection closed')
                }
            })
            db = null
        }
    }
}