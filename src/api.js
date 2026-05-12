import Papa from 'papaparse';
import { GOOGLE_SHEETS_CSV_URL } from './constants';

export const fetchPortfolioData = (onComplete) => {
    Papa.parse(GOOGLE_SHEETS_CSV_URL, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
            const data = results.data;
            const newPrices = {};
            const historyMap = {};

            data.forEach(row => {
                if (!row.Currency || !row.Ticker || !row.ISIN) return;
                
                // Map Live Prices for Rebalancer[cite: 1, 2]
                if (!newPrices[row.Currency]) newPrices[row.Currency] = {};
                newPrices[row.Currency][row.Ticker] = {
                    price: row.Price,
                    isin: row.ISIN,
                    name: row.Name,
                    date: row.Date,
                    high_52: row['52W High'],
                    low_52: row['52W Low'],
                    pct_off_high: parseFloat(row['% Off High'])
                };

                // Map Historical Strings for Analytics[cite: 1, 2]
                historyMap[row.ISIN] = {
                    Daily_1Y: row['Daily_1Y'],
                    Monthly_5Y: row['Monthly_5Y'],
                    Weekly_3Y: row['Weekly_3Y']
                };
            });

            onComplete({ newPrices, historyMap });
        }
    });
};