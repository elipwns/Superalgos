exports.newDataMiningBotModulesCandlesVolumesMultiTimeFrameMarket = function (processIndex) {
    const MODULE_NAME = "Candles Volumes Multi Time Frame Market";
    const CANDLES_FOLDER_NAME = "Candles";
    const VOLUMES_FOLDER_NAME = "Volumes";

    let thisObject = {
        initialize: initialize,
        start: start
    };

    let fileStorage = TS.projects.foundations.taskModules.fileStorage.newFileStorage(processIndex);
    let storage;
    let statusDependenciesModule;
    let statusManager;
    let beginingOfMarket;

    function initialize(context, callback) {
        if (
            !TS.projects.foundations.processModules.statusDependencies ||
            !TS.projects.foundations.processModules.statusDependencies.newFoundationsProcessModulesStatusDependencies
        ) {
            const errMsg = "[ERROR] statusDependencies module is not loaded or TS object is incomplete.";
            if (callback) {
                callback({ result: 'Error', message: errMsg });
            }
            return;
        }
        // Initialize statusDependencies for this process (updated to processModules)
        statusDependenciesModule = TS.projects.foundations.processModules.statusDependencies.newFoundationsProcessModulesStatusDependencies(processIndex);
        if (typeof callback === 'function') {
            callback(null);
        }
    }

    function start(callBackFunction) {
        try {
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[INFO] start -> Entering function.");

            let contextVariables = {
                datetimeLastProducedFile: undefined,
                datetimeLastAvailableDependencyFile: undefined,
                datetimeBeginingOfMarketFile: undefined
            };

            getContextVariables();

            function getContextVariables() {
                try {
                    let thisReport;
                    let statusReport = statusDependenciesModule.reportsByMainUtility.get('Self Reference');

                    if (statusReport !== undefined) {
                        thisReport = statusReport.file;
                        if (thisReport.lastFile !== undefined) {
                            contextVariables.datetimeLastProducedFile = new Date(thisReport.lastFile);
                        }
                        if (thisReport.beginingOfMarket !== undefined) {
                            beginingOfMarket = new Date(thisReport.beginingOfMarket);
                        }
                    }

                    let dependencyIndex = 0;
                    getDependencies();

                    function getDependencies() {
                        let dependency = TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.processDependencies.dependencies[dependencyIndex];
                        let report = statusDependenciesModule.reportsByMainUtility.get(dependency.referenceParent.parentNode.config.codeName);

                        if (report === undefined) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[ERROR] Dependency not found: " + dependency.referenceParent.parentNode.config.codeName);
                            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                            return;
                        }

                        if (report.file.lastFile === undefined) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[WARN] Dependency has no data: " + dependency.referenceParent.parentNode.config.codeName);
                            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                            return;
                        }

                        let dependencyDate = new Date(report.file.lastFile);
                        if (contextVariables.datetimeLastAvailableDependencyFile === undefined) {
                            contextVariables.datetimeLastAvailableDependencyFile = dependencyDate;
                        } else {
                            if (dependencyDate.valueOf() < contextVariables.datetimeLastAvailableDependencyFile.valueOf()) {
                                contextVariables.datetimeLastAvailableDependencyFile = dependencyDate;
                            }
                        }

                        dependencyIndex++;
                        if (dependencyIndex < TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.processDependencies.dependencies.length) {
                            getDependencies();
                        } else {
                            startProcessing();
                        }
                    }

                    function startProcessing() {
                        if (contextVariables.datetimeLastProducedFile === undefined) {
                            contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeLastAvailableDependencyFile.valueOf() - SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);
                        }

                        if (beginingOfMarket === undefined) {
                            beginingOfMarket = new Date(contextVariables.datetimeLastAvailableDependencyFile);
                        }

                        findPreviousContent();
                    }

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err;
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] getContextVariables -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function findPreviousContent() {
                try {
                    let n = 0;
                    let allPreviousCandles = [];
                    let allPreviousVolumes = [];

                    loopBody();

                    function loopBody() {
                        let timeFrame = TS.projects.foundations.globals.timeFrames.marketTimeFramesArray()[n][1];
                        
                        getCandles();

                        function getCandles() {
                            let fileName = 'Data.json';
                            let filePath = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                "/Output/" + CANDLES_FOLDER_NAME + "/" +
                                TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" +
                                timeFrame + '/' + fileName;

                            storage.readFile(filePath).then(text => {
                                onFileReceived(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE, text);
                            }).catch(err => {
                                fileStorage.getTextFile(filePath, onFileReceived);
                            });

                            function onFileReceived(err, text) {
                                let previousCandles = [];
                                
                                if (err.result === TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                    try {
                                        previousCandles = JSON.parse(text);
                                    } catch (parseErr) {
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[ERROR] Failed to parse candles file: " + parseErr.stack);
                                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                                        return;
                                    }
                                }

                                getVolumes(previousCandles);
                            }
                        }

                        function getVolumes(previousCandles) {
                            let fileName = 'Data.json';
                            let filePath = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                                "/Output/" + VOLUMES_FOLDER_NAME + "/" +
                                TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" +
                                timeFrame + '/' + fileName;

                            storage.readFile(filePath).then(text => {
                                onFileReceived(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE, text);
                            }).catch(err => {
                                fileStorage.getTextFile(filePath, onFileReceived);
                            });

                            function onFileReceived(err, text) {
                                let previousVolumes = [];
                                
                                if (err.result === TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                    try {
                                        previousVolumes = JSON.parse(text);
                                    } catch (parseErr) {
                                        TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                            "[ERROR] Failed to parse volumes file: " + parseErr.stack);
                                        callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_RETRY_RESPONSE);
                                        return;
                                    }
                                }

                                allPreviousCandles.push(previousCandles);
                                allPreviousVolumes.push(previousVolumes);
                                controlLoop();
                            }
                        }
                    }

                    function controlLoop() {
                        n++;
                        if (n < TS.projects.foundations.globals.timeFrames.marketTimeFramesArray().length) {
                            loopBody();
                        } else {
                            buildCandles(allPreviousCandles, allPreviousVolumes);
                        }
                    }

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err;
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] findPreviousContent -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function buildCandles(allPreviousCandles, allPreviousVolumes) {
                try {
                    let fromDate = new Date(contextVariables.datetimeLastProducedFile.valueOf());
                    let outputCandles = [];
                    let outputVolumes = [];

                    for (let n = 0; n < TS.projects.foundations.globals.timeFrames.marketTimeFramesArray().length; n++) {
                        outputCandles.push([]);
                        outputVolumes.push([]);
                    }

                    advanceTime();

                    function advanceTime() {
                        contextVariables.datetimeLastProducedFile = new Date(contextVariables.datetimeLastProducedFile.valueOf() + SA.projects.foundations.globals.timeConstants.ONE_DAY_IN_MILISECONDS);

                        if (contextVariables.datetimeLastProducedFile.valueOf() > contextVariables.datetimeLastAvailableDependencyFile.valueOf()) {
                            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                            return;
                        }

                        let currentDateString = contextVariables.datetimeLastProducedFile.getUTCFullYear() + '-' +
                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(contextVariables.datetimeLastProducedFile.getUTCMonth() + 1, 2) + '-' +
                            SA.projects.foundations.utilities.miscellaneousFunctions.pad(contextVariables.datetimeLastProducedFile.getUTCDate(), 2);

                        let currentDate = new Date(contextVariables.datetimeLastProducedFile);
                        let percentage = TS.projects.foundations.utilities.dateTimeFunctions.getPercentage(fromDate, currentDate, new Date());
                        TS.projects.foundations.functionLibraries.processFunctions.processHeartBeat(processIndex, currentDateString, percentage);

                        timeframesLoop();
                    }

                    function timeframesLoop() {
                        let n = 0;
                        processNextTimeFrame();

                        function processNextTimeFrame() {
                            if (n >= TS.projects.foundations.globals.timeFrames.marketTimeFramesArray().length) {
                                writeStatusReport(contextVariables.datetimeLastProducedFile, advanceTime);
                                return;
                            }

                            let timeFrame = TS.projects.foundations.globals.timeFrames.marketTimeFramesArray()[n][1];
                            writeFiles(outputCandles[n], outputVolumes[n], timeFrame, () => {
                                n++;
                                processNextTimeFrame();
                            });
                        }
                    }

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err;
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] buildCandles -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            function writeFiles(candles, volumes, timeFrame, callBack) {
                try {
                    writeCandles();

                    function writeCandles() {
                        let separator = "";
                        let fileContent = "";

                        for (let i = 0; i < candles.length; i++) {
                            fileContent = fileContent + separator + '[' + candles[i].min + "," + candles[i].max + "," + candles[i].open + "," + candles[i].close + "," + candles[i].begin + "," + candles[i].end + "]";
                            if (separator === "") { separator = ","; }
                        }

                        fileContent = "[" + fileContent + "]";

                        let fileName = 'Data.json';
                        let filePath = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                            "/Output/" + CANDLES_FOLDER_NAME + "/" +
                            TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" +
                            timeFrame + '/' + fileName;

                        storage.writeFile(filePath, fileContent + '\n').then(() => {
                            onFileCreated(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                        }).catch(err => {
                            fileStorage.createTextFile(filePath, fileContent + '\n', onFileCreated);
                        });

                        function onFileCreated(err) {
                            if (err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                callBackFunction(err);
                                return;
                            }
                            writeVolumes();
                        }
                    }

                    function writeVolumes() {
                        let separator = "";
                        let fileContent = "";

                        for (let i = 0; i < volumes.length; i++) {
                            fileContent = fileContent + separator + '[' + volumes[i].buy + "," + volumes[i].sell + "," + volumes[i].begin + "," + volumes[i].end + "]";
                            if (separator === "") { separator = ","; }
                        }

                        fileContent = "[" + fileContent + "]";

                        let fileName = 'Data.json';
                        let filePath = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).FILE_PATH_ROOT +
                            "/Output/" + VOLUMES_FOLDER_NAME + "/" +
                            TS.projects.foundations.globals.taskConstants.TASK_NODE.bot.processes[processIndex].referenceParent.config.codeName + "/" +
                            timeFrame + '/' + fileName;

                        storage.writeFile(filePath, fileContent + '\n').then(() => {
                            onFileCreated(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                        }).catch(err => {
                            fileStorage.createTextFile(filePath, fileContent + '\n', onFileCreated);
                        });

                        function onFileCreated(err) {
                            if (err.result !== TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE.result) {
                                callBackFunction(err);
                                return;
                            }
                            callBack();
                        }
                    }

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err;
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] writeFiles -> err = " + err.stack);
                    callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

            async function writeStatusReport(lastFileDate, callBack) {
                try {
                    let thisReport = statusDependenciesModule.reportsByMainUtility.get('Self Reference');

                    thisReport.file.lastExecution = TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).PROCESS_DATETIME;
                    thisReport.file.lastFile = lastFileDate;
                    thisReport.file.beginingOfMarket = beginingOfMarket.toUTCString();
                    
                    if (statusManager && statusManager.saveStatus) {
                        try {
                            await statusManager.saveStatus('Self Reference', thisReport.file);
                            callBack(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                        } catch (statusError) {
                            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                                "[WARN] writeStatusReport -> Hybrid status save failed, using legacy method: " + statusError.message);
                            callBack(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                        }
                    } else {
                        callBack(TS.projects.foundations.globals.standardResponses.DEFAULT_OK_RESPONSE);
                    }

                } catch (err) {
                    TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err;
                    TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                        "[ERROR] writeStatusReport -> err = " + (err ? err.stack : 'undefined error'));
                    callBack(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
                }
            }

        } catch (err) {
            TS.projects.foundations.globals.processVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).UNEXPECTED_ERROR = err;
            TS.projects.foundations.globals.loggerVariables.VARIABLES_BY_PROCESS_INDEX_MAP.get(processIndex).BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write(MODULE_NAME,
                "[ERROR] start -> err = " + err.stack);
            callBackFunction(TS.projects.foundations.globals.standardResponses.DEFAULT_FAIL_RESPONSE);
        }
    }

    return thisObject;
};
