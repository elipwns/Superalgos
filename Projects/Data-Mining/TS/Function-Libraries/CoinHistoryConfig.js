exports.newDataMiningFunctionLibrariesCoinHistoryConfig = function () {
    
    let thisObject = {
        getStartDate: getStartDate
    }

    // Historical start dates optimized for Bitstamp availability
    const coinStartDates = {
        // Bitcoin gets the full historical treatment
        'BTC': '2009-01-03',  // Bitcoin - go back to genesis
        
        // All other coins get conservative recent dates (last 3 years)
        'ETH': '2022-01-01',  // Ethereum - last 3 years
        'LTC': '2022-01-01',  // Litecoin - last 3 years
        'XRP': '2022-01-01',  // Ripple - last 3 years
        'ETC': '2022-01-01',  // Ethereum Classic - last 3 years
        'BCH': '2022-01-01',  // Bitcoin Cash - last 3 years
        'ADA': '2022-01-01',  // Cardano - last 3 years
        'DOT': '2022-01-01',  // Polkadot - last 3 years
        
        // Popular altcoins - conservative dates
        'DOGE': '2024-12-01',  // Dogecoin - start from recent data (2024+ available)
        'SHIB': '2021-01-01',  // Shiba Inu - recent
        'MATIC': '2020-01-01', // Polygon - recent
        'LINK': '2022-01-01',  // Chainlink - recent start
        'UNI': '2020-09-17',   // Uniswap - actual launch
        'AVAX': '2020-09-22',  // Avalanche - actual launch
        'SOL': '2020-04-10',   // Solana - actual launch
        'ATOM': '2020-01-01',  // Cosmos - recent
        
        // Newer/smaller coins
        'PEPE': '2023-04-15',  // Pepe coin launch
        'WIF': '2023-11-01',   // Dogwifhat launch
        'BONK': '2022-12-25',  // Bonk launch
        'FLOKI': '2021-06-25', // Floki launch
        
        // Stablecoins
        'USDT': '2014-10-06',  // Tether launch
        'USDC': '2018-09-26',  // USD Coin launch
        'DAI': '2017-12-18',   // MakerDAO launch
        
        // Exchange tokens
        'BNB': '2017-07-08',   // Binance Coin launch
        'CRO': '2018-12-14',   // Crypto.com Coin launch
        'FTT': '2019-07-29',   // FTX Token launch (historical)
    }

    // Default fallback dates
    const defaultDates = {
        // Conservative default for unknown coins - last 3 years
        'default': '2022-01-01',
        
        // BTC-only aggressive collection
        'aggressive': '2009-01-01',
        
        // Recent data only
        'recent': '2023-01-01'
    }

    return thisObject

    function getStartDate(symbol, mode = 'default') {
        try {
            // Extract base symbol (remove /USD, /USDT, etc.)
            const baseSymbol = symbol.split('/')[0].toUpperCase()
            
            // Check if we have a specific date for this coin
            if (coinStartDates[baseSymbol]) {
                return new Date(coinStartDates[baseSymbol]).valueOf()
            }
            
            // Use fallback based on mode
            const fallbackDate = defaultDates[mode] || defaultDates['default']
            return new Date(fallbackDate).valueOf()
            
        } catch (err) {
            // Ultimate fallback
            return new Date('2020-01-01').valueOf()
        }
    }
}