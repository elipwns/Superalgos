// Factory to create appropriate status manager based on configuration
const SQLiteStatusManager = require('./SQLiteStatusManager');

class StatusManagerFactory {
    static create(storageConfig, statusDependencies) {
        // Check if SQLite is enabled in storage config
        if (storageConfig && storageConfig.type === 'sqlite') {
            return new SQLiteStatusManagerWrapper(statusDependencies);
        } else {
            // Return the original JSON-based status dependencies
            return new JSONStatusManagerWrapper(statusDependencies);
        }
    }
}

// Wrapper for SQLite status management
class SQLiteStatusManagerWrapper {
    constructor(fallbackStatusDependencies) {
        this.sqliteManager = new SQLiteStatusManager();
        this.fallback = fallbackStatusDependencies;
        this.initialized = false;
    }

    async initialize() {
        if (!this.initialized) {
            try {
                await this.sqliteManager.initialize();
                this.initialized = true;
            } catch (error) {
                console.warn('SQLite status manager failed to initialize, falling back to JSON:', error.message);
                this.initialized = false;
            }
        }
    }

    async getStatus(reportKey) {
        await this.initialize();
        
        if (this.initialized) {
            try {
                return await this.sqliteManager.getStatus(reportKey);
            } catch (error) {
                console.warn('SQLite status read failed, falling back to JSON:', error.message);
            }
        }
        
        // Fallback to original JSON system
        return this.fallback.statusReports.get(reportKey);
    }

    async saveStatus(reportKey, fileData, callback) {
        await this.initialize();
        
        if (this.initialized) {
            try {
                return await this.sqliteManager.saveStatus(reportKey, fileData, callback);
            } catch (error) {
                console.warn('SQLite status save failed, falling back to JSON:', error.message);
            }
        }
        
        // Fallback to original JSON system
        const report = this.fallback.statusReports.get(reportKey);
        if (report && report.save) {
            report.file = fileData;
            return report.save(callback);
        }
        
        if (callback) {
            callback({ result: 'Fail', message: 'No status manager available' });
        }
    }

    close() {
        if (this.sqliteManager) {
            this.sqliteManager.close();
        }
    }
}

// Wrapper for original JSON status management
class JSONStatusManagerWrapper {
    constructor(statusDependencies) {
        this.statusDependencies = statusDependencies;
    }

    async initialize() {
        // JSON system doesn't need initialization
        return Promise.resolve();
    }

    async getStatus(reportKey) {
        return Promise.resolve(this.statusDependencies.statusReports.get(reportKey));
    }

    async saveStatus(reportKey, fileData, callback) {
        const report = this.statusDependencies.statusReports.get(reportKey);
        if (report && report.save) {
            report.file = fileData;
            return Promise.resolve(report.save(callback));
        }
        
        if (callback) {
            callback({ result: 'Fail', message: 'Status report not found' });
        }
        return Promise.resolve();
    }

    close() {
        // JSON system doesn't need cleanup
    }
}

module.exports = StatusManagerFactory;