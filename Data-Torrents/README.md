# Superalgos Community Data Torrents

## Overview
This directory contains community-contributed SQLite database torrents for Superalgos. Instead of everyone collecting the same historical data, share and download pre-collected datasets.

## Benefits
- **Skip years of collection time** - Download historical data instantly
- **Save bandwidth** - P2P distribution vs centralized servers  
- **Community driven** - Multiple exchanges, pairs, timeframes
- **Efficient storage** - SQLite databases vs millions of JSON files

## Directory Structure
```
Data-Torrents/
├── exchanges/
│   ├── bitstamp/
│   │   ├── BTC-USD/
│   │   │   ├── bitstamp-BTC-USD-2015-2025.torrent
│   │   │   └── bitstamp-BTC-USD-2015-2025.md
│   │   └── ETH-USD/
│   │       ├── bitstamp-ETH-USD-2018-2025.torrent
│   │       └── bitstamp-ETH-USD-2018-2025.md
│   ├── binance/
│   └── coinbase/
├── templates/
│   ├── torrent-template.md
│   └── create-torrent.sh
└── README.md (this file)
```

## Naming Convention
```
{exchange}-{base}-{quote}-{start_year}-{end_year}.torrent
```

Examples:
- `bitstamp-BTC-USD-2015-2025.torrent`
- `binance-ETH-USDT-2017-2025.torrent`
- `coinbase-DOGE-USD-2021-2025.torrent`

## How to Contribute Data

### 1. Prepare Your Data
```bash
# Create clean export directory
mkdir -p ./torrent-export/bitstamp-BTC-USD-2015-2025

# Copy your SQLite database
cp ./Data/SQLite/bitstamp_BTC_USD.db ./torrent-export/bitstamp-BTC-USD-2015-2025/

# Add metadata
echo "Database created: $(date)" > ./torrent-export/bitstamp-BTC-USD-2015-2025/INFO.txt
echo "Records: $(sqlite3 ./Data/SQLite/bitstamp_BTC_USD.db 'SELECT COUNT(*) FROM ohlcv')" >> ./torrent-export/bitstamp-BTC-USD-2015-2025/INFO.txt
```

### 2. Create Torrent
```bash
# Using transmission-create (Linux/Mac)
transmission-create -o bitstamp-BTC-USD-2015-2025.torrent -t udp://tracker.openbittorrent.com:80 ./torrent-export/bitstamp-BTC-USD-2015-2025

# Using qbittorrent (Windows/GUI)
# File -> Create Torrent -> Select folder -> Add trackers -> Create
```

### 3. Create Metadata File
Copy `templates/torrent-template.md` and fill in details:
- Database size and record count
- Date range covered
- Collection method and settings
- Verification checksums

### 4. Submit Pull Request
```bash
# Add files to appropriate exchange/pair directory
git add Data-Torrents/exchanges/bitstamp/BTC-USD/
git commit -m "Add Bitstamp BTC/USD historical data (2015-2025)"
git push origin feature/bitstamp-btc-data
# Create PR with description
```

## How to Use Torrents

### 1. Download Torrent
```bash
# Clone repo to get torrent files
git clone https://github.com/Superalgos/Superalgos.git
cd Superalgos/Data-Torrents/exchanges/bitstamp/BTC-USD/

# Download with your torrent client
transmission-cli bitstamp-BTC-USD-2015-2025.torrent
```

### 2. Install Database
```bash
# Create SQLite directory if needed
mkdir -p ./Data/SQLite/

# Copy downloaded database
cp ./bitstamp-BTC-USD-2015-2025/bitstamp_BTC_USD.db ./Data/SQLite/

# Verify installation
sqlite3 ./Data/SQLite/bitstamp_BTC_USD.db "SELECT COUNT(*) as records, MIN(timestamp) as first_date, MAX(timestamp) as last_date FROM ohlcv"
```

### 3. Resume Collection
Start Superalgos normally - it will detect existing data and continue from where the torrent left off.

## Quality Standards

### Database Requirements
- ✅ SQLite format compatible with Superalgos
- ✅ Standard OHLCV table structure  
- ✅ No gaps in minute-by-minute data
- ✅ Verified against exchange API
- ✅ Compressed/optimized for size

### Metadata Requirements
- 📊 Record count and date range
- 🔍 SHA256 checksum for verification
- 📝 Collection methodology
- 🏷️ Exchange and pair details
- 👤 Contributor information

## Recommended Trackers
```
udp://tracker.openbittorrent.com:80
udp://tracker.opentrackr.org:1337
udp://9.rarbg.to:2710
udp://tracker.coppersurfer.tk:6969
```

## Community Guidelines

### What to Share
- ✅ Historical data (>1 month old)
- ✅ Major trading pairs (BTC, ETH, etc.)
- ✅ Popular exchanges (Binance, Coinbase, etc.)
- ✅ Clean, verified datasets

### What NOT to Share
- ❌ Real-time/current data (use live collection)
- ❌ Corrupted or incomplete data
- ❌ Proprietary exchange data
- ❌ Unverified third-party data

## Verification Process
1. **Automated checks** - CI validates torrent format and metadata
2. **Community review** - Other users verify data quality
3. **Maintainer approval** - Core team approves for inclusion
4. **Seeding commitment** - Contributors seed for minimum 30 days

## Future Enhancements
- 🔄 Automated torrent creation from CI
- 📊 Web dashboard showing available datasets  
- 🔍 Search and discovery tools
- 📈 Usage statistics and popular datasets
- 🤖 Bot integration for automatic downloads

---

**Start the community data sharing revolution!** 🚀

Your contribution helps thousands of traders skip the data collection phase and jump straight into strategy development.