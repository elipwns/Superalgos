/**
 * Enhanced logging helper for Candles-Volumes bots
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
        
        // Specialized logging methods for bot operations
        processingDate: (date, iteration, maxIterations) => {
            logger.write(moduleName, `[DEBUG] 🔄 PROCESSING DATE: ${date.getUTCFullYear()}/${date.getUTCMonth() + 1}/${date.getUTCDate()} (iteration ${iteration}/${maxIterations})`);
        },
        
        headOfMarket: (currentDate, lastAvailableDate) => {
            logger.write(moduleName, `[DEBUG] 🏁 HEAD OF MARKET REACHED: ${currentDate.getUTCFullYear()}/${currentDate.getUTCMonth() + 1}/${currentDate.getUTCDate()} > ${lastAvailableDate.getUTCFullYear()}/${lastAvailableDate.getUTCMonth() + 1}/${lastAvailableDate.getUTCDate()}`);
        },
        
        missingFile: (dateForPath, timeFrame, fileType = 'file') => {
            logger.write(moduleName, `[DEBUG] ⚠️ MISSING ${fileType.toUpperCase()}: ${dateForPath} for timeframe ${timeFrame} - skipping`);
        },
        
        fileOperation: (operation, filePath, storageType, recordCount = null) => {
            const countInfo = recordCount !== null ? ` (${recordCount} records)` : '';
            logger.write(moduleName, `[DEBUG] 📁 ${operation.toUpperCase()}: ${filePath} using ${storageType}${countInfo}`);
        },
        
        timeframeProgress: (timeFrame, operation, details = '') => {
            logger.write(moduleName, `[DEBUG] ⏱️ TIMEFRAME ${timeFrame}: ${operation} ${details}`);
        },
        
        storageInfo: (storageType) => {
            logger.write(moduleName, `[INFO] 💾 Using ${storageType} storage`);
        },
        
        circuitBreaker: (reason, iterations) => {
            logger.write(moduleName, `[ERROR] 🔄 CIRCUIT BREAKER: ${reason} after ${iterations} iterations`);
        },
        
        dependency: (dependencyName, status, details = '') => {
            const emoji = status === 'ready' ? '✅' : status === 'missing' ? '❌' : '⚠️';
            logger.write(moduleName, `[DEBUG] ${emoji} DEPENDENCY ${dependencyName}: ${status} ${details}`);
        }
    };
};