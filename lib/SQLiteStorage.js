const StorageInterface = require('./StorageInterface')

class SQLiteStorage extends StorageInterface {
    constructor(config) {
        super()
        this.adapter = null
        this.config = config
    }

    async _getAdapter() {
        if (!this.adapter) {
            const SQLiteAdapter = require('../Projects/Data-Mining/TS/Function-Libraries/SQLiteFileAdapter')
            this.adapter = new SQLiteAdapter(this.config.path)
        }
        return this.adapter
    }

    async readFile(filePath) {
        const adapter = await this._getAdapter()
        return await adapter.readFile(filePath)
    }

    async writeFile(filePath, data) {
        const adapter = await this._getAdapter()
        return await adapter.writeFile(filePath, data)
    }

    async exists(filePath) {
        const adapter = await this._getAdapter()
        return await adapter.exists(filePath)
    }

    async deleteFile(filePath) {
        const adapter = await this._getAdapter()
        return await adapter.deleteFile(filePath)
    }

    async listFiles(dirPath) {
        const adapter = await this._getAdapter()
        return await adapter.listFiles(dirPath)
    }
}

module.exports = SQLiteStorage