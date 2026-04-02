/**
 * Enhanced logging helper for Exchange Raw Data bots
 * Provides structured logging with emojis and consistent formatting
 */

exports.createLogger = function(processIndex, moduleName) {
    const logger = TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT;
    
    return {
        info: (message) => {
            logger.write(moduleName, `[INFO] ${message}`);
        },
        
        debug: (message) => {
            logger.write(moduleName, `[DEBUG] ${message}`);
        },
        
        warn: (message) => {
            logger.write(moduleName, `[WARN] ⚠️ ${message}`);
        },
        
        error: (message, error) => {
            if (error) {
                logger.write(moduleName, `[ERROR] ❌ ${message} -> ${error.stack || error}`);
            } else {
                logger.write(moduleName, `[ERROR] ❌ ${message}`);
            }
        },
        
        success: (message) => {
            logger.write(moduleName, `[SUCCESS] ✅ ${message}`);
        },
        
        // Specialized logging methods for exchange operations
        exchangeConnection: (exchangeName, symbol, sandboxMode = false) => {
            const mode = sandboxMode ? ' (SANDBOX)' : '';
            logger.write(moduleName, `[INFO] 🔗 EXCHANGE CONNECTION: ${exchangeName} ${symbol}${mode}`);
        },
        
        dataFetch: (count, symbol, dateRange = '') => {
            logger.write(moduleName, `[DEBUG] 📊 FETCHED ${count} OHLCVs from ${symbol} ${dateRange}`);
        },
        
        batchProgress: (processed, total, percentage, date) => {
            logger.write(moduleName, `[DEBUG] 📈 BATCH PROGRESS: ${processed}/${total} (${percentage}%) @ ${date}`);
        },
        
        storageInfo: (storageType) => {
            logger.write(moduleName, `[INFO] 💾 Using ${storageType} storage`);
        },
        
        rateLimit: (exchangeName, retryAfter = '') => {
            const retryInfo = retryAfter ? ` - retry after ${retryAfter}` : '';
            logger.write(moduleName, `[WARN] ⏱️ RATE LIMIT: ${exchangeName} requesting too fast${retryInfo}`);
        },
        
        exchangeError: (exchangeName, errorType, details = '') => {
            logger.write(moduleName, `[ERROR] 🚫 EXCHANGE ERROR: ${exchangeName} - ${errorType} ${details}`);
        },
        
        marketStart: (date, symbol) => {
            logger.write(moduleName, `[INFO] 🎯 MARKET START: ${symbol} begins at ${date}`);
        },
        
        catchingUp: (hoursBehind, batchSize) => {
            logger.write(moduleName, `[INFO] ⚡ CATCHING UP: ${hoursBehind.toFixed(1)} hours behind, using batch size ${batchSize}`);
        },
        
        fileSave: (fileType, date, recordCount) => {
            logger.write(moduleName, `[SUCCESS] 💾 SAVED ${fileType}: ${recordCount} records for ${date}`);
        },
        
        taskStopping: (recordsCollected) => {
            logger.write(moduleName, `[INFO] 🛑 TASK STOPPING: Saving ${recordsCollected} collected records before shutdown`);
        }
    };
};