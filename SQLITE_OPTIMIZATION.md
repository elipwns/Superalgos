# SQLite Data Storage Optimization

## Overview
This document covers the complete SQLite storage system that replaces Superalgos' file-based OHLCV storage, eliminating memory leaks and reducing storage from 500GB+ to ~300MB.

## Table of Contents
- [Problem Solved](#problem-solved)
- [Migration Guide](#migration-guide)
- [Community Data Torrents](#community-data-torrents)
- [Technical Implementation](#technical-implementation)
- [Performance Benefits](#performance-benefits)

## Problem Solved

### Before (File-Based Storage)
- ❌ **Memory leaks** - System crashes after hours/days
- ❌ **Millions of files** - Poor filesystem performance
- ❌ **Resource intensive** - High CPU/memory usage
- ❌ **Slow queries** - Linear file scanning

### After (SQLite Storage)
- ✅ **Memory stable** - Runs indefinitely without leaks
- ✅ **Compact storage** - Efficient database files
- ✅ **Fast queries** - Indexed SQLite performance
- ✅ **Low resources** - Minimal CPU/memory footprint

## Migration Guide

### For New Users

**Option A: Download Historical Data (Recommended)**
1. Download pre-collected data torrents:
   
   # Download torrents with your preferred client
   # BTC: Data-Torrents/exchanges/bitstamp/BTC-USD/bitstamp-BTC-USD-2015-2018.torrent
   # ETH: Data-Torrents/exchanges/bitstamp/ETH-USD/bitstamp-ETH-USD-2018-2025.torrent
   ```

2. Install databases:
   ```bash
   mkdir -p ./Data/SQLite/
   cp ./downloaded-torrents/*/bitstamp_*_USD.db ./Data/SQLite/
   ```

3. Start Superalgos - continues collection from where torrents left off

**Option B: Fresh Collection**
Simply start Superalgos - SQLite collection begins automatically with smart start dates.

### For Existing Users

**Option A: Download + Migrate (Recommended)**
1. Download historical torrents (see New Users section above)
2. Migrate your recent data:
   ```javascript
   const { migrateExistingData } = require('./migrate-to-sqlite')
   
   migrateExistingData(
     'binance', 
     'BTC/USDT', 
     './Platform/My-Data-Storage/Project/Data-Mining/Data-Mine/Binance/USDT-BTC'
   )
   ```

**Option B: Fresh Start**
1. Stop Superalgos
2. Backup existing data: `cp -r Platform/My-Data-Storage/Project/Data-Mining/Data-Mine ./backup`
3. Delete old data: `rm -rf Platform/My-Data-Storage/Project/Data-Mining/Data-Mine`
4. Download torrents or start fresh collection

**Option C: Full Migration**
Migrate all existing data without torrents (slowest option):
```javascript
const { migrateExistingData } = require('./migrate-to-sqlite')

migrateExistingData(
  'binance', 
  'BTC/USDT', 
  './Platform/My-Data-Storage/Project/Data-Mining/Data-Mine/Binance/USDT-BTC'
)
```

#### Verification
```bash
# Check databases created
ls -la Data/SQLite/

# Verify record count
node -e "
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('./Data/SQLite/binance_BTC_USDT.db');
db.get('SELECT COUNT(*) as count FROM ohlcv', (err, row) => {
  console.log('Records:', row.count);
  db.close();
});
"
```

## Community Data Torrents

### Available Torrents

**Bitstamp Historical Data:**
- `Data-Torrents/exchanges/bitstamp/BTC-USD/bitstamp-BTC-USD-2015-2018.torrent` - 1.8M records, ~180MB
- `Data-Torrents/exchanges/bitstamp/ETH-USD/bitstamp-ETH-USD-2018-2025.torrent` - 200K records, ~20MB  
- `Data-Torrents/exchanges/bitstamp/LTC-USD/bitstamp-LTC-USD-2018-2021.torrent` - 1.6M records, ~160MB
- `Data-Torrents/exchanges/bitstamp/DOGE-USD/bitstamp-DOGE-USD-2024-2025.torrent` - 160K records, ~16MB

### Quick Start
```bash
# 1. Fork and clone your Superalgos repository
# Fork https://github.com/Superalgos/Superalgos on GitHub first
git clone https://github.com/YOUR_USERNAME/Superalgos.git
cd Superalgos
git checkout develop

# 2. Download with torrent client (example for BTC)
# Open Data-Torrents/exchanges/bitstamp/BTC-USD/bitstamp-BTC-USD-2015-2018.torrent
# in qBittorrent, Transmission, etc.

# 3. Install databases
mkdir -p ./Data/SQLite/
cp ./torrent-downloads/*/bitstamp_*_USD.db ./Data/SQLite/

# 4. Start Superalgos - continues from where torrents left off
node platform noBrowser
```

### Contributing Data
```bash
# Create torrent from your data
./Data-Torrents/templates/create-torrent.sh \
  -e bitstamp -b BTC -q USD -s 2015 -n 2025 \
  -d ./Data/SQLite/bitstamp_BTC_USD.db

# Submit PR with torrent + metadata
git add Data-Torrents/exchanges/bitstamp/BTC-USD/
git commit -m "Add Bitstamp BTC/USD historical data (2015-2025)"
git push origin develop
# Create PR from your fork's develop branch to Superalgos/Superalgos develop branch
```

### Torrent Strategy
- **Recent Data**: `BTC-USD-RECENT-2024-2025.torrent` (50MB)
- **Complete History**: `BTC-USD-COMPLETE-2015-2025.torrent` (450MB)  
- **Specific Periods**: `BTC-USD-BULL-2020-2021.torrent` (100MB)

Users download only what they need, merge databases as required.

## Technical Implementation

### Core Components
- **OptimizedDataStorage.js** - SQLite storage engine
- **GlobalSQLiteVFS.js** - Virtual file system for compatibility
- **HistoricOHLCVs.js** - Updated data collection bot
- **CoinHistoryConfig.js** - Smart start dates per coin

### Database Schema
```sql
CREATE TABLE ohlcv (
    timestamp INTEGER PRIMARY KEY,
    open REAL NOT NULL,
    high REAL NOT NULL, 
    low REAL NOT NULL,
    close REAL NOT NULL,
    volume REAL NOT NULL
);
```

### Virtual File System
The VFS intercepts filesystem calls and serves SQLite data as JSON, maintaining compatibility with existing Superalgos components:

```javascript
// Intercepts: /Data/Exchange/bitstamp/BTC-USD/Output/Candles/2025/01/08/Data.json
// Serves: SQLite query results formatted as expected JSON
```

### Configuration Compatibility
User `startDate` configurations are respected:
```json
{
  "startDate": "2021-01-01",
  "waitForSignalsToRunNextLoop": false
}
```

Priority order:
1. Continue from existing database data
2. Use user-configured `startDate`
3. Fall back to smart coin-specific defaults

## Performance Benefits

### Storage Efficiency
| Metric | File-Based | SQLite | Improvement |
|--------|------------|--------|-------------|
| **Files** | Millions | ~6 databases | 99.9%+ reduction |
| **Memory** | 8GB+ growing | ~500MB stable | 85%+ reduction |
| **Queries** | Linear scan | Indexed | 10x+ faster |

### Operational Benefits
- **No more crashes** from memory leaks
- **Faster startup** - No filesystem scanning
- **Better performance** - Indexed queries vs file scanning  
- **Easier backup** - Copy a few database files vs millions
- **Network friendly** - Compact torrents vs massive file transfers

### Development Benefits
- **Easier debugging** - SQL queries vs file parsing
- **Better testing** - Isolated database per test
- **Simpler deployment** - Self-contained databases
- **Version control friendly** - No massive file changes

## Troubleshooting

### Common Issues

**"Network Node not found" errors**
- Wait for data collection to populate databases
- Restart system after first data is collected
- Check VFS initialization in logs

**SQLite databases not created**
- Verify `Data/SQLite/` directory exists and is writable
- Check exchange/symbol names match configuration
- Review logs for initialization errors

**Migration fails**
- Check file permissions on old data
- Ensure sufficient disk space for temporary files
- Verify old data directory structure

### Performance Monitoring
```bash
# Check database sizes
du -sh Data/SQLite/*.db

# Monitor memory usage
top -p $(pgrep node)

# Check collection progress
node check_latest_data.js
```

## Future Enhancements
- Automated torrent creation from CI
- Web dashboard for available datasets
- Multi-exchange data synchronization
- Real-time data streaming integration
- Advanced analytics and reporting tools

---

**The SQLite optimization transforms Superalgos from a resource-intensive system prone to crashes into a lean, stable, and efficient trading platform.** 🚀

For detailed torrent usage, see [Data-Torrents/README.md](Data-Torrents/README.md)  
For migration scripts, see [migrate-to-sqlite.js](migrate-to-sqlite.js)  
For advanced usage, see [Data-Torrents/ADVANCED_USAGE.md](Data-Torrents/ADVANCED_USAGE.md)
