// Test script for the optimized SQLite data storage
const path = require('path')

// Mock the TS global object structure
global.TS = {
    projects: {
        dataMining: {
            functionLibraries: {
                optimizedDataStorage: {
                    newDataMiningFunctionLibrariesOptimizedDataStorage: require('./Projects/Data-Mining/TS/Function-Libraries/OptimizedDataStorage').newDataMiningFunctionLibrariesOptimizedDataStorage
                }
            }
        }
    }
}

async function testSQLiteStorage() {
    console.log('Testing SQLite Data Storage...')
    
    const storage = TS.projects.dataMining.functionLibraries.optimizedDataStorage.newDataMiningFunctionLibrariesOptimizedDataStorage()
    
    // Test data - sample OHLCV records
    const testData = [
        [1640995200000, 47000.50, 47100.25, 46900.75, 47050.00, 1250.5], // 2022-01-01 00:00
        [1640995260000, 47050.00, 47200.00, 47000.00, 47150.25, 980.3],  // 2022-01-01 00:01
        [1640995320000, 47150.25, 47300.50, 47100.00, 47250.75, 1100.8], // 2022-01-01 00:02
        [1640995380000, 47250.75, 47400.00, 47200.00, 47350.50, 750.2],  // 2022-01-01 00:03
        [1640995440000, 47350.50, 47500.25, 47300.00, 47450.00, 1350.7]  // 2022-01-01 00:04
    ]
    
    try {
        // Initialize storage
        await new Promise((resolve, reject) => {
            storage.initialize('binance', 'BTC/USDT', (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        console.log('✓ Storage initialized successfully')
        
        // Save test data
        await new Promise((resolve, reject) => {
            storage.saveOHLCVBatch(testData, (err, count) => {
                if (err) reject(err)
                else {
                    console.log(`✓ Saved ${count} OHLCV records`)
                    resolve()
                }
            })
        })
        
        // Get last timestamp
        const lastTimestamp = await new Promise((resolve, reject) => {
            storage.getLastTimestamp((err, timestamp) => {
                if (err) reject(err)
                else resolve(timestamp)
            })
        })
        console.log(`✓ Last timestamp: ${lastTimestamp} (${new Date(lastTimestamp)})`)
        
        // Retrieve data range
        const retrievedData = await new Promise((resolve, reject) => {
            storage.getOHLCVRange(1640995200000, 1640995440000, (err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
        console.log(`✓ Retrieved ${retrievedData.length} records`)
        console.log('Sample record:', retrievedData[0])
        
        // Test memory efficiency with larger dataset
        console.log('\nTesting with larger dataset...')
        const largeData = []
        const startTime = 1640995200000
        for (let i = 0; i < 10000; i++) {
            largeData.push([
                startTime + (i * 60000), // 1 minute intervals
                47000 + Math.random() * 1000,
                47000 + Math.random() * 1000,
                47000 + Math.random() * 1000,
                47000 + Math.random() * 1000,
                Math.random() * 2000
            ])
        }
        
        const startSave = Date.now()
        await new Promise((resolve, reject) => {
            storage.saveOHLCVBatch(largeData, (err, count) => {
                if (err) reject(err)
                else {
                    const saveTime = Date.now() - startSave
                    console.log(`✓ Saved ${count} records in ${saveTime}ms`)
                    resolve()
                }
            })
        })
        
        // Test retrieval performance
        const startRetrieve = Date.now()
        const allData = await new Promise((resolve, reject) => {
            storage.getOHLCVRange(startTime, startTime + (10000 * 60000), (err, data) => {
                if (err) reject(err)
                else resolve(data)
            })
        })
        const retrieveTime = Date.now() - startRetrieve
        console.log(`✓ Retrieved ${allData.length} records in ${retrieveTime}ms`)
        
        // Cleanup
        storage.cleanup()
        console.log('✓ Storage cleaned up')
        
        console.log('\n🎉 All tests passed! SQLite storage is working correctly.')
        
    } catch (err) {
        console.error('❌ Test failed:', err.message)
        storage.cleanup()
    }
}

// Run the test
testSQLiteStorage().catch(console.error)