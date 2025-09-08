exports.newDataMiningFunctionLibrariesGlobalSQLiteVFS = function () {
    const originalReadFile = require('fs').readFile
    const originalReadFileSync = require('fs').readFileSync
    const originalExistsSync = require('fs').existsSync
    
    let thisObject = {
        initialize: initialize,
        addExchangeSymbol: addExchangeSymbol
    }

    let storageMap = new Map() // Map of "exchange-symbol" -> dataStorage
    let isInitialized = false

    return thisObject

    function initialize() {
        if (isInitialized) return
        
        // Override fs functions globally
        require('fs').readFile = function(filePath, options, callback) {
            if (typeof options === 'function') {
                callback = options
                options = 'utf8'
            }
            
            if (isDataFile(filePath)) {
                serveFromSQLite(filePath, callback)
            } else {
                originalReadFile.call(this, filePath, options, callback)
            }
        }

        require('fs').readFileSync = function(filePath, options) {
            if (isDataFile(filePath)) {
                return JSON.stringify([])
            } else {
                return originalReadFileSync.call(this, filePath, options)
            }
        }

        require('fs').existsSync = function(filePath) {
            if (isDataFile(filePath)) {
                return true
            } else {
                return originalExistsSync.call(this, filePath)
            }
        }
        
        isInitialized = true
    }

    function addExchangeSymbol(exchange, symbol, dataStorage) {
        const key = `${exchange}-${symbol.replace('/', '-')}`
        storageMap.set(key, dataStorage)
    }

    function isDataFile(filePath) {
        // Check if this is a data file we should intercept
        return (filePath.includes('Data.json') || filePath.includes('Status.json')) && 
               (filePath.includes('Candles') || filePath.includes('Volumes')) &&
               hasMatchingStorage(filePath)
    }

    function hasMatchingStorage(filePath) {
        // Check if we have storage for any exchange/symbol that matches this path
        for (let key of storageMap.keys()) {
            const [exchange, symbol] = key.split('-')
            if (filePath.includes(exchange) && 
                (filePath.includes(symbol) || filePath.includes(symbol.replace('-', '_')))) {
                return true
            }
        }
        return false
    }

    function getStorageForPath(filePath) {
        // Find the right storage for this file path
        for (let [key, storage] of storageMap.entries()) {
            const [exchange, symbol] = key.split('-')
            if (filePath.includes(exchange) && 
                (filePath.includes(symbol) || filePath.includes(symbol.replace('-', '_')))) {
                return storage
            }
        }
        return null
    }

    function serveFromSQLite(filePath, callback) {
        try {
            const dataStorage = getStorageForPath(filePath)
            if (!dataStorage) {
                return callback(null, JSON.stringify([]))
            }

            // Handle Status.json files
            if (filePath.includes('Status.json')) {
                const statusData = {
                    "file": {
                        "lastFile": {
                            "year": new Date().getUTCFullYear(),
                            "month": new Date().getUTCMonth() + 1,
                            "days": new Date().getUTCDate(),
                            "hours": new Date().getUTCHours(),
                            "minutes": new Date().getUTCMinutes()
                        }
                    }
                }
                return callback(null, JSON.stringify(statusData))
            }
            
            // Extract date from file path
            const dateMatch = filePath.match(/(\d{4})\/(\d{2})\/(\d{2})/)
            if (!dateMatch) {
                return callback(null, JSON.stringify([]))
            }

            const year = parseInt(dateMatch[1])
            const month = parseInt(dateMatch[2]) - 1
            const day = parseInt(dateMatch[3])
            
            const startOfDay = new Date(Date.UTC(year, month, day)).valueOf()
            const endOfDay = startOfDay + (24 * 60 * 60 * 1000) - 1

            // Get data from SQLite
            dataStorage.getOHLCVRange(startOfDay, endOfDay, (err, ohlcvData) => {
                if (err || !ohlcvData || ohlcvData.length === 0) {
                    return callback(null, JSON.stringify([]))
                }

                let result
                if (filePath.includes('Candles')) {
                    // Convert to Candles format: [min, max, open, close, begin, end]
                    result = ohlcvData.map(ohlcv => [
                        ohlcv[3], // low -> min
                        ohlcv[2], // high -> max
                        ohlcv[1], // open
                        ohlcv[4], // close
                        ohlcv[0], // timestamp -> begin
                        ohlcv[0] + 59999 // end
                    ])
                } else if (filePath.includes('Volumes')) {
                    // Convert to Volumes format: [buy, sell, begin, end]
                    result = ohlcvData.map(ohlcv => [
                        ohlcv[5] / 2, // buy
                        ohlcv[5] / 2, // sell
                        ohlcv[0], // begin
                        ohlcv[0] + 59999 // end
                    ])
                } else {
                    result = []
                }

                callback(null, JSON.stringify(result))
            })
        } catch (err) {
            callback(null, JSON.stringify([]))
        }
    }
}