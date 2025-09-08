#!/bin/bash
# Superalgos Data Torrent Creation Script

set -e

# Configuration
EXCHANGE=""
BASE=""
QUOTE=""
START_YEAR=""
END_YEAR=""
DATABASE_PATH=""
OUTPUT_DIR="./torrent-export"
TRACKERS=(
    "udp://tracker.openbittorrent.com:80"
    "udp://tracker.opentrackr.org:1337"
    "udp://9.rarbg.to:2710"
    "udp://tracker.coppersurfer.tk:6969"
)

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--exchange)
            EXCHANGE="$2"
            shift 2
            ;;
        -b|--base)
            BASE="$2"
            shift 2
            ;;
        -q|--quote)
            QUOTE="$2"
            shift 2
            ;;
        -s|--start-year)
            START_YEAR="$2"
            shift 2
            ;;
        -n|--end-year)
            END_YEAR="$2"
            shift 2
            ;;
        -d|--database)
            DATABASE_PATH="$2"
            shift 2
            ;;
        -h|--help)
            echo "Usage: $0 -e EXCHANGE -b BASE -q QUOTE -s START_YEAR -n END_YEAR -d DATABASE_PATH"
            echo "Example: $0 -e bitstamp -b BTC -q USD -s 2015 -n 2025 -d ./Data/SQLite/bitstamp_BTC_USD.db"
            exit 0
            ;;
        *)
            echo "Unknown option $1"
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$EXCHANGE" || -z "$BASE" || -z "$QUOTE" || -z "$START_YEAR" || -z "$END_YEAR" || -z "$DATABASE_PATH" ]]; then
    echo "Error: All parameters are required"
    echo "Use -h for help"
    exit 1
fi

# Check if database exists
if [[ ! -f "$DATABASE_PATH" ]]; then
    echo "Error: Database file not found: $DATABASE_PATH"
    exit 1
fi

# Create names
TORRENT_NAME="${EXCHANGE}-${BASE}-${QUOTE}-${START_YEAR}-${END_YEAR}"
EXPORT_PATH="${OUTPUT_DIR}/${TORRENT_NAME}"
DATABASE_NAME="${EXCHANGE}_${BASE}_${QUOTE}.db"

echo "Creating torrent for $TORRENT_NAME..."

# Create export directory
mkdir -p "$EXPORT_PATH"

# Copy database
echo "Copying database..."
cp "$DATABASE_PATH" "$EXPORT_PATH/$DATABASE_NAME"

# Get database stats
RECORD_COUNT=$(sqlite3 "$DATABASE_PATH" "SELECT COUNT(*) FROM ohlcv")
FILE_SIZE=$(du -h "$DATABASE_PATH" | cut -f1)
MIN_DATE=$(sqlite3 "$DATABASE_PATH" "SELECT datetime(MIN(timestamp)/1000, 'unixepoch') FROM ohlcv")
MAX_DATE=$(sqlite3 "$DATABASE_PATH" "SELECT datetime(MAX(timestamp)/1000, 'unixepoch') FROM ohlcv")

# Create info file
echo "Creating metadata..."
cat > "$EXPORT_PATH/INFO.txt" << EOF
Superalgos SQLite Database
Exchange: $EXCHANGE
Pair: $BASE/$QUOTE
Records: $RECORD_COUNT
Size: $FILE_SIZE
Date Range: $MIN_DATE to $MAX_DATE
Created: $(date)
Database: $DATABASE_NAME
EOF

# Calculate checksums
echo "Calculating checksums..."
SHA256=$(sha256sum "$EXPORT_PATH/$DATABASE_NAME" | cut -d' ' -f1)
MD5=$(md5sum "$EXPORT_PATH/$DATABASE_NAME" | cut -d' ' -f1)

echo "SHA256: $SHA256" >> "$EXPORT_PATH/INFO.txt"
echo "MD5: $MD5" >> "$EXPORT_PATH/INFO.txt"

# Create torrent file
echo "Creating torrent file..."
TRACKER_ARGS=""
for tracker in "${TRACKERS[@]}"; do
    TRACKER_ARGS="$TRACKER_ARGS -t $tracker"
done

if command -v transmission-create &> /dev/null; then
    transmission-create -o "${TORRENT_NAME}.torrent" $TRACKER_ARGS "$EXPORT_PATH"
    echo "✅ Torrent created: ${TORRENT_NAME}.torrent"
elif command -v mktorrent &> /dev/null; then
    mktorrent -a "${TRACKERS[0]}" -o "${TORRENT_NAME}.torrent" "$EXPORT_PATH"
    echo "✅ Torrent created: ${TORRENT_NAME}.torrent"
else
    echo "❌ No torrent creation tool found (transmission-create or mktorrent)"
    echo "Please install transmission-cli or mktorrent"
    exit 1
fi

# Create metadata file from template
echo "Creating metadata file..."
METADATA_FILE="${TORRENT_NAME}.md"
cp "$(dirname "$0")/torrent-template.md" "$METADATA_FILE"

# Replace template variables
sed -i "s/{Exchange Name}/$EXCHANGE/g" "$METADATA_FILE"
sed -i "s/{BASE}/$BASE/g" "$METADATA_FILE"
sed -i "s/{QUOTE}/$QUOTE/g" "$METADATA_FILE"
sed -i "s/{Start Date}/$MIN_DATE/g" "$METADATA_FILE"
sed -i "s/{End Date}/$MAX_DATE/g" "$METADATA_FILE"
sed -i "s/{Record Count}/$RECORD_COUNT/g" "$METADATA_FILE"
sed -i "s/{File Size}/$FILE_SIZE/g" "$METADATA_FILE"
sed -i "s/{Creation Date}/$(date)/g" "$METADATA_FILE"
sed -i "s/{database_name}/$DATABASE_NAME/g" "$METADATA_FILE"
sed -i "s/{sha256_hash}/$SHA256/g" "$METADATA_FILE"
sed -i "s/{md5_hash}/$MD5/g" "$METADATA_FILE"

echo "✅ Metadata created: $METADATA_FILE"

echo ""
echo "🎉 Torrent creation complete!"
echo "Files created:"
echo "  - ${TORRENT_NAME}.torrent"
echo "  - ${METADATA_FILE}"
echo "  - ${EXPORT_PATH}/ (data directory)"
echo ""
echo "Next steps:"
echo "1. Test the torrent in your client"
echo "2. Create directory: Data-Torrents/exchanges/$EXCHANGE/$BASE-$QUOTE/"
echo "3. Move files to the directory"
echo "4. Create pull request"
echo "5. Start seeding!"