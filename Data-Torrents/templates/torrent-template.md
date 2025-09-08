# {Exchange} {Base}/{Quote} Historical Data

## Dataset Information
- **Exchange:** {Exchange Name}
- **Trading Pair:** {BASE}/{QUOTE}
- **Date Range:** {Start Date} to {End Date}
- **Total Records:** {Record Count}
- **Database Size:** {File Size}
- **Created:** {Creation Date}
- **Contributor:** {GitHub Username}

## Data Quality
- ✅ Minute-by-minute OHLCV data
- ✅ No gaps in coverage
- ✅ Verified against exchange API
- ✅ SQLite format optimized for Superalgos

## Technical Details
```
Database: {exchange}_{base}_{quote}.db
Table: ohlcv
Schema: timestamp, open, high, low, close, volume
Index: PRIMARY KEY (timestamp)
```

## Verification
```bash
# Check record count
sqlite3 {database_name}.db "SELECT COUNT(*) FROM ohlcv"

# Verify date range  
sqlite3 {database_name}.db "SELECT MIN(timestamp), MAX(timestamp) FROM ohlcv"

# Check for gaps
sqlite3 {database_name}.db "SELECT COUNT(*) FROM (SELECT timestamp, LAG(timestamp) OVER (ORDER BY timestamp) as prev FROM ohlcv) WHERE timestamp - prev > 60000"
```

## Checksums
- **SHA256:** `{sha256_hash}`
- **MD5:** `{md5_hash}`

## Collection Method
- **API:** {Exchange API details}
- **Rate Limit:** {Rate limit used}
- **Batch Size:** {Records per request}
- **Collection Period:** {How long it took}

## Installation
1. Download torrent with your preferred client
2. Copy `{database_name}.db` to `./Data/SQLite/`
3. Start Superalgos - it will continue from the last timestamp

## Seeding
This torrent is seeded by:
- {Contributor name/contact}
- {Additional seeders}

Please seed after downloading to help the community!

## Issues
Report any data quality issues or corruption:
- GitHub: {Link to issue}
- Contact: {Contributor contact}

---
*Generated with Superalgos SQLite Data Collection System*