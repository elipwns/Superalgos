exports.newDataMiningBotModulesHistoricOHLCVs = function (processIndex) {
    const MODULE_NAME = "SQLite Historic OHLCVs"
    
    let thisObject = {
        initialize: initialize,
        start: start
    }

    let dataStorage
    let statusDependencies
    let exchange
    let symbol
    let exchangeId
    let uiStartDate = new Date(TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.config.startDate)
    let rateLimit = 100   // Fast rate limit - 10 req/sec (well under 400/sec limit)
    let limit = 1000     // Keep 1000 records per call

    return thisObject

    function createCompatibleFiles(ohlcvData, callback) {
        try {
            const SQLiteFileAdapter = require('../../../Function-Libraries/SQLiteFileAdapter')
            const adapter = SQLiteFileAdapter.newDataMiningFunctionLibrariesSQLiteFileAdapter()
            
            adapter.createFileStructure(exchangeId, symbol, (err, paths) => {
                if (err) return callback(err)
                
                // Group data by day and create daily files
                const dailyData = {}
                ohlcvData.forEach(ohlcv => {
                    const date = new Date(ohlcv[0])
                    const dateKey = date.getUTCFullYear() + '/' + 
                        String(date.getUTCMonth() + 1).padStart(2, '0') + '/' + 
                        String(date.getUTCDate()).padStart(2, '0')
                    
                    if (!dailyData[dateKey]) dailyData[dateKey] = []
                    dailyData[dateKey].push(ohlcv)
                })
                
                // Create files for each day
                Object.keys(dailyData).forEach(dateKey => {
                    const candlesFile = path.join(paths.candlesPath, dateKey, 'Data.json')
                    const volumesFile = path.join(paths.volumesPath, dateKey, 'Data.json')
                    
                    // Create date directories
                    require('fs').mkdirSync(path.dirname(candlesFile), { recursive: true })
                    require('fs').mkdirSync(path.dirname(volumesFile), { recursive: true })
                    
                    adapter.generateCandlesFile(dailyData[dateKey], candlesFile, () => {})
                    adapter.generateVolumesFile(dailyData[dateKey], volumesFile, () => {})
                })
                
                callback()
            })
        } catch (err) {
            callback(err)
        }
    }

    function initialize(pStatusDependencies, callBackFunction) {
        try {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] initialize -> Starting initialization")
                
            statusDependencies = pStatusDependencies
            
            // Get exchange configuration
            let exchangeConfig = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config
            exchangeId = exchangeConfig.codeName
            symbol = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.config.codeName
            
            if (exchangeConfig.rateLimit !== undefined) {
                rateLimit = exchangeConfig.rateLimit
            }
            if (exchangeConfig.limit !== undefined) {
                limit = exchangeConfig.limit
            }

            // Initialize exchange
            const ccxt = SA.nodeModules.ccxt
            const exchangeClass = ccxt[exchangeId]
            exchange = new exchangeClass({
                'timeout': 30000,
                'enableRateLimit': true,
                'rateLimit': rateLimit,
                'verbose': false
            })

            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] initialize -> Initializing SQLite storage system")
            
            // Initialize SQLite storage and virtual file system
            const OptimizedDataStorage = require('../../../Function-Libraries/OptimizedDataStorage')
            const SQLiteVirtualFS = require('../../../Function-Libraries/SQLiteVirtualFS')
            
            dataStorage = OptimizedDataStorage.newDataMiningFunctionLibrariesOptimizedDataStorage()
            dataStorage.initialize(exchangeId, symbol, (err) => {
                if (err) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] initialize -> Failed to initialize SQLite storage for " + exchangeId + " " + symbol + " -> err = " + err.message)
                    return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }
                
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] initialize -> Data storage initialized successfully")

                // Initialize virtual file system
                const virtualFS = SQLiteVirtualFS.newDataMiningFunctionLibrariesSQLiteVirtualFS()
                virtualFS.initialize(dataStorage, exchangeId, symbol)

                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] initialize -> SQLite storage and virtual FS initialized for " + exchangeId + " " + symbol)
                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
            })

        } catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] initialize -> err = " + err.stack)
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }

    function start(callBackFunction) {
        try {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] start -> Starting SQLite data collection process")
                
            if (TS.projects.foundations.globals.taskVariables.IS_TASK_STOPPING === true) {
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] start -> Task is stopping, exiting")
                return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
            }

            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] start -> Getting last timestamp from database")
                
            // Get last timestamp from database
            dataStorage.getLastTimestamp((err, dbLastTimestamp) => {
                if (err) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> SQLite getLastTimestamp failed -> err = " + err.message)
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> Failed to get last timestamp -> err = " + err.message)
                    return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }
                
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] start -> Got last timestamp: " + dbLastTimestamp)

                // Determine starting point using smart coin-specific dates
                const CoinHistoryConfig = require('../../../Function-Libraries/CoinHistoryConfig')
                const coinConfig = CoinHistoryConfig.newDataMiningFunctionLibrariesCoinHistoryConfig()
                
                let since = dbLastTimestamp ? dbLastTimestamp + 60000 : coinConfig.getStartDate(symbol, 'default')
                
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] start -> Using smart start date for " + symbol + ": " + new Date(since))
                
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] Starting data collection from timestamp: " + since + " (" + new Date(since) + ")")
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] dbLastTimestamp: " + dbLastTimestamp)
                
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] start -> Calling fetchAndSaveData with timestamp: " + since + " (" + new Date(since) + ")")
                
                try {
                    fetchAndSaveData(since, callBackFunction)
                } catch (err) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> fetchAndSaveData threw error: " + err.message)
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }
            })

        } catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] start -> err = " + err.stack)
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }

    async function fetchAndSaveData(since, callBackFunction) {
        try {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] fetchAndSaveData -> Starting data fetch from " + new Date(since))
                
            let totalFetched = 0
            let batchData = []
            let currentSince = since

            while (true) {
                if (TS.projects.foundations.globals.taskVariables.IS_TASK_STOPPING === true) {
                    break
                }
                
                // Save batch periodically to prevent memory issues
                if (batchData.length >= 5000) {
                    await new Promise((resolve, reject) => {
                        dataStorage.saveOHLCVBatch(batchData, (err, savedCount) => {
                            if (err) return reject(err)
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[INFO] Saved batch of " + savedCount + " records")
                            resolve(savedCount)
                        })
                    })
                    batchData.length = 0 // Clear array efficiently
                    totalFetched = 0
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, rateLimit))

                // Fetch OHLCV data
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] fetchAndSaveData -> Requesting " + limit + " OHLCVs from " + new Date(currentSince))
                
                const ohlcvs = await exchange.fetchOHLCV(symbol, '1m', currentSince, limit)
                
                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] fetchAndSaveData -> Exchange returned " + ohlcvs.length + " OHLCVs")
                
                if (ohlcvs.length === 0) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] No data returned from exchange - breaking loop")
                    break
                }

                // Add to batch (using push for better performance)
                batchData.push(...ohlcvs)
                totalFetched += ohlcvs.length

                // Update progress
                let processingDate = new Date(currentSince)
                let dateStr = processingDate.getUTCFullYear() + '-' + 
                    String(processingDate.getUTCMonth() + 1).padStart(2, '0') + '-' + 
                    String(processingDate.getUTCDate()).padStart(2, '0')

                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] fetchAndSaveData -> Fetched " + ohlcvs.length + " OHLCVs @ " + dateStr + " -> Total: " + totalFetched)

                TS.projects.foundations.functionLibraries.processFunctions.processHeartBeat(processIndex, 
                    "Fetching " + totalFetched + " OHLCVs from " + exchangeId + " " + symbol + " @ " + dateStr)

                // Update since for next iteration
                currentSince = ohlcvs[ohlcvs.length - 1][0] + 60000 // Next minute

                // Check if we've reached current time (with 5 minute buffer)
                if (currentSince >= (Date.now() - 300000)) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] Reached current time - breaking loop (currentSince: " + new Date(currentSince) + ")")
                    break
                }

                // If we got less than requested, we might be at the end
                if (ohlcvs.length < limit) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] Got less than limit (" + ohlcvs.length + " < " + limit + ") - might be at end")
                    break
                }
            }

            // Save final batch and create file structure
            if (batchData.length > 0) {
                dataStorage.saveOHLCVBatch(batchData, (err, savedCount) => {
                    if (err) {
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[ERROR] fetchAndSaveData -> Failed to save batch -> err = " + err.message)
                        return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                    }
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] fetchAndSaveData -> Successfully saved " + savedCount + " OHLCVs to SQLite (virtual FS active)")
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
                })
            } else {
                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
            }

        } catch (err) {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] fetchAndSaveData -> Caught exception: " + err.message + " Stack: " + err.stack)
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }

    function updateStatusReport(lastTimestamp, callBackFunction) {
        try {
            let reportKey = TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.parentNode.parentNode.config.codeName + "-" + 
                TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.parentNode.config.codeName + "-" + 
                TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName

            let thisReport = statusDependencies.statusReports.get(reportKey)
            let lastDate = new Date(lastTimestamp)

            thisReport.file = {
                lastTimestamp: lastTimestamp,
                lastFile: {
                    year: lastDate.getUTCFullYear(),
                    month: (lastDate.getUTCMonth() + 1),
                    days: lastDate.getUTCDate(),
                    hours: lastDate.getUTCHours(),
                    minutes: lastDate.getUTCMinutes()
                },
                uiStartDate: uiStartDate.toUTCString(),
                storageType: 'sqlite'
            }

            thisReport.save((err) => {
                if (err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] updateStatusReport -> err = " + err.stack)
                    return callBackFunction(err)
                }
                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
            })

        } catch (err) {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] updateStatusReport -> err = " + err.stack)
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }
}