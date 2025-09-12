const StorageInterface = require('./StorageInterface')

class SQLiteStorage extends StorageInterface {
    constructor(config) {
        super()
        this.adapter = null
        this.config = config
    }

    async _getAdapter() {
        if (!this.adapter) {
            // Create a simple SQLite adapter using better-sqlite3
            const Database = require('better-sqlite3')
            const path = require('path')
            
            this.adapter = {
                readFile: async (filePath) => {
                    // console.log(`🔍 SQLite READ: ${filePath}`) // Reduced logging
                    // Check if this is an OHLCV data file request
                    if (filePath.includes('OHLCVs') && filePath.endsWith('Data.json')) {
                        const dbName = this.getDbNameFromPath(filePath)
                        const Database = require('better-sqlite3')
                        const path = require('path')
                        
                        try {
                            const db = new Database(path.join(this.config.path, dbName + '.db'), { readonly: true })
                            
                            // Check if ohlcv table exists
                            const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ohlcv'").all()
                            if (tables.length === 0) {
                                db.close()
                                return JSON.stringify([])
                            }
                            
                            // Get OHLCV data in the format Superalgos expects: [timestamp, open, high, low, close, volume]
                            const ohlcvData = db.prepare('SELECT timestamp, open, high, low, close, volume FROM ohlcv ORDER BY timestamp').all()
                            
                            // Simple check: just need some data to start processing
                            if (ohlcvData.length === 0) {
                                console.log(`⏳ Waiting: No raw data available yet`)
                                db.close()
                                return JSON.stringify([])
                            }
                            
                            // Quiet logging - only log on first read or errors
                            // if (ohlcvData.length > 1000) {
                            //     const actualStartDate = new Date(ohlcvData[0].timestamp)
                            //     const actualEndDate = new Date(ohlcvData[ohlcvData.length-1].timestamp)
                            //     const expectedRecords = Math.floor((actualEndDate - actualStartDate) / (60 * 1000)) + 1
                            //     const completeness = (ohlcvData.length / expectedRecords) * 100
                            //     console.log(`📊 Read ${ohlcvData.length} OHLCV records (${completeness.toFixed(1)}% complete)`)
                            // }
                            db.close()
                            
                            // Convert to array format expected by Superalgos
                            const formattedData = ohlcvData.map(row => [
                                row.timestamp, row.open, row.high, row.low, row.close, row.volume
                            ])
                            
                            return JSON.stringify(formattedData)
                        } catch (error) {
                            console.log('SQLite read error:', error.message)
                            return JSON.stringify([])
                        }
                    }
                    
                    // Check if this is indicator data that might be in SQLite
                    const tableName = this.getTableNameFromPath(filePath)
                    if (tableName) {
                        const dbName = this.getDbNameFromPath(filePath)
                        const Database = require('better-sqlite3')
                        const path = require('path')
                        
                        try {
                            const db = new Database(path.join(this.config.path, dbName + '.db'), { readonly: true })
                            
                            // Check if indicator table exists
                            const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${tableName}'`).all()
                            if (tables.length > 0) {
                                const result = db.prepare(`SELECT data FROM ${tableName} WHERE id = 1`).get()
                                db.close()
                                return result ? result.data : JSON.stringify([])
                            }
                            db.close()
                        } catch (error) {
                            console.log('SQLite indicator read error:', error.message)
                        }
                    }
                    
                    // Fallback to JSON for existing processed data
                    const JSONStorage = require('./JSONStorage')
                    const jsonStorage = new JSONStorage()
                    
                    try {
                        return await jsonStorage.readFile(filePath)
                    } catch (error) {
                        return JSON.stringify([])
                    }
                },
                writeFile: async (filePath, data) => {
                    // Reduced write logging
                    
                    // All data goes to SQLite - no JSON files created
                    const pathParts = filePath.split('/')
                    const fileName = pathParts[pathParts.length - 1]
                    
                    if (fileName === 'Data.json') {
                        const dbName = this.getDbNameFromPath(filePath)
                        // console.log(`🗄️  Database: ${dbName}.db`)
                        const db = new Database(path.join(this.config.path, dbName + '.db'))
                        
                        // Enable WAL mode for better concurrency
                        db.pragma('journal_mode = WAL')
                        db.pragma('synchronous = NORMAL')
                        db.pragma('cache_size = 1000000')
                        db.pragma('temp_store = memory')
                        
                        if (filePath.includes('Candles')) {
                            // console.log(`🕯️  Processing CANDLES data`)
                            // Candles: [min, max, open, close, begin, end]
                            db.exec(`CREATE TABLE IF NOT EXISTS candles (
                                timestamp INTEGER PRIMARY KEY,
                                min REAL, max REAL, open REAL, close REAL, begin INTEGER, end INTEGER
                            )`)
                            const candlesData = JSON.parse(data)
                            
                            // Check what's already in the database
                            const lastCandle = db.prepare('SELECT MAX(timestamp) as lastTimestamp FROM candles').get()
                            const lastTimestamp = lastCandle ? lastCandle.lastTimestamp : 0
                            
                            // Filter to only new records
                            const newCandles = candlesData.filter(record => record[4] > lastTimestamp)
                            
                            if (newCandles.length === 0) {
                                // console.log('⏭️  No new candle records to insert')
                                return
                            }
                            
                            // Minimal logging for candles
                            if (newCandles.length > 1000) {
                                console.log(`📈 Processing ${newCandles.length} NEW candles`)
                            }
                            const insert = db.prepare('INSERT OR REPLACE INTO candles VALUES (?, ?, ?, ?, ?, ?, ?)')
                            
                            // Use transaction for batch insert - much faster
                            const insertMany = db.transaction((records) => {
                                for (const record of records) {
                                    insert.run(record[4], record[0], record[1], record[2], record[3], record[4], record[5])
                                }
                            })
                            insertMany(newCandles)
                            // console.log(`✅ Inserted ${candlesData.length} candle records`)
                            
                        } else if (filePath.includes('Volumes')) {
                            // console.log(`📊 Processing VOLUMES data`)
                            // Volumes: [buy, sell, begin, end]
                            db.exec(`CREATE TABLE IF NOT EXISTS volumes (
                                timestamp INTEGER PRIMARY KEY,
                                buy REAL, sell REAL, begin INTEGER, end INTEGER
                            )`)
                            const volumesData = JSON.parse(data)
                            
                            // Check what's already in the database
                            const lastVolume = db.prepare('SELECT MAX(timestamp) as lastTimestamp FROM volumes').get()
                            const lastTimestamp = lastVolume ? lastVolume.lastTimestamp : 0
                            
                            // Filter to only new records
                            const newVolumes = volumesData.filter(record => record[2] > lastTimestamp)
                            
                            if (newVolumes.length === 0) {
                                // console.log('⏭️  No new volume records to insert')
                                return
                            }
                            

                            const insert = db.prepare('INSERT OR REPLACE INTO volumes VALUES (?, ?, ?, ?, ?)')
                            
                            // Use transaction for batch insert - much faster
                            const insertMany = db.transaction((records) => {
                                for (const record of records) {
                                    insert.run(record[2], record[0], record[1], record[2], record[3])
                                }
                            })
                            insertMany(newVolumes)
                            // console.log(`✅ Inserted ${volumesData.length} volume records`)
                        } else if (filePath.includes('OHLCVs')) {
                            // console.log(`📊 Processing OHLCV data`)
                            // Check existing table structure first
                            const tableInfo = db.prepare("PRAGMA table_info(ohlcv)").all()
                            // console.log(`🗄️  OHLCV table columns: ${tableInfo.length}`)
                            
                            if (tableInfo.length === 0) {
                                // Create new table
                                console.log(`🆕 Creating new OHLCV table`)
                                db.exec(`CREATE TABLE ohlcv (
                                    timestamp INTEGER PRIMARY KEY,
                                    open REAL, high REAL, low REAL, close REAL, volume REAL
                                )`)
                            }
                            
                            // Use appropriate insert based on table structure
                            const ohlcvData = JSON.parse(data)
                            
                            // Check what's already in the database to avoid reprocessing
                            const lastRecord = db.prepare('SELECT MAX(timestamp) as lastTimestamp FROM ohlcv').get()
                            const lastTimestamp = lastRecord ? lastRecord.lastTimestamp : 0
                            
                            // Filter to only new records
                            const newRecords = ohlcvData.filter(record => record[0] > lastTimestamp)
                            
                            if (newRecords.length === 0) {
                                // console.log('⏭️  No new OHLCV records to insert')
                                return
                            }
                            
                            // Only log significant OHLCV batches
                            if (newRecords.length > 1000) {
                                console.log(`📈 Processing ${newRecords.length} NEW OHLCV records`)
                            }
                            let insert
                            
                            if (tableInfo.length === 7) {
                                // Existing 7-column table - skip for now to avoid conflicts
                                console.log('⚠️  Skipping OHLCV insert - existing table has different structure')
                                return
                            } else {
                                // Our 6-column table with transaction - only insert NEW records
                                insert = db.prepare('INSERT OR REPLACE INTO ohlcv VALUES (?, ?, ?, ?, ?, ?)')
                                const insertMany = db.transaction((records) => {
                                    for (const record of records) {
                                        insert.run(record[0], record[1], record[2], record[3], record[4], record[5])
                                    }
                                })
                                insertMany(newRecords)
                            }
                        } else {
                            // Handle other indicator data (Bollinger Bands, RSI, etc.)
                            const tableName = this.getTableNameFromPath(filePath)
                            if (tableName) {
                                // Create generic indicator table
                                db.exec(`CREATE TABLE IF NOT EXISTS ${tableName} (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    data TEXT,
                                    created_at INTEGER DEFAULT (strftime('%s', 'now'))
                                )`)
                                
                                // Store the entire JSON data
                                const insert = db.prepare(`INSERT OR REPLACE INTO ${tableName} (id, data) VALUES (1, ?)`)
                                insert.run(data)
                            }
                        }
                        
                        db.close()
                    }
                    // Don't create any files - everything goes to SQLite
                },
                exists: async (filePath) => true,
                deleteFile: async (filePath) => {},
                listFiles: async (dirPath) => []
            }
        }
        return this.adapter
    }
    
    getTableNameFromPath(filePath) {
        // Extract indicator name from path for table naming
        // Path: Project/.../Masters/Bollinger-Bands/.../Data.json -> bollinger_bands
        const pathParts = filePath.split('/')
        for (let i = 0; i < pathParts.length; i++) {
            if (pathParts[i] === 'Masters' && i + 1 < pathParts.length) {
                return pathParts[i + 1].toLowerCase().replace(/-/g, '_')
            }
        }
        return null
    }
    
    getDbNameFromPath(filePath) {
        // Extract exchange and symbol from path to create unique database name
        // Path format: Output/Candles/One-Min/2023/01/25/Data.json
        
        // For now, determine from global task constants if available
        try {
            const exchange = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config.codeName
            const baseAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.config.codeName
            const quotedAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.config.codeName
            return `${exchange}_${baseAsset}_${quotedAsset}`
        } catch (e) {
            // Fallback to parsing from path or default
            if (filePath.includes('BTC')) return 'bitstamp_BTC_USD'
            if (filePath.includes('ETH')) return 'bitstamp_ETH_USD'
            if (filePath.includes('DOGE')) return 'bitstamp_DOGE_USD'
            if (filePath.includes('BTC')) return 'bitstamp_BTC_USD'
            return 'bitstamp_UNKNOWN'
        }
    }

    async readFile(filePath) {
        const adapter = await this._getAdapter()
        return await adapter.readFile(filePath)
    }

    async writeFile(filePath, data) {
        const adapter = await this._getAdapter()
        return await adapter.writeFile(filePath, data)
    }

    async exists(filePath) {
        const adapter = await this._getAdapter()
        return await adapter.exists(filePath)
    }

    async deleteFile(filePath) {
        const adapter = await this._getAdapter()
        return await adapter.deleteFile(filePath)
    }

    async listFiles(dirPath) {
        const adapter = await this._getAdapter()
        return await adapter.listFiles(dirPath)
    }
}

module.exports = SQLiteStorage