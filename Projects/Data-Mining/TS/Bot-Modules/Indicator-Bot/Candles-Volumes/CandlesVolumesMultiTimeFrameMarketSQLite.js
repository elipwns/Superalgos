exports.newDataMiningBotModulesCandlesVolumesMultiTimeFrameMarketSQLite = function (processIndex) {

    const MODULE_NAME = "Candles Volumes Multi Time Frame Market SQLite"
    const CANDLES_FOLDER_NAME = "Candles"
    const VOLUMES_FOLDER_NAME = "Volumes"

    let thisObject = {
        initialize: initialize,
        start: start
    }

    let fileStorage = TS.projects.foundations.taskModules.fileStorage.newFileStorage(processIndex);
    let statusDependenciesModule;
    let beginingOfMarket
    let sqliteStorage;

    return thisObject;

    function initialize(pStatusDependenciesModule, callBackFunction) {
        try {
            statusDependenciesModule = pStatusDependenciesModule;
            
            // Initialize SQLite storage
            const OptimizedDataStorage = require('../../../Function-Libraries/OptimizedDataStorage')
            const exchange = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config.codeName
            const baseAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.config.codeName
            const quotedAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.config.codeName
            const symbol = baseAsset + '/' + quotedAsset
            
            sqliteStorage = OptimizedDataStorage.newDataMiningFunctionLibrariesOptimizedDataStorage()
            sqliteStorage.initialize(exchange, symbol)
            
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
        } catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] initialize -> err = " + err.stack);
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
        }
    }

    function start(callBackFunction) {
        try {
            /* Context Variables */
            let contextVariables = {
                datetimeLastProducedFile: undefined,
                datetimeBeginingOfMarketFile: undefined,
                datetimeLastAvailableDependencyFile: undefined
            };

            getContextVariables();

            function getContextVariables() {
                try {
                    // Get market starting point from SQLite
                    sqliteStorage.getFirstTimestamp((err, firstTimestamp) => {
                        if (err || !firstTimestamp) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[WARN] start -> getContextVariables -> No data available in SQLite. Retrying Later.");
                            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                            return;
                        }

                        contextVariables.datetimeBeginingOfMarketFile = new Date(firstTimestamp);

                        // Get market ending point from SQLite
                        sqliteStorage.getLastTimestamp((err, lastTimestamp) => {
                            if (err || !lastTimestamp) {
                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                    "[WARN] start -> getContextVariables -> No recent data available. Retrying Later.");
                                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                                return;
                            }

                            contextVariables.datetimeLastAvailableDependencyFile = new Date(lastTimestamp);

                            // Get our own status report
                            let statusReport = statusDependenciesModule.reportsByMainUtility.get('Self Reference')

                            if (statusReport === undefined) {
                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                    "[WARN] start -> getContextVariables -> Status Report does not exist. Starting fresh.");
                                
                                beginingOfMarket = new Date(contextVariables.datetimeBeginingOfMarketFile);
                                contextVariables.datetimeLastProducedFile = new Date(beginingOfMarket.valueOf() - SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);
                                buildCandles();
                                return;
                            }

                            if (statusReport.status === "Status Report is corrupt.") {
                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                    "[ERROR] start -> getContextVariables -> Status Report is corrupt. Retrying Later.");
                                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                                return;
                            }

                            let thisReport = statusReport.file;

                            if (thisReport.lastFile !== undefined) {
                                beginingOfMarket = new Date(thisReport.beginingOfMarket || contextVariables.datetimeBeginingOfMarketFile);
                                contextVariables.datetimeLastProducedFile = new Date(thisReport.lastFile);
                                contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeLastProducedFile.valueOf() - SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);
                                findPreviousContent();
                            } else {
                                beginingOfMarket = new Date(contextVariables.datetimeBeginingOfMarketFile);
                                contextVariables.datetimeLastProducedFile = new Date(beginingOfMarket.valueOf() - SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);
                                buildCandles();
                            }
                        });
                    });

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> getContextVariables -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function findPreviousContent() {
                // For SQLite version, we skip loading previous content and rebuild from scratch
                // This is more efficient than trying to merge existing files
                buildCandles();
            }

            function buildCandles() {
                try {
                    let fromDate = new Date(contextVariables.datetimeLastProducedFile.valueOf())
                    let lastDate = TS.projects.foundations.utilities.dateTimeFunctions.removeTime(new Date())

                    advanceTime()

                    function advanceTime() {
                        contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeLastProducedFile.valueOf() + SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);

                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[INFO] start -> buildCandles -> advanceTime -> Processing date: " + contextVariables.datetimeLastProducedFile.toISOString().split('T')[0]);

                        if (contextVariables.datetimeLastProducedFile.valueOf() > contextVariables.datetimeLastAvailableDependencyFile.valueOf()) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[INFO] start -> buildCandles -> advanceTime -> Head of market reached.");
                            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                            return
                        }

                        let currentDateString = contextVariables.datetimeLastProducedFile.toISOString().split('T')[0];
                        let currentDate = new Date(contextVariables.datetimeLastProducedFile)
                        let percentage = TS.projects.foundations.utilities.dateTimeFunctions.getPercentage(fromDate, currentDate, lastDate)
                        TS.projects.foundations.functionLibraries.processFunctions.processHeartBeat(processIndex, currentDateString, percentage)

                        if (TS.projects.foundations.utilities.dateTimeFunctions.areTheseDatesEqual(currentDate, new Date()) === false) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.newInternalLoop(currentDate, percentage);
                        }

                        processTimeFrames()
                    }

                    function processTimeFrames() {
                        let timeFrameIndex = 0;
                        let timeFrames = TS.projects.foundations.globals.timeFrames.marketTimeFramesArray();

                        processNextTimeFrame();

                        function processNextTimeFrame() {
                            if (timeFrameIndex >= timeFrames.length) {
                                writeStatusReport(contextVariables.datetimeLastProducedFile, advanceTime);
                                return;
                            }

                            const outputPeriod = timeFrames[timeFrameIndex][0];
                            const timeFrame = timeFrames[timeFrameIndex][1];

                            // Get day's data from SQLite
                            let startOfDay = new Date(contextVariables.datetimeLastProducedFile);
                            startOfDay.setUTCHours(0, 0, 0, 0);
                            let endOfDay = new Date(startOfDay.valueOf() + SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS - 1);

                            sqliteStorage.getOHLCVRange(startOfDay.valueOf(), endOfDay.valueOf(), (err, ohlcvData) => {
                                if (err) {
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[ERROR] processTimeFrames -> Error getting SQLite data: " + err.message);
                                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                                    return;
                                }

                                // Aggregate 1-minute data into target timeframe
                                let outputCandles = [];
                                let outputVolumes = [];

                                if (ohlcvData && ohlcvData.length > 0) {
                                    const inputFilePeriod = 24 * 60 * 60 * 1000; // 24 hours
                                    let totalOutputCandles = inputFilePeriod / outputPeriod;
                                    let beginningOutputTime = startOfDay.valueOf();

                                    for (let i = 0; i < totalOutputCandles; i++) {
                                        let outputCandle = {
                                            open: 0, close: 0, min: 0, max: 0,
                                            begin: beginningOutputTime + i * outputPeriod,
                                            end: beginningOutputTime + (i + 1) * outputPeriod - 1
                                        };

                                        let outputVolume = {
                                            buy: 0, sell: 0,
                                            begin: beginningOutputTime + i * outputPeriod,
                                            end: beginningOutputTime + (i + 1) * outputPeriod - 1
                                        };

                                        let saveCandle = false;

                                        // Process each 1-minute record
                                        for (let j = 0; j < ohlcvData.length; j++) {
                                            let record = ohlcvData[j];
                                            let timestamp = record[0];
                                            let open = record[1];
                                            let high = record[2];
                                            let low = record[3];
                                            let close = record[4];
                                            let volume = record[5];

                                            if (timestamp >= outputCandle.begin && timestamp <= outputCandle.end) {
                                                if (!saveCandle) {
                                                    outputCandle.open = open;
                                                    outputCandle.min = low;
                                                    outputCandle.max = high;
                                                    saveCandle = true;
                                                }

                                                outputCandle.close = close;
                                                if (low < outputCandle.min) outputCandle.min = low;
                                                if (high > outputCandle.max) outputCandle.max = high;

                                                // Split volume equally between buy/sell
                                                outputVolume.buy += volume / 2;
                                                outputVolume.sell += volume / 2;
                                            }
                                        }

                                        if (saveCandle) {
                                            outputCandles.push(outputCandle);
                                            outputVolumes.push(outputVolume);
                                        }
                                    }
                                }

                                writeFiles(outputCandles, outputVolumes, timeFrame, () => {
                                    timeFrameIndex++;
                                    processNextTimeFrame();
                                });
                            });
                        }
                    }
                }
                catch (err) {
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> buildCandles -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function writeFiles(candles, volumes, timeFrame, callBack) {
                try {
                    writeCandles()

                    function writeCandles() {
                        let separator = ""
                        let fileRecordCounter = 0
                        let fileContent = ""

                        for (let i = 0; i < candles.length; i++) {
                            let candle = candles[i];
                            fileContent = fileContent + separator + '[' + candle.min + "," + candle.max + "," + candle.open + "," + candle.close + "," + candle.begin + "," + candle.end + "]";
                            if (separator === "") { separator = ","; }
                            fileRecordCounter++
                        }

                        fileContent = "[" + fileContent + "]";

                        let fileName = 'Data.json';
                        let filePath = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                            "/Output/" + CANDLES_FOLDER_NAME + "/" +
                            TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" +
                            timeFrame
                        filePath += '/' + fileName

                        fileStorage.createTextFile(filePath, fileContent + '\n', onFileCreated);

                        function onFileCreated(err) {
                            if (err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                    "[ERROR] writeCandles -> onFileCreated -> err = " + err.stack)
                                callBackFunction(err)
                                return
                            }

                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[INFO] writeCandles -> Created " + fileRecordCounter + " candle records for " + timeFrame);
                            writeVolumes()
                        }
                    }

                    function writeVolumes() {
                        let separator = "";
                        let fileRecordCounter = 0;
                        let fileContent = "";

                        for (let i = 0; i < volumes.length; i++) {
                            fileContent = fileContent + separator + '[' + volumes[i].buy + "," + volumes[i].sell + "," + volumes[i].begin + "," + volumes[i].end + "]";
                            if (separator === "") { separator = ","; }
                            fileRecordCounter++
                        }

                        fileContent = "[" + fileContent + "]";

                        let fileName = 'Data.json';
                        let filePath = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT + 
                            "/Output/" + VOLUMES_FOLDER_NAME + "/" + 
                            TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" + 
                            timeFrame;
                        filePath += '/' + fileName

                        fileStorage.createTextFile(filePath, fileContent + '\n', onFileCreated);

                        function onFileCreated(err) {
                            if (err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                    "[ERROR] writeVolumes -> onFileCreated -> err = " + err.stack);
                                callBackFunction(err);
                                return;
                            }

                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[INFO] writeVolumes -> Created " + fileRecordCounter + " volume records for " + timeFrame);

                            callBack()
                        }
                    }
                }
                catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] writeFiles -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function writeStatusReport(lastFileDate, callBack) {
                try {
                    let thisReport = statusDependenciesModule.reportsByMainUtility.get('Self Reference')

                    thisReport.file.lastExecution = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).PROCESS_DATETIME
                    thisReport.file.lastFile = lastFileDate
                    thisReport.file.beginingOfMarket = beginingOfMarket.toUTCString()
                    thisReport.save(callBack)
                }
                catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] writeStatusReport -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                }
            }
        }
        catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] start -> err = " + err.stack);
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }
}