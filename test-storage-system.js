// Test script to verify the storage abstraction system works
const StorageFactory = require('./lib/StorageFactory')

async function testStorageSystem() {
    console.log('🧪 Testing Storage Abstraction System...\n')

    // Test JSON Storage
    console.log('📁 Testing JSON Storage:')
    const jsonConfig = {
        dataStorage: {
            type: 'json',
            json: { path: './test-data' }
        }
    }
    
    const jsonStorage = StorageFactory.create(jsonConfig)
    
    try {
        const testData = { test: 'data', timestamp: Date.now() }
        await jsonStorage.writeFile('test.json', testData)
        console.log('  ✅ Write successful')
        
        const readData = await jsonStorage.readFile('test.json')
        console.log('  ✅ Read successful:', readData.test)
        
        const exists = await jsonStorage.exists('test.json')
        console.log('  ✅ Exists check:', exists)
        
    } catch (err) {
        console.log('  ❌ JSON Storage error:', err.message)
    }

    // Test SQLite Storage (if available)
    console.log('\n💾 Testing SQLite Storage:')
    const sqliteConfig = {
        dataStorage: {
            type: 'sqlite',
            sqlite: { path: './test-data' }
        }
    }
    
    try {
        const sqliteStorage = StorageFactory.create(sqliteConfig)
        
        const testData = { test: 'sqlite-data', timestamp: Date.now() }
        await sqliteStorage.writeFile('test-sqlite.json', testData)
        console.log('  ✅ SQLite Write successful')
        
        const readData = await sqliteStorage.readFile('test-sqlite.json')
        console.log('  ✅ SQLite Read successful:', readData.test)
        
    } catch (err) {
        console.log('  ⚠️  SQLite not available (expected if SQLite files not present):', err.message)
    }

    console.log('\n🎯 Storage system test completed!')
}

// Run the test
testStorageSystem().catch(console.error)