# Superalgos Data Distribution

## Overview
Historical market data is distributed via GitHub Releases instead of torrents for better reliability and integration with the development workflow.

## For Users - Downloading Data

### Quick Start
```bash
# List available databases
node scripts/download-data.js list

# Download specific database
node scripts/download-data.js bitstamp BTC_USD
node scripts/download-data.js binance BTC_USDT
```

### Available Databases
Check the [latest release](https://github.com/Superalgos/Superalgos/releases/latest) for current databases including:
- Bitstamp: BTC/USD, ETH/USD, DOGE/USD
- Binance: BTC/USDT, ETH/USDT
- Coinbase: BTC/USD, ETH/USD

### Manual Download
1. Go to [Releases](https://github.com/Superalgos/Superalgos/releases)
2. Download `.db.gz` files from latest release
3. Extract to `Data/SQLite/` directory
4. Rename to match Superalgos format: `exchange_PAIR.db`

## For Contributors - Publishing Data

### Prerequisites
```bash
# Install dependencies
npm install @octokit/rest

# Set GitHub token (with repo permissions)
export GITHUB_TOKEN=your_personal_access_token
```

### Publishing Process
```bash
# Publish single database
node scripts/publish-data.js Data/SQLite/bitstamp_BTC_USD.db

# Publish multiple databases
node scripts/publish-data.js Data/SQLite/*.db
```

### Data Quality Requirements
- SQLite format with standard OHLCV schema
- No gaps in minute-by-minute data
- Verified against exchange APIs
- Compressed for efficient distribution

## Database Format

### Schema
```sql
CREATE TABLE ohlcv (
    timestamp INTEGER PRIMARY KEY,
    open REAL,
    high REAL, 
    low REAL,
    close REAL,
    volume REAL
);
```

### Naming Convention
- **File format:** `exchange_PAIR.db`
- **Examples:** `bitstamp_BTC_USD.db`, `binance_BTC_USDT.db`
- **Compressed:** `exchange-pair.db.gz` (for releases)

## Advantages Over Torrents

### For Users
- ✅ No torrent client required
- ✅ Direct HTTPS downloads
- ✅ GitHub's global CDN
- ✅ Integrated with git workflow
- ✅ Version history and checksums

### For Contributors  
- ✅ No seeding requirements
- ✅ Automated via GitHub Actions
- ✅ Built-in access controls
- ✅ Release management tools
- ✅ Community visibility

### For Project
- ✅ Centralized distribution
- ✅ Bandwidth included with GitHub
- ✅ No infrastructure maintenance
- ✅ Scales with project growth
- ✅ Professional appearance

## Migration from Torrents

### Removed Components
- `Data-Torrents/` directory
- `torrent-export/` directory  
- Torrent creation scripts
- BitTorrent dependencies

### New Components
- `scripts/download-data.js` - Download from releases
- `scripts/publish-data.js` - Publish to releases
- GitHub Actions automation (future)
- Release management workflow

## Future Enhancements

### Planned Features
- 🔄 Automated daily releases via GitHub Actions
- 📊 Database statistics and metadata
- 🔍 Search and filtering tools
- 📈 Download analytics
- 🤖 Bot integration for auto-updates

### Community Features
- 📝 Database contribution guidelines
- ✅ Automated quality checks
- 🏷️ Tagging and categorization
- 📊 Usage statistics
- 🔔 Update notifications

---

**Ready to distribute data the modern way!** 🚀

This approach provides better reliability, easier maintenance, and seamless integration with the existing GitHub-based development workflow.