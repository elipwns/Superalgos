exports.newDataMiningIndicatorMultiTimeFrameDailySQLite = function (processIndex) {
    const MODULE_NAME = "Multi Time Frame Daily SQLite"
    
    let thisObject = {
        initialize: initialize,
        finalize: finalize,
        start: start
    };

    let statusDependenciesModule
    let dataDependenciesModule
    let dataFiles = new Map()
    let indicatorOutputModule
    let processedStorage

    return thisObject;

    function initialize(pStatusDependencies, pDataDependenciesModule, callBackFunction) {
        try {
            statusDependenciesModule = pStatusDependencies
            dataDependenciesModule = pDataDependenciesModule

            // Initialize SQLite storage for processed data
            const ProcessedDataStorage = require('../../Function-Libraries/ProcessedDataStorage')
            const exchangeName = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.parentNode.parentNode.config.codeName
            const baseAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.baseAsset.referenceParent.config.codeName
            const quotedAsset = TS.projects.foundations.globals.taskConstants.TASK_NODE.parentNode.parentNode.parentNode.referenceParent.quotedAsset.referenceParent.config.codeName
            
            processedStorage = new ProcessedDataStorage(exchangeName, `${baseAsset}_${quotedAsset}`)

            indicatorOutputModule = TS.projects.dataMining.botModules.indicatorOutput.newDataMiningBotModulesIndicatorOutput(processIndex)
            indicatorOutputModule.initialize(callBackFunction)
        } catch (err) {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] initialize -> err = " + err.stack);
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
        }
    }

    function finalize() {
        dataFiles = undefined
        statusDependenciesModule = undefined
        dataDependenciesModule = undefined
        indicatorOutputModule = undefined
        processedStorage = undefined
        thisObject = undefined
    }

    function start(callBackFunction) {
        try {
            processTimeFrames()

            function processTimeFrames() {
                let n = 0
                timeFramesLoop()

                function timeFramesLoop() {
                    timeFramesLoopBody()
                }

                function timeFramesLoopBody() {
                    const timeFrame = TS.projects.foundations.globals.timeFrames.dailyTimeFramesArray()[n][0]
                    const timeFrameLabel = TS.projects.foundations.globals.timeFrames.dailyTimeFramesArray()[n][1]

                    /* Check Time Frames Filter */
                    if (TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.timeFramesFilter !== undefined) {
                        if (TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.timeFramesFilter.config.dailyTimeFrames !== undefined) {
                            if (TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.timeFramesFilter.config.dailyTimeFrames.includes(timeFrameLabel) === false) {
                                timeFramesControlLoop()
                                return
                            }
                        }
                    }

                    let dependencyIndex = 0
                    dataFiles = new Map()

                    dependencyLoopBody()

                    function dependencyLoopBody() {
                        let dependency = dataDependenciesModule.curatedDependencyNodeArray[dependencyIndex]
                        
                        getSQLiteData()

                        function getSQLiteData() {
                            try {
                                let records = []
                                
                                if (dependency.referenceParent.config.codeName === 'Candles') {
                                    records = processedStorage.getCandles(timeFrameLabel)
                                } else if (dependency.referenceParent.config.codeName === 'Volumes') {
                                    records = processedStorage.getVolumes(timeFrameLabel)
                                }
                                
                                if (!records || records.length === 0) {
                                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                        "[WARN] getSQLiteData -> No processed " + dependency.referenceParent.config.codeName + " data available for " + timeFrameLabel)
                                    let customResponse = {
                                        result: TS.projects.foundations.globals.standardResponses.CUSTOM_OK_RESPONSE.result,
                                        message: "Processed " + dependency.referenceParent.config.codeName + " dependency does not exist."
                                    }
                                    callBackFunction(customResponse)
                                    return;
                                }
                                
                                // Convert processed SQLite records to the expected array format
                                let dataFile = []
                                
                                if (dependency.referenceParent.config.codeName === 'Candles') {
                                    // Candles format: [min, max, open, close, begin, end]
                                    for (let record of records) {
                                        dataFile.push([
                                            record.min,      // min
                                            record.max,      // max  
                                            record.open,     // open
                                            record.close,    // close
                                            record.begin,    // begin
                                            record.end       // end
                                        ])
                                    }
                                } else if (dependency.referenceParent.config.codeName === 'Volumes') {
                                    // Volumes format: [buy, sell, begin, end]
                                    for (let record of records) {
                                        dataFile.push([
                                            record.buy,      // buy volume
                                            record.sell,     // sell volume
                                            record.begin,    // begin
                                            record.end       // end
                                        ])
                                    }
                                }

                                dataFiles.set(dependency.id, dataFile)
                                dependencyControlLoop()

                            } catch (err) {
                                TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                    "[ERROR] getSQLiteData -> err = " + err.stack)
                                callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
                                return;
                            }
                        }
                    }

                    function dependencyControlLoop() {
                        dependencyIndex++;
                        if (dependencyIndex < dataDependenciesModule.curatedDependencyNodeArray.length) {
                            dependencyLoopBody()
                        } else {
                            generateOutput()
                        }

                        function generateOutput() {
                            indicatorOutputModule.start(
                                dataFiles,
                                timeFrame,
                                timeFrameLabel,
                                undefined,
                                undefined,
                                onOutputGenerated)

                            function onOutputGenerated(err) {
                                if (err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                    callBackFunction(err)
                                    return;
                                }
                                timeFramesControlLoop()
                            }
                        }
                    }
                }

                function timeFramesControlLoop() {
                    n++;
                    if (n < TS.projects.foundations.globals.timeFrames.dailyTimeFramesArray().length) {
                        timeFramesLoopBody()
                    } else {
                        writeStatusReport(callBackFunction)
                    }
                }
            }

            function writeStatusReport(callBack) {
                let thisReport = statusDependenciesModule.reportsByMainUtility.get('Self Reference')

                thisReport.file.lastExecution = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).PROCESS_DATETIME;
                if (TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.timeFramesFilter !== undefined) {
                    if (TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.timeFramesFilter.config.dailyTimeFrames !== undefined) {
                        thisReport.file.timeFrames = TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.timeFramesFilter.config.dailyTimeFrames
                    }
                }
                thisReport.save(callBack)
            }
        }
        catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] start -> err = " + err.stack)
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE)
        }
    }
}