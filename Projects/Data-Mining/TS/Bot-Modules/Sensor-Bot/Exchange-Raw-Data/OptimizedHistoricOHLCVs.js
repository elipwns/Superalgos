exports.newDataMiningBotModulesOptimizedHistoricOHLCVs = function (processIndex) {
    const MODULE_NAME = "Optimized Historic OHLCVs"
    
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
    let rateLimit = 500
    let limit = 1000
    let maxRecordsPerBatch = 1000000 // Allow much larger batches

    return thisObject

    function initialize(pStatusDependencies, callBackFunction) {
        try {
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

            // Initialize SQLite storage
            dataStorage = require('../../../Function-Libraries/OptimizedDataStorage').newDataMiningFunctionLibrariesOptimizedDataStorage()
            dataStorage.initialize(exchangeId, symbol, (err) => {
                if (err) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] initialize -> Failed to initialize data storage -> err = " + err.message)
                    return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }

                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                    "[INFO] initialize -> SQLite storage initialized for " + exchangeId + " " + symbol)
                
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
            if (TS.projects.foundations.globals.taskVariables.IS_TASK_STOPPING === true) {
                return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
            }

            // Get last timestamp from database
            dataStorage.getLastTimestamp((err, dbLastTimestamp) => {
                if (err) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> Failed to get last timestamp -> err = " + err.message)
                    return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }

                // Determine starting point
                let since = dbLastTimestamp ? dbLastTimestamp + 60000 : uiStartDate.valueOf() // Start from next minute
                
                fetchAndSaveData(since, callBackFunction)
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
            let totalFetched = 0
            let batchData = []
            let currentSince = since

            while (true) {
                if (TS.projects.foundations.globals.taskVariables.IS_TASK_STOPPING === true) {
                    break
                }
                
                // Save batch periodically to prevent memory issues
                if (batchData.length >= 10000) {
                    await saveBatch(batchData)
                    batchData = []
                    totalFetched = 0
                }

                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, rateLimit))

                // Fetch OHLCV data
                const ohlcvs = await exchange.fetchOHLCV(symbol, '1m', currentSince, limit)
                
                if (ohlcvs.length === 0) {
                    // No more data available
                    break
                }

                // Add to batch
                batchData = batchData.concat(ohlcvs)
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

                // Check if we've reached current time
                if (currentSince >= Date.now()) {
                    break
                }

                // If we got less than requested, we might be at the end
                if (ohlcvs.length < limit) {
                    break
                }
            }

            // Save final batch
            if (batchData.length > 0) {
                dataStorage.saveOHLCVBatch(batchData, (err, savedCount) => {
                    if (err) {
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[ERROR] fetchAndSaveData -> Failed to save batch -> err = " + err.message)
                        return callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                    }

                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] fetchAndSaveData -> Successfully saved " + savedCount + " OHLCVs to database")

                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
                })
            } else {
                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE)
            }

        } catch (err) {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] fetchAndSaveData -> err = " + err.stack)
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