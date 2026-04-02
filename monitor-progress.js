#!/usr/bin/env node

/**
 * Superalgos Data Mining Progress Monitor
 * Tracks progress of Historic-OHLCVs, Multi-Time-Frame-Daily, and Multi-Time-Frame-Market modules
 */

const fs = require('fs');
const path = require('path');

// Configuration
const LOG_DIR = path.join(__dirname, 'Platform', 'My-Log-Files', 'Tasks');
const REFRESH_INTERVAL = 5000; // 5 seconds
const LINES_TO_READ = 2000; // Read last N lines

class ProgressMonitor {
    constructor() {
        this.lastProgress = {
            historic: { loop: 0, date: '', percentage: 0 },
            daily: { loop: 0, date: '', percentage: 0 },
            market: { loop: 0, date: '', percentage: 0, status: 'initializing' }
        };
        this.startTime = new Date();
    }

    getAllLogLines() {
        try {
            if (!fs.existsSync(LOG_DIR)) {
                return [];
            }
            
            const taskDirs = fs.readdirSync(LOG_DIR);
            let allLines = [];
            
            // Read from all task log files
            for (const taskDir of taskDirs) {
                const logFile = path.join(LOG_DIR, taskDir, 'Task-Server.log');
                if (fs.existsSync(logFile)) {
                    const data = fs.readFileSync(logFile, 'utf8');
                    const lines = data.split('\n');
                    allLines = allLines.concat(lines.slice(-LINES_TO_READ));
                }
            }
            
            // Sort by timestamp (most recent first)
            return allLines
                .filter(line => line.includes('TS | info'))
                .sort((a, b) => {
                    const timeA = a.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
                    const timeB = b.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z)/);
                    if (timeA && timeB) {
                        return new Date(timeB[1]) - new Date(timeA[1]);
                    }
                    return 0;
                })
                .slice(0, LINES_TO_READ);
        } catch (error) {
            console.error('Error reading log files:', error.message);
            return [];
        }
    }

    parseProgress() {
        const lines = this.getAllLogLines();
        
        lines.forEach(line => {
            // Historic-OHLCVs progress
            const historicMatch = line.match(/Historic-OHLCVs.*Internal Loop #\s*(\d+)\s+(\d{4}-\d{2}-\d{2})\s+([\d.]+)\s*%/);
            if (historicMatch) {
                this.lastProgress.historic = {
                    loop: parseInt(historicMatch[1]),
                    date: historicMatch[2],
                    percentage: parseFloat(historicMatch[3])
                };
            }

            // Multi-Time-Frame-Daily progress
            const dailyMatch = line.match(/Multi-Time-Frame-Daily.*Internal Loop #\s*(\d+)\s+(\d{4}-\d{2}-\d{2})\s+([\d.]+)\s*%/);
            if (dailyMatch) {
                this.lastProgress.daily = {
                    loop: parseInt(dailyMatch[1]),
                    date: dailyMatch[2],
                    percentage: parseFloat(dailyMatch[3])
                };
            }

            // Multi-Time-Frame-Market status
            if (line.includes('[Market] All 8 timeframes loaded, starting buildCandles')) {
                this.lastProgress.market.status = 'building';
            }
            
            const marketMatch = line.match(/Multi-Time-Frame-Market.*Internal Loop #\s*(\d+)\s+(\d{4}-\d{2}-\d{2})\s+([\d.]+)\s*%/);
            if (marketMatch) {
                this.lastProgress.market = {
                    loop: parseInt(marketMatch[1]),
                    date: marketMatch[2],
                    percentage: parseFloat(marketMatch[3]),
                    status: 'processing'
                };
            }

            // Market completion
            if (line.includes('[Market] Reached head of market, processing complete')) {
                this.lastProgress.market.status = 'complete';
            }
        });
    }

    displayProgress() {
        console.clear();
        console.log('🚀 Superalgos Data Mining Progress Monitor');
        console.log('=' .repeat(60));
        console.log(`Started: ${this.startTime.toLocaleTimeString()}`);
        console.log(`Updated: ${new Date().toLocaleTimeString()}`);
        console.log('');

        // Historic-OHLCVs
        console.log('📊 Historic-OHLCVs (Exchange Raw Data)');
        console.log(`   Loop: ${this.lastProgress.historic.loop}`);
        console.log(`   Date: ${this.lastProgress.historic.date}`);
        console.log(`   Progress: ${this.lastProgress.historic.percentage}%`);
        console.log('');

        // Multi-Time-Frame-Daily
        console.log('📈 Multi-Time-Frame-Daily (Candles-Volumes)');
        console.log(`   Loop: ${this.lastProgress.daily.loop}`);
        console.log(`   Date: ${this.lastProgress.daily.date}`);
        console.log(`   Progress: ${this.lastProgress.daily.percentage}%`);
        console.log('');

        // Multi-Time-Frame-Market
        console.log('🎯 Multi-Time-Frame-Market (Candles-Volumes)');
        console.log(`   Status: ${this.lastProgress.market.status}`);
        if (this.lastProgress.market.status === 'processing') {
            console.log(`   Loop: ${this.lastProgress.market.loop}`);
            console.log(`   Date: ${this.lastProgress.market.date}`);
            console.log(`   Progress: ${this.lastProgress.market.percentage}%`);
        } else if (this.lastProgress.market.status === 'building') {
            console.log('   ✅ Timeframes loaded, building candles...');
        } else if (this.lastProgress.market.status === 'complete') {
            console.log('   ✅ Processing complete!');
        } else {
            console.log('   ⏳ Initializing...');
        }
        console.log('');
        console.log('Press Ctrl+C to exit');
    }

    start() {
        console.log('Starting Superalgos Progress Monitor...');
        console.log(`Monitoring log directory: ${LOG_DIR}`);
        
        this.parseProgress();
        this.displayProgress();
        
        setInterval(() => {
            this.parseProgress();
            this.displayProgress();
        }, REFRESH_INTERVAL);
    }
}

// Start monitoring
const monitor = new ProgressMonitor();
monitor.start();