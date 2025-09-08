// Setup script for SQLite storage in Superalgos
const fs = require('fs')
const path = require('path')

function setupSQLiteStorage() {
    console.log('🔧 Setting up SQLite Storage for Superalgos...')
    
    // Create Data/SQLite directory
    const sqliteDir = path.join(__dirname, 'Data', 'SQLite')
    if (!fs.existsSync(sqliteDir)) {
        fs.mkdirSync(sqliteDir, { recursive: true })
        console.log('✓ Created SQLite data directory:', sqliteDir)
    } else {
        console.log('✓ SQLite data directory exists:', sqliteDir)
    }
    
    // Check if files exist
    const files = [
        'Projects/Data-Mining/TS/Function-Libraries/OptimizedDataStorage.js',
        'Projects/Data-Mining/TS/Bot-Modules/Sensor-Bot/Exchange-Raw-Data/OptimizedHistoricOHLCVs.js'
    ]
    
    let allFilesExist = true
    for (const file of files) {
        if (fs.existsSync(path.join(__dirname, file))) {
            console.log('✓', file)
        } else {
            console.log('❌', file, '(missing)')
            allFilesExist = false
        }
    }
    
    if (allFilesExist) {
        console.log('\n✅ SQLite storage setup complete!')
        console.log('\n📋 Next steps:')
        console.log('1. In Superalgos UI, create or edit a Sensor Bot')
        console.log('2. In the Exchange Raw Data section, change the module from:')
        console.log('   HistoricOHLCVs.js → OptimizedHistoricOHLCVs.js')
        console.log('3. Start your data mining task')
        console.log('4. Monitor ./Data/SQLite/ for database files')
        console.log('\n💡 Benefits:')
        console.log('- No more file bloat (millions of JSON files)')
        console.log('- Efficient memory usage')
        console.log('- Fast SQLite queries')
        console.log('- Single database per exchange/symbol')
    } else {
        console.log('\n❌ Setup incomplete - some files are missing')
    }
}

setupSQLiteStorage()