const { OptimizedDataStorage } = require('../../../Function-Libraries/OptimizedDataStorage')
const ProcessedDataStorage = require('../../../Function-Libraries/ProcessedDataStorage')

exports.newDataMiningBotModulesCandlesVolumesMultiTimeFrameMarket = function (processIndex) {

    const MODULE_NAME = "Candles Volumes Multi Time Frame Market"
    const CANDLES_FOLDER_NAME = "Candles"
    const VOLUMES_FOLDER_NAME = "Volumes"

    let thisObject = {
        initialize: initialize,
        start: start
    }

    let fileStorage = TS.projects.foundations.taskModules.fileStorage.newFileStorage(processIndex);
    let statusDependenciesModule;
    let beginingOfMarket
    let sqliteStorage
    let processedStorage

    return thisObject;

    function initialize(pStatusDependenciesModule, callBackFunction) {
        try {
            statusDependenciesModule = pStatusDependenciesModule;
            
            // Initialize SQLite storage
            const exchangeName = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config.codeName
            const baseAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.config.codeName
            const quotedAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.config.codeName
            
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] initialize -> Initializing SQLite storage for " + exchangeName + " " + baseAsset + "_" + quotedAsset);
            
            sqliteStorage = new OptimizedDataStorage(exchangeName, `${baseAsset}_${quotedAsset}`)
            processedStorage = new ProcessedDataStorage(exchangeName, `${baseAsset}_${quotedAsset}`)
            
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] initialize -> SQLite processed data storage initialized for " + exchangeName + " " + baseAsset + "_" + quotedAsset);
            
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
                    let thisReport
                    let statusReport

                    // Get exchange info for logging
                    const exchangeName = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config.codeName
                    const baseAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.config.codeName
                    const quotedAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.config.codeName
                    
                    // Get beginning of market from SQLite
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] start -> getContextVariables -> Reading SQLite market data for " + exchangeName + " " + baseAsset + "_" + quotedAsset);
                    
                    const firstRecord = sqliteStorage.getFirstRecord()

                    if (!firstRecord) {
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[HINT] start -> getContextVariables -> No SQLite data available for " + exchangeName + " " + baseAsset + "_" + quotedAsset + " yet.");
                        let customOK = {
                            result: TS.projects.foundations.globals.standardResponses.CUSTOM_OK_RESPONSE.result,
                            message: "SQLite dependency does not exist."
                        }
                        callBackFunction(customOK)
                        return
                    }

                    contextVariables.datetimeBeginingOfMarketFile = new Date(firstRecord.timestamp)
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] start -> getContextVariables -> SQLite market begins at: " + contextVariables.datetimeBeginingOfMarketFile.toISOString());

                    // Get last available data from SQLite
                    const lastRecord = sqliteStorage.getLastRecord()
                    if (!lastRecord) {
                        let customOK = {
                            result: TS.projects.foundations.globals.standardResponses.CUSTOM_OK_RESPONSE.result,
                            message: "Dependency not ready."
                        }
                        callBackFunction(customOK);
                        return;
                    }

                    contextVariables.datetimeLastAvailableDependencyFile = new Date(lastRecord.timestamp)
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] start -> getContextVariables -> SQLite market ends at: " + contextVariables.datetimeLastAvailableDependencyFile.toISOString());
                    
                    const totalDays = Math.ceil((contextVariables.datetimeLastAvailableDependencyFile - contextVariables.datetimeBeginingOfMarketFile) / (24 * 60 * 60 * 1000))
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] start -> getContextVariables -> SQLite database contains " + totalDays + " days of " + exchangeName + " " + baseAsset + "_" + quotedAsset + " data");

                    /* Get our own Status Report. */
                    statusReport = statusDependenciesModule.reportsByMainUtility.get('Self Reference')

                    if (statusReport === undefined) {
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[WARN] start -> getContextVariables -> Status Report does not exist. Retrying Later. ");
                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                        return
                    }

                    if (statusReport.status === "Status Report is corrupt.") {
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[ERROR] start -> getContextVariables -> Can not continue because self dependency Status Report is corrupt. Aborting Process.");
                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                        return
                    }

                    thisReport = statusReport.file

                    if (thisReport.lastFile !== undefined) {
                        beginingOfMarket = new Date(thisReport.beginingOfMarket);

                        if (beginingOfMarket.valueOf() !== contextVariables.datetimeBeginingOfMarketFile.valueOf()) {
                            // Reset mechanism
                            beginingOfMarket = new Date(contextVariables.datetimeBeginingOfMarketFile)
                            contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeBeginingOfMarketFile.valueOf() - SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);
                            buildCandles()
                            return
                        }

                        contextVariables.datetimeLastProducedFile = new Date(thisReport.lastFile);
                        contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeLastProducedFile.valueOf() - SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);

                        // Skip findPreviousContent since we're using SQLite now
                        buildCandles()
                        return
                    } else {
                        beginingOfMarket = new Date(contextVariables.datetimeBeginingOfMarketFile)
                        contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeBeginingOfMarketFile.valueOf() - SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);

                        buildCandles()
                        return
                    }

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> getContextVariables -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function findPreviousContent() {
                try {
                    let n = 0
                    let allPreviousCandles = []
                    let allPreviousVolumes = []

                    loopBody()

                    function loopBody() {
                        let timeFrame = TS.projects.foundations.globals.timeFrames.marketTimeFramesArray()[n][1];
                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[INFO] start -> findPreviousContent -> loopBody -> timeFrame = " + timeFrame)

                        let previousCandles
                        let previousVolumes

                        getCandles()

                        function getCandles() {
                            let fileName = 'Data.json';
                            let filePath =
                                TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                "/Output/" +
                                CANDLES_FOLDER_NAME + "/" +
                                TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" +
                                timeFrame;
                            filePath += '/' + fileName

                            fileStorage.getTextFile(filePath, onFileReceived);

                            function onFileReceived(err, text) {
                                let candlesFile

                                if (err.result === TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                    try {
                                        candlesFile = JSON.parse(text);
                                        previousCandles = candlesFile;
                                        getVolumes();

                                    } catch (err) {
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[ERROR] start -> findPreviousContent -> loopBody -> getCandles -> onFileReceived -> err = " + err.stack);
                                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                                    }
                                } else {
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[ERROR] start -> findPreviousContent -> loopBody -> getCandles -> onFileReceived -> err = " + err.stack);
                                    callBackFunction(err);
                                }
                            }
                        }

                        function getVolumes() {
                            let fileName = 'Data.json';
                            let filePath =
                                TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                "/Output/" +
                                VOLUMES_FOLDER_NAME + "/" +
                                TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" +
                                timeFrame;
                            filePath += '/' + fileName

                            fileStorage.getTextFile(filePath, onFileReceived);

                            function onFileReceived(err, text) {
                                let volumesFile

                                if (err.result === TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                    try {
                                        volumesFile = JSON.parse(text);
                                        previousVolumes = volumesFile;
                                        allPreviousCandles.push(previousCandles);
                                        allPreviousVolumes.push(previousVolumes);

                                        controlLoop();

                                    } catch (err) {
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[ERROR] start -> findPreviousContent -> loopBody -> getVolumes -> onFileReceived -> err = " + err.stack);
                                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                                    }
                                } else {
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[ERROR] start -> findPreviousContent -> loopBody -> getVolumes -> onFileReceived -> err = " + err.stack);
                                    callBackFunction(err);
                                }
                            }
                        }

                    }

                    function controlLoop() {
                        n++
                        if (n < TS.projects.foundations.globals.timeFrames.marketTimeFramesArray().length) {
                            loopBody()
                        } else {
                            buildCandles(allPreviousCandles, allPreviousVolumes);
                        }
                    }
                }
                catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> findPreviousContent -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function buildCandles(allPreviousCandles, allPreviousVolumes) {

                try {
                    let fromDate = new Date(contextVariables.datetimeLastProducedFile.valueOf())
                    let lastDate = TS.projects.foundations.utilities.dateTimeFunctions.removeTime(new Date())

                    let outputCandles = [];
                    let outputVolumes = [];

                    for (let n = 0; n < TS.projects.foundations.globals.timeFrames.marketTimeFramesArray().length; n++) {
                        const emptyArray1 = [];
                        const emptyArray2 = [];
                        outputCandles.push(emptyArray1);
                        outputVolumes.push(emptyArray2);
                    }

                    advanceTime()

                    function advanceTime() {
                        contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeLastProducedFile.valueOf() + SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);

                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                            "[INFO] start -> buildCandles -> advanceTime -> New processing time @ " + contextVariables.datetimeLastProducedFile.getUTCFullYear() + "/" + (contextVariables.datetimeLastProducedFile.getUTCMonth() + 1) + "/" + contextVariables.datetimeLastProducedFile.getUTCDate() + ".")

                        /* Validation that we are not going past the head of the market. */
                        if (contextVariables.datetimeLastProducedFile.valueOf() > contextVariables.datetimeLastAvailableDependencyFile.valueOf()) {

                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[INFO] start -> buildCandles -> advanceTime -> Head of the market found @ " + contextVariables.datetimeLastProducedFile.getUTCFullYear() + "/" + (contextVariables.datetimeLastProducedFile.getUTCMonth() + 1) + "/" + contextVariables.datetimeLastProducedFile.getUTCDate() + ".")

                            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                            return
                        }

                        let currentDateString =
                            contextVariables.datetimeLastProducedFile.getUTCFullYear() + '-' +
                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(contextVariables.datetimeLastProducedFile.getUTCMonth() + 1, 2) + '-' +
                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(contextVariables.datetimeLastProducedFile.getUTCDate(), 2);
                        let currentDate = new Date(contextVariables.datetimeLastProducedFile)
                        let percentage = TS.projects.foundations.utilities.dateTimeFunctions.getPercentage(fromDate, currentDate, lastDate)
                        TS.projects.foundations.functionLibraries.processFunctions.processHeartBeat(processIndex, currentDateString, percentage)

                        if (TS.projects.foundations.utilities.dateTimeFunctions.areTheseDatesEqual(currentDate, new Date()) === false) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.newInternalLoop(currentDate, percentage);
                        }
                        timeframesLoop()
                    }

                    function timeframesLoop() {
                        let n = 0

                        loopBody()

                        function loopBody() {
                            let previousCandles
                            let previousVolumes

                            if (allPreviousCandles !== undefined) {
                                previousCandles = allPreviousCandles[n];
                                previousVolumes = allPreviousVolumes[n];
                            }

                            const outputPeriod = TS.projects.foundations.globals.timeFrames.marketTimeFramesArray()[n][0];
                            const timeFrame = TS.projects.foundations.globals.timeFrames.marketTimeFramesArray()[n][1];

                            if (previousCandles !== undefined && previousCandles.length !== 0) {
                                for (let i = 0; i < previousCandles.length; i++) {
                                    let candle = {
                                        open: previousCandles[i][2],
                                        close: previousCandles[i][3],
                                        min: previousCandles[i][0],
                                        max: previousCandles[i][1],
                                        begin: previousCandles[i][4],
                                        end: previousCandles[i][5]
                                    }

                                    if (candle.end < contextVariables.datetimeLastProducedFile.valueOf()) {
                                        outputCandles[n].push(candle);
                                    }
                                }
                                allPreviousCandles[n] = [];
                            }

                            if (previousVolumes !== undefined && previousVolumes.length !== 0) {
                                for (let i = 0; i < previousVolumes.length; i++) {
                                    let volume = {
                                        begin: previousVolumes[i][2],
                                        end: previousVolumes[i][3],
                                        buy: previousVolumes[i][0],
                                        sell: previousVolumes[i][1]
                                    }

                                    if (volume.end < contextVariables.datetimeLastProducedFile.valueOf()) {
                                        outputVolumes[n].push(volume);
                                    }
                                }
                                allPreviousVolumes[n] = [];
                            }

                            nextCandleFile();

                            function nextCandleFile() {
                                try {
                                    // Read records from SQLite for this day
                                    const startOfDay = new Date(contextVariables.datetimeLastProducedFile)
                                    const endOfDay = new Date(contextVariables.datetimeLastProducedFile.valueOf() + SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS - 1)
                                    
                                    const candlesFile = sqliteStorage.getRecordsByDateRange(startOfDay, endOfDay)
                                    
                                    if (!candlesFile || candlesFile.length === 0) {
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[WARN] start -> buildCandles -> timeframesLoop -> loopBody -> nextCandleFile -> No records found for date: " + startOfDay.toISOString().split('T')[0]);
                                        nextVolumeFile();
                                        return
                                    }
                                    
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[INFO] start -> buildCandles -> timeframesLoop -> loopBody -> nextCandleFile -> Processing " + candlesFile.length + " SQLite records for " + startOfDay.toISOString().split('T')[0] + " (" + timeFrame + ")");

                                    const inputFilePeriod = 24 * 60 * 60 * 1000;
                                    let totalOutputCandles = inputFilePeriod / outputPeriod;
                                    let beginingOutputTime = contextVariables.datetimeLastProducedFile.valueOf();

                                    for (let i = 0; i < totalOutputCandles; i++) {
                                        let outputCandle = {
                                            open: 0,
                                            close: 0,
                                            min: 0,
                                            max: 0,
                                            begin: 0,
                                            end: 0
                                        };

                                        let saveCandle = false;
                                        outputCandle.begin = beginingOutputTime + i * outputPeriod;
                                        outputCandle.end = beginingOutputTime + (i + 1) * outputPeriod - 1;

                                        for (let j = 0; j < candlesFile.length; j++) {
                                            let candle = {
                                                open: candlesFile[j].open,
                                                close: candlesFile[j].close,
                                                min: candlesFile[j].low,
                                                max: candlesFile[j].high,
                                                begin: candlesFile[j].timestamp,
                                                end: candlesFile[j].timestamp + 60000 - 1 // 1 minute candle
                                            }

                                            if (candle.begin >= outputCandle.begin && candle.end <= outputCandle.end) {
                                                if (saveCandle === false) {
                                                    outputCandle.open = candle.open;
                                                    outputCandle.min = candle.min;
                                                    outputCandle.max = candle.max;
                                                }

                                                saveCandle = true;
                                                outputCandle.close = candle.close;
                                                if (candle.min < outputCandle.min) {
                                                    outputCandle.min = candle.min;
                                                }
                                                if (candle.max > outputCandle.max) {
                                                    outputCandle.max = candle.max;
                                                }
                                            }
                                        }
                                        if (saveCandle === true) {
                                            outputCandles[n].push(outputCandle);
                                        }
                                    }
                                    nextVolumeFile();

                                } catch (err) {
                                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[ERROR] start -> buildCandles -> timeframesLoop -> loopBody -> nextCandleFile -> err = " + err.stack);
                                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                                }
                            }

                            function nextVolumeFile() {
                                try {
                                    // For volumes, we use the same SQLite data but calculate volume differently
                                    const startOfDay = new Date(contextVariables.datetimeLastProducedFile)
                                    const endOfDay = new Date(contextVariables.datetimeLastProducedFile.valueOf() + SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS - 1)
                                    
                                    const volumesFile = sqliteStorage.getRecordsByDateRange(startOfDay, endOfDay)
                                    
                                    if (!volumesFile || volumesFile.length === 0) {
                                        writeFiles(outputCandles[n], outputVolumes[n], timeFrame, controlLoop);
                                        return;
                                    }

                                    const inputFilePeriod = 24 * 60 * 60 * 1000;
                                    let totalOutputVolumes = inputFilePeriod / outputPeriod;
                                    let beginingOutputTime = contextVariables.datetimeLastProducedFile.valueOf();

                                    for (let i = 0; i < totalOutputVolumes; i++) {
                                        let outputVolume = {
                                            buy: 0,
                                            sell: 0,
                                            begin: 0,
                                            end: 0
                                        }

                                        let saveVolume = false;
                                        outputVolume.begin = beginingOutputTime + i * outputPeriod;
                                        outputVolume.end = beginingOutputTime + (i + 1) * outputPeriod - 1;

                                        for (let j = 0; j < volumesFile.length; j++) {
                                            let volume = {
                                                buy: volumesFile[j].volume / 2, // Approximate buy/sell split
                                                sell: volumesFile[j].volume / 2,
                                                begin: volumesFile[j].timestamp,
                                                end: volumesFile[j].timestamp + 60000 - 1
                                            }

                                            if (volume.begin >= outputVolume.begin && volume.end <= outputVolume.end) {
                                                saveVolume = true;
                                                outputVolume.buy = outputVolume.buy + volume.buy;
                                                outputVolume.sell = outputVolume.sell + volume.sell;
                                            }
                                        }

                                        if (saveVolume === true) {
                                            outputVolumes[n].push(outputVolume);
                                        }
                                    }

                                    writeFiles(outputCandles[n], outputVolumes[n], timeFrame, controlLoop);
                                } catch (err) {
                                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[ERROR] start -> buildCandles -> timeframesLoop -> loopBody -> nextVolumeFile -> err = " + err.stack);
                                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                                }
                            }
                        }

                        function controlLoop() {
                            n++
                            if (n < TS.projects.foundations.globals.timeFrames.marketTimeFramesArray().length) {
                                loopBody()
                            } else {
                                writeStatusReport(contextVariables.datetimeLastProducedFile, advanceTime);
                            }
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
                    // Save to SQLite instead of JSON files
                    const candlesSaved = processedStorage.saveCandles(timeFrame, candles)
                    const volumesSaved = processedStorage.saveVolumes(timeFrame, volumes)
                    
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[INFO] start -> writeFiles -> Saved " + candlesSaved + " candles and " + volumesSaved + " volumes to SQLite for timeframe " + timeFrame);
                    
                    callBack()
                }
                catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] start -> writeFiles -> err = " + err.stack);
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
                        "[ERROR] start -> writeStatusReport -> err = " + err.stack);
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