# Bitstamp BTC/USD Historical Data

## Dataset Information
- **Exchange:** Bitstamp
- **Trading Pair:** BTC/USD
- **Date Range:** 2015-01-01 to 2018-08-21
- **Total Records:** 1,913,137
- **Database Size:** ~190MB
- **Created:** 2025-09-08
- **Contributor:** elipwns

## Data Quality
- ✅ Minute-by-minute OHLCV data
- ✅ No gaps in coverage
- ✅ Verified against exchange API
- ✅ SQLite format optimized for Superalgos

## Technical Details
```
Database: bitstamp_BTC_USD.db
Table: ohlcv
Schema: timestamp, open, high, low, close, volume
Index: PRIMARY KEY (timestamp)
```

## Verification
```bash
# Check record count
sqlite3 bitstamp_BTC_USD.db "SELECT COUNT(*) FROM ohlcv"

# Verify date range  
sqlite3 bitstamp_BTC_USD.db "SELECT MIN(timestamp), MAX(timestamp) FROM ohlcv"

# Check for gaps
sqlite3 bitstamp_BTC_USD.db "SELECT COUNT(*) FROM (SELECT timestamp, LAG(timestamp) OVER (ORDER BY timestamp) as prev FROM ohlcv) WHERE timestamp - prev > 60000"
```

## Collection Method
- **API:** Bitstamp REST API v2
- **Rate Limit:** 100ms between requests
- **Batch Size:** 1000 records per request
- **Collection Period:** Historical backfill from 2015

## Installation
1. Download torrent with your preferred client
2. Copy `bitstamp_BTC_USD.db` to `./Data/SQLite/`
3. Start Superalgos - it will continue from the last timestamp (2018-08-21)

## Seeding
This torrent is seeded by:
- elipwns (original contributor)

Please seed after downloading to help the community!

## Issues
Report any data quality issues or corruption:
- GitHub: Create issue in Superalgos repository
- Contact: @elipwns

---
*Generated with Superalgos SQLite Data Collection System*