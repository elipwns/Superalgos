# Advanced Data Management

## Date Range Strategy

### Granular Torrents by Time Period
```
bitstamp-BTC-USD-2015-2018.torrent  # Early years (150MB)
bitstamp-BTC-USD-2019-2022.torrent  # Mid period (200MB)  
bitstamp-BTC-USD-2023-2025.torrent  # Recent years (100MB)
```

**Benefits:**
- Download only what you need
- Smaller, faster downloads
- Easier to seed specific periods
- Can mix and match time ranges

### Complete vs Partial Downloads
```
# Full historical dataset
bitstamp-BTC-USD-COMPLETE-2015-2025.torrent  # 450MB

# Recent data only  
bitstamp-BTC-USD-RECENT-2024-2025.torrent    # 50MB

# Specific periods
bitstamp-BTC-USD-BULL-2020-2021.torrent      # Bull market data
bitstamp-BTC-USD-BEAR-2022-2023.torrent      # Bear market data
```

## Database Merging

### SQLite Merge Script
```bash
#!/bin/bash
# merge-databases.sh - Combine multiple SQLite databases

OUTPUT_DB="merged_bitstamp_BTC_USD.db"
INPUT_DBS=("db1.db" "db2.db" "db3.db")

# Create output database
sqlite3 "$OUTPUT_DB" "CREATE TABLE ohlcv (timestamp INTEGER PRIMARY KEY, open REAL, high REAL, low REAL, close REAL, volume REAL)"

# Merge all databases
for db in "${INPUT_DBS[@]}"; do
    echo "Merging $db..."
    sqlite3 "$OUTPUT_DB" "ATTACH '$db' AS source; INSERT OR IGNORE INTO ohlcv SELECT * FROM source.ohlcv; DETACH source;"
done

echo "Merged $(sqlite3 "$OUTPUT_DB" "SELECT COUNT(*) FROM ohlcv") records"
```

### Automated Merge Tool
```javascript
// merge-tool.js
const sqlite3 = require('sqlite3')

async function mergeDatabases(outputPath, inputPaths) {
    const db = new sqlite3.Database(outputPath)
    
    // Create table
    await db.run(`CREATE TABLE IF NOT EXISTS ohlcv (
        timestamp INTEGER PRIMARY KEY,
        open REAL, high REAL, low REAL, close REAL, volume REAL
    )`)
    
    for (const inputPath of inputPaths) {
        console.log(`Merging ${inputPath}...`)
        await db.run(`ATTACH '${inputPath}' AS source`)
        await db.run(`INSERT OR IGNORE INTO ohlcv SELECT * FROM source.ohlcv`)
        await db.run(`DETACH source`)
    }
    
    const count = await db.get(`SELECT COUNT(*) as count FROM ohlcv`)
    console.log(`Total records: ${count.count}`)
    db.close()
}
```

## Recommended Torrent Strategy

### 1. Layered Approach
```
# Foundation layer - Essential historical data
BTC-USD-FOUNDATION-2009-2020.torrent  # Genesis to institutional adoption

# Growth layer - Modern trading era  
BTC-USD-MODERN-2021-2023.torrent      # DeFi/NFT boom period

# Current layer - Recent data
BTC-USD-CURRENT-2024-2025.torrent     # Latest market cycles
```

### 2. Use Case Specific
```
# Strategy development (recent patterns)
BTC-USD-STRATEGY-2022-2025.torrent    # 3 years for backtesting

# Research (full history)
BTC-USD-RESEARCH-2009-2025.torrent    # Complete dataset

# Live trading (minimal history)
BTC-USD-LIVE-2024-2025.torrent        # Just enough for indicators
```

### 3. Update Frequency
```
# Quarterly releases
BTC-USD-Q1-2025.torrent  # Jan-Mar 2025
BTC-USD-Q2-2025.torrent  # Apr-Jun 2025

# Annual archives  
BTC-USD-2024-COMPLETE.torrent  # Full year archive
```

## Smart Download Strategy

### For New Users
1. **Download recent data first** (last 2 years)
2. **Start live collection** immediately  
3. **Download historical data** in background
4. **Merge when complete**

### For Researchers
1. **Download complete datasets** by priority
2. **Use merge tool** to combine periods
3. **Verify no gaps** between datasets

### For Traders
1. **Download strategy-specific periods**
2. **Focus on relevant market cycles**
3. **Skip ancient history** unless needed

## Gap Detection & Filling

### Check for Gaps Between Torrents
```sql
-- Find gaps between datasets
WITH gaps AS (
  SELECT timestamp, 
         LAG(timestamp) OVER (ORDER BY timestamp) as prev_timestamp
  FROM ohlcv 
)
SELECT * FROM gaps 
WHERE timestamp - prev_timestamp > 60000  -- More than 1 minute gap
```

### Auto-Fill Missing Data
```javascript
// fill-gaps.js - Automatically collect missing data
async function fillGaps(exchange, symbol, startTime, endTime) {
    const gaps = await findGaps(startTime, endTime)
    
    for (const gap of gaps) {
        console.log(`Filling gap: ${new Date(gap.start)} to ${new Date(gap.end)}`)
        await collectData(exchange, symbol, gap.start, gap.end)
    }
}
```

## Community Coordination

### Torrent Naming Convention
```
{exchange}-{pair}-{category}-{start}-{end}.torrent

Categories:
- FOUNDATION: Essential historical data
- COMPLETE: Full available history  
- RECENT: Last 1-2 years
- STRATEGY: Backtesting periods
- RESEARCH: Academic/analysis datasets
- LIVE: Current trading data
```

### Contribution Guidelines
1. **Check existing torrents** - Don't duplicate periods
2. **Fill gaps first** - Priority on missing data
3. **Document overlaps** - Note any duplicate periods
4. **Provide merge instructions** - How to combine with existing data

This approach gives users maximum flexibility while maintaining data integrity and avoiding redundant downloads.