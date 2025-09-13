# Superalgos Copilot Instructions

## Project Overview
Superalgos is a comprehensive crypto trading bot platform with a modular architecture built in Node.js. It consists of multiple interconnected applications including Platform, Network, TaskServer, Social Trading, and Dashboards.

## Architecture & Key Components

### Core Applications
- **Platform** (`platform.js`): Main UI application running on port 34248, serves the visual trading interface
- **Network** (`network.js`): P2P network layer on port 31248 for distributed computing
- **TaskServer** (`TaskServer/`): Handles trading bot execution and data processing
- **Social Trading** (`Social-Trading/`): Community trading features with React/Vue frontends
- **Dashboards** (`Dashboards/`): Analytics and monitoring interface

### Entry Points & Launch Pattern
- `manageApps.js`: Main entry point with PM2 process management
- `platform.js`: Launches Platform app, optionally with dashboards
- `Environment.js`: Central configuration with ports, paths, and feature flags
- Launch scripts follow pattern: `node [app] [options]` (e.g., `node platform minMemo noBrowser`)

### Data & Storage
**Current Migration**: Transitioning from JSON file storage to SQLite databases
- **Legacy (Default)**: JSON files for logs, raw data, and processed data (maintains backwards compatibility)
- **New SQLite Option**: Use `sqlite` launch option to store data in databases instead of JSON files
- **Strategy**: Opt-in SQLite implementation proving benefits while preserving existing workflows
- SQLite databases in `/data/` directory (e.g., `bitstamp_BTC_USD.db`)
- User data stored in `Platform/My-Data-Storage/`
- Logs in `Platform/My-Log-Files/`
- Workspaces in `Platform/My-Workspaces/`

## Development Patterns

### Module Architecture
- Each major component exports `new[ComponentName]()` factory functions
- Global `SA` object provides shared utilities and logging
- WebSocket interfaces for real-time communication between components
- Plugin system with project mappings in `Plugins/project-plugin-map.json`

### Error Handling
- Comprehensive uncaughtException handlers in main apps
- MODULE_NOT_FOUND errors trigger setup command suggestions
- Port conflicts (EADDRINUSE) provide helpful user messages

### Development Workflow
```bash
# Setup & Installation
npm run setup              # Initial setup with git pull
node setup noShortcuts     # Setup without desktop shortcuts

# Development
node platform.js           # Start platform (standard launch)
node platform.js sqlite    # Start platform with SQLite storage option
npm start                  # Start platform (node platform minMemo noBrowser)
npm run startNetwork       # Start network layer
npm run serve              # Webpack dev server for dashboards

# Social Trading
npm run socialTradingAppDev    # Vue UI development
npm run installSocialTradingReact  # Install React dependencies

# Testing & Quality
npm run lintAll            # ESLint all files
npm run unitTest           # Jest testing
npm run unitTest:coverage  # Coverage reports
```

### Port Configuration
- Platform HTTP: 34248, WebSocket: 18041
- Network HTTP: 31248, WebSocket: 18042  
- Dashboards WebSocket: 18043
- Social Trading HTTP: 33248, WebSocket: 16041


## Code Conventions

### Logging
- **Always use the built-in Superalgos logger** (e.g., `SA.logger` or `BOT_MAIN_LOOP_LOGGER_MODULE_OBJECT.write`) for all logs, errors, and debug output. This ensures consistent, timestamped, and color-coded output in the terminal.

### File Organization
- Root level: Main application launchers and configuration
- Component directories: Self-contained apps with their own structure
- Shared utilities in `lib/` and global `SA` namespace

### Naming Patterns
- Apps: `[name].js` in root, `[Name]App.js` in component dirs
- Roots: `[Component]Root.js` for application bootstrapping
- Launch scripts: Descriptive names in `Launch-Scripts/`

### Configuration
- Environment variables override defaults in `Environment.js`
- Feature flags and demo mode controls available
- Base path detection supports both development and packaged modes

## Integration Points
- CCXT library for exchange connectivity
- Discord and Slack APIs for notifications
- Chart.js for visualization components
- PM2 for process management in production

## Focus Areas for Large Codebase

### Core Development Areas
- **Root level**: Main app launchers (`platform.js`, `network.js`, etc.)
- **Platform/**: UI and web server components
- **TaskServer/**: Trading bot execution logic
- **Network/**: P2P networking layer
- **Environment.js**: Central configuration and feature flags

### Storage Implementation (Current Focus)
- Look for storage-related code in data processing components
- SQLite implementation should be conditional on `sqlite` launch option
- JSON file patterns in `Platform/My-Data-Storage/` and `Platform/My-Log-Files/`
- Database schemas and migrations in `/migrations/` directory

### Ignore for Most Development
- `/data/`: Runtime SQLite databases and generated files
- `Platform/My-*`: User-specific data, logs, and workspaces
- `/Reports/`, `/Exports/`: Generated output directories
- Large data processing outputs and temporary files

## When Contributing
- Run `npm run setup` for proper git branch alignment
- Use `npm run lintAll` before committing
- Test with `npm run unitTest` for critical changes
- Check logs in `Platform/My-Log-Files/` for debugging
- Platform runs in browser at `http://localhost:34248` by default
