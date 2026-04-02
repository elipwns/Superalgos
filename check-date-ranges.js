#!/usr/bin/env node

/**
 * Date Range Analysis
 * Checks configured start dates and actual data ranges in SQLite databases
 */

const fs = require('fs');
const path = require('path');

async function checkDateRanges() {
    console.log('📅 Date Range Analysis\n');
    
    const dataDir = './data';
    
    if (!fs.existsSync(dataDir)) {
        console.log('❌ Data directory not found');
        return;
    }
    
    const files = fs.readdirSync(dataDir);
    const dbFiles = files.filter(f => f.endsWith('.db') && !f.includes('-shm') && !f.includes('-wal') && !f.includes('bot_status'));
    
    console.log('📊 Data Range Analysis');
    console.log('=' .repeat(80));
    
    for (const dbFile of dbFiles) {
        const dbPath = path.join(dataDir, dbFile);
        const pair = dbFile.replace('bitstamp_', '').replace('.db', '').replace('_', '/');
        
        console.log(`\n💰 ${pair}`);
        
        try {
            const sqlite3 = require('sqlite3');
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);
            
            await new Promise((resolve, reject) => {
                // Get date range from OHLCV data
                db.get(`
                    SELECT 
                        MIN(datetime(timestamp/1000, 'unixepoch')) as earliest_date,
                        MAX(datetime(timestamp/1000, 'unixepoch')) as latest_date,
                        COUNT(*) as total_records,
                        MIN(timestamp) as earliest_timestamp,
                        MAX(timestamp) as latest_timestamp
                    FROM ohlcv 
                    ORDER BY timestamp
                `, (err, result) => {
                    if (err) {
                        console.log(`   ❌ Error reading data: ${err.message}`);
                        db.close();
                        resolve();
                        return;
                    }
                    
                    if (result && result.total_records > 0) {
                        console.log(`   📈 Records: ${result.total_records.toLocaleString()}`);
                        console.log(`   📅 Date Range: ${result.earliest_date} → ${result.latest_date}`);
                        
                        // Calculate data span
                        const startDate = new Date(result.earliest_timestamp);
                        const endDate = new Date(result.latest_timestamp);
                        const daySpan = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
                        console.log(`   ⏱️  Span: ${daySpan} days`);
                        
                        // Check for gaps (rough estimate)
                        const expectedRecords = daySpan * 24 * 60; // 1-minute candles
                        const completeness = ((result.total_records / expectedRecords) * 100).toFixed(1);
                        console.log(`   📊 Completeness: ~${completeness}% (${result.total_records.toLocaleString()}/${expectedRecords.toLocaleString()} expected)`);
                        
                        // Check recent activity
                        const hoursAgo = (Date.now() - result.latest_timestamp) / (1000 * 60 * 60);
                        if (hoursAgo < 24) {
                            console.log(`   ✅ Recent: Last update ${hoursAgo.toFixed(1)} hours ago`);
                        } else {
                            console.log(`   ⚠️  Stale: Last update ${Math.ceil(hoursAgo/24)} days ago`);
                        }
                        
                    } else {
                        console.log(`   ❌ No OHLCV data found`);
                    }
                    
                    db.close();
                    resolve();
                });
            });
            
        } catch (e) {
            console.log(`   ⚠️  Cannot analyze (sqlite3 module not available)`);
            
            // Basic file info
            const stats = fs.statSync(dbPath);
            const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
            console.log(`   📁 Size: ${sizeMB} MB`);
            console.log(`   📅 Modified: ${stats.mtime.toLocaleString()}`);
        }
    }
    
    // Check for configuration files that might contain start dates
    console.log('\n' + '=' .repeat(80));
    console.log('🔧 Configuration Analysis');
    console.log('=' .repeat(80));
    
    // Look for workspace files that might contain date configurations
    const workspaceDir = './Platform/My-Workspaces';
    if (fs.existsSync(workspaceDir)) {
        const workspaceFiles = fs.readdirSync(workspaceDir).filter(f => f.endsWith('.json'));
        console.log(`\n📁 Found ${workspaceFiles.length} workspace files:`);
        
        for (const file of workspaceFiles) {
            console.log(`   ${file}`);
        }
        
        console.log('\n💡 Start dates are typically configured in:');
        console.log('   - Workspace JSON files (Market Starting Point nodes)');
        console.log('   - Task configuration (Initial Date parameters)');
        console.log('   - Bot process settings (Date Range configurations)');
    }
    
    console.log('\n🎯 SMART DATE HANDLING:');
    console.log('✅ Superalgos automatically detects existing data ranges');
    console.log('✅ Fills gaps when you change start dates to earlier periods');
    console.log('✅ Continues from last processed date when restarting');
    console.log('✅ Handles overlapping data gracefully');
    
    console.log('\n📝 TO CHANGE START DATES:');
    console.log('1. Open your workspace in Superalgos UI');
    console.log('2. Navigate to Market Starting Point nodes');
    console.log('3. Update Initial Date parameters');
    console.log('4. Restart data mining tasks');
    console.log('5. System will backfill missing historical data');
}

// Run the analysis
checkDateRanges().catch(console.error);