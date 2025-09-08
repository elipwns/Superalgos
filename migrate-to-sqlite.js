// Migration script to convert existing file-based OHLCV data to SQLite
const fs = require('fs')
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

async function migrateExistingData(exchangeName, symbol, dataPath) {
    console.log(`\nMigrating data for ${exchangeName} ${symbol}...`)
    
    const storage = TS.projects.dataMining.functionLibraries.optimizedDataStorage.newDataMiningFunctionLibrariesOptimizedDataStorage()
    
    try {
        // Initialize SQLite storage
        await new Promise((resolve, reject) => {
            storage.initialize(exchangeName, symbol, (err) => {
                if (err) reject(err)
                else resolve()
            })
        })
        console.log('✓ SQLite storage initialized')
        
        // Find all OHLCV data files
        const ohlcvPath = path.join(dataPath, 'OHLCVs', 'One-Min')
        if (!fs.existsSync(ohlcvPath)) {
            console.log('⚠ No OHLCV data found at:', ohlcvPath)
            return
        }
        
        let totalRecords = 0
        let totalFiles = 0
        
        // Walk through year/month/day directory structure
        const years = fs.readdirSync(ohlcvPath).filter(item => 
            fs.statSync(path.join(ohlcvPath, item)).isDirectory()
        )
        
        for (const year of years) {
            const yearPath = path.join(ohlcvPath, year)
            const months = fs.readdirSync(yearPath).filter(item => 
                fs.statSync(path.join(yearPath, item)).isDirectory()
            )
            
            for (const month of months) {
                const monthPath = path.join(yearPath, month)
                const days = fs.readdirSync(monthPath).filter(item => 
                    fs.statSync(path.join(monthPath, item)).isDirectory()
                )
                
                for (const day of days) {
                    const dayPath = path.join(monthPath, day)
                    const dataFile = path.join(dayPath, 'Data.json')
                    
                    if (fs.existsSync(dataFile)) {
                        try {
                            const fileContent = fs.readFileSync(dataFile, 'utf8')
                            const ohlcvData = JSON.parse(fileContent)
                            
                            if (Array.isArray(ohlcvData) && ohlcvData.length > 0) {
                                // Save batch to SQLite
                                await new Promise((resolve, reject) => {
                                    storage.saveOHLCVBatch(ohlcvData, (err, count) => {
                                        if (err) reject(err)
                                        else {
                                            totalRecords += count
                                            totalFiles++
                                            console.log(`  ✓ Migrated ${count} records from ${year}-${month}-${day}`)
                                            resolve()
                                        }
                                    })
                                })
                            }
                        } catch (err) {
                            console.log(`  ❌ Failed to process ${dataFile}: ${err.message}`)
                        }
                    }
                }
            }
        }
        
        console.log(`✅ Migration complete: ${totalRecords} records from ${totalFiles} files`)
        
    } catch (err) {
        console.error('❌ Migration failed:', err.message)
    } finally {
        storage.cleanup()
    }
}

async function cleanupOldFiles(dataPath, dryRun = true) {
    console.log(`\n${dryRun ? 'Simulating' : 'Performing'} cleanup of old files...`)
    
    const foldersToClean = ['Candles', 'Volumes', 'OHLCVs']
    let totalSize = 0
    let fileCount = 0
    
    for (const folder of foldersToClean) {
        const folderPath = path.join(dataPath, folder)
        if (fs.existsSync(folderPath)) {
            const stats = await getFolderStats(folderPath)
            totalSize += stats.size
            fileCount += stats.files
            
            console.log(`  ${folder}: ${stats.files} files, ${(stats.size / 1024 / 1024 / 1024).toFixed(2)} GB`)
            
            if (!dryRun) {
                fs.rmSync(folderPath, { recursive: true, force: true })
                console.log(`  ✓ Deleted ${folder}`)
            }
        }
    }
    
    console.log(`Total: ${fileCount} files, ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`)
    
    if (dryRun) {
        console.log('⚠ This was a dry run. Use cleanupOldFiles(dataPath, false) to actually delete files.')
    }
}

async function getFolderStats(folderPath) {
    let totalSize = 0
    let fileCount = 0
    
    function walkDir(dir) {
        const files = fs.readdirSync(dir)
        
        for (const file of files) {
            const filePath = path.join(dir, file)
            const stat = fs.statSync(filePath)
            
            if (stat.isDirectory()) {
                walkDir(filePath)
            } else {
                totalSize += stat.size
                fileCount++
            }
        }
    }
    
    walkDir(folderPath)
    return { size: totalSize, files: fileCount }
}

// Example usage
async function main() {
    console.log('🔄 Superalgos Data Migration Tool')
    console.log('================================')
    
    // Example: Migrate Binance BTC/USDT data
    // Replace these paths with your actual data locations
    const migrations = [
        {
            exchange: 'binance',
            symbol: 'BTC/USDT',
            dataPath: './Platform/My-Data-Storage/Project/Data-Mining/Data-Mine/Binance/USDT-BTC'
        }
        // Add more exchanges/symbols as needed
    ]
    
    for (const migration of migrations) {
        if (fs.existsSync(migration.dataPath)) {
            await migrateExistingData(migration.exchange, migration.symbol, migration.dataPath)
            
            // Show cleanup preview
            await cleanupOldFiles(migration.dataPath, true)
        } else {
            console.log(`⚠ Data path not found: ${migration.dataPath}`)
        }
    }
    
    console.log('\n✅ Migration process complete!')
    console.log('\nNext steps:')
    console.log('1. Test the SQLite data with your trading systems')
    console.log('2. Update your sensor bot configuration to use OptimizedHistoricOHLCVs')
    console.log('3. Run cleanup with dryRun=false to remove old files')
}

// Uncomment to run migration
// main().catch(console.error)

module.exports = {
    migrateExistingData,
    cleanupOldFiles,
    getFolderStats
}