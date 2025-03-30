// Load polyfill before any other imports
require('./fetch-polyfill').ensurePolyfilled();

const yahooFinance = require('yahoo-finance2');
const fetch = require('node-fetch');
const axios = require('axios');

// Cache for stock data to avoid repeated API calls
const stockCache = {
  data: {},
  timestamp: {},
  CACHE_DURATION_MS: 12 * 60 * 60 * 1000, // 12 hours
};

/**
 * Enrich a stock ticker with real market data
 * @param {string} ticker - Stock ticker symbol
 * @returns {Promise<Object>} - Enriched stock data
 */
async function enrichStockData(ticker) {
  if (!ticker || ticker === '') {
    return { error: 'No ticker provided' };
  }

  // Standardize ticker
  ticker = ticker.toUpperCase().trim();
  
  // Check cache
  if (
    stockCache.data[ticker] && 
    Date.now() - stockCache.timestamp[ticker] < stockCache.CACHE_DURATION_MS
  ) {
    console.log(`Using cached data for ${ticker}`);
    return stockCache.data[ticker];
  }

  try {
    // First try Yahoo Finance
    console.log(`Fetching real stock data for ${ticker} from Yahoo Finance`);
    const result = await yahooFinance.quote(ticker);
    
    const stockData = {
      ticker,
      companyName: result.longName || result.shortName || ticker,
      currentPrice: result.regularMarketPrice,
      previousClose: result.regularMarketPreviousClose,
      open: result.regularMarketOpen,
      dayHigh: result.regularMarketDayHigh,
      dayLow: result.regularMarketDayLow,
      volume: result.regularMarketVolume,
      marketCap: result.marketCap,
      change: result.regularMarketChange,
      changePercent: result.regularMarketChangePercent,
      exchange: result.exchange,
      dataSource: 'yahoo-finance',
      lastUpdated: new Date().toISOString()
    };
    
    // Update cache
    stockCache.data[ticker] = stockData;
    stockCache.timestamp[ticker] = Date.now();
    
    return stockData;
  } catch (yahooError) {
    console.warn(`Yahoo Finance error for ${ticker}: ${yahooError.message}`);
    
    // Try fallback to Alpha Vantage if available
    try {
      // If you have an Alpha Vantage API key, use it here
      const alphaVantageKey = process.env.ALPHA_VANTAGE_KEY || 'demo';
      const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${ticker}&apikey=${alphaVantageKey}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (data['Global Quote'] && data['Global Quote']['05. price']) {
        const quoteData = data['Global Quote'];
        
        const stockData = {
          ticker,
          currentPrice: parseFloat(quoteData['05. price']),
          change: parseFloat(quoteData['09. change']),
          changePercent: parseFloat(quoteData['10. change percent'].replace('%', '')),
          volume: parseInt(quoteData['06. volume']),
          dataSource: 'alpha-vantage',
          lastUpdated: new Date().toISOString()
        };
        
        // Try to get additional company info
        try {
          const companyInfo = await fetchCompanyInfo(ticker);
          if (companyInfo) {
            stockData.companyName = companyInfo.name || ticker;
            stockData.industry = companyInfo.industry;
            stockData.sector = companyInfo.sector;
          }
        } catch (infoError) {
          console.warn(`Could not fetch company info for ${ticker}: ${infoError.message}`);
        }
        
        // Update cache
        stockCache.data[ticker] = stockData;
        stockCache.timestamp[ticker] = Date.now();
        
        return stockData;
      }
      
      throw new Error('No valid data in Alpha Vantage response');
    } catch (alphaError) {
      console.warn(`Alpha Vantage error for ${ticker}: ${alphaError.message}`);
      
      // Try one more fallback to a free API
      try {
        // Try to fetch from a different source like FMP API
        const stockData = await fetchFallbackStockData(ticker);
        
        // Update cache if successful
        if (stockData) {
          stockCache.data[ticker] = stockData;
          stockCache.timestamp[ticker] = Date.now();
          return stockData;
        }
      } catch (fallbackError) {
        console.warn(`Fallback API error for ${ticker}: ${fallbackError.message}`);
      }
      
      // Return basic data if all APIs fail
      return {
        ticker,
        dataSource: 'limited',
        error: 'Limited data available',
        lastUpdated: new Date().toISOString()
      };
    }
  }
}

/**
 * Find the most likely ticker based on a company name
 * @param {string} companyName - Name of the company
 * @returns {Promise<string|null>} - Best matching ticker or null
 */
async function lookupTickerByCompanyName(companyName) {
  if (!companyName || companyName === '') {
    return null;
  }

  try {
    // First clean up the company name and extract key terms
    const cleanName = companyName
      .replace(/[^\w\s]/gi, '') // Remove special characters
      .replace(/\b(inc|corp|corporation|company|co|ltd)\b/gi, '') // Remove common suffixes
      .trim();
    
    if (cleanName === '') {
      return null;
    }
    
    // Try to use Yahoo Finance search
    console.log(`Looking up ticker for company: ${cleanName}`);
    const searchResults = await yahooFinance.search(cleanName);
    
    if (searchResults && searchResults.quotes && searchResults.quotes.length > 0) {
      // Filter to ensure we're getting a stock not ETF, etc.
      const stocks = searchResults.quotes.filter(quote => 
        quote.quoteType === 'EQUITY' && quote.exchange !== ''
      );
      
      if (stocks.length > 0) {
        return stocks[0].symbol;
      }
    }
    
    // If Yahoo search fails, try alternative method
    return null;
  } catch (error) {
    console.warn(`Company name lookup error for ${companyName}: ${error.message}`);
    return null;
  }
}

/**
 * Fetch company information
 * @param {string} ticker - Stock ticker
 * @returns {Promise<Object|null>} - Company information
 */
async function fetchCompanyInfo(ticker) {
  try {
    // Try Yahoo Finance
    const profile = await yahooFinance.quoteSummary(ticker, { modules: ['assetProfile'] });
    
    if (profile && profile.assetProfile) {
      return {
        name: profile.assetProfile.longName || profile.assetProfile.shortName,
        industry: profile.assetProfile.industry,
        sector: profile.assetProfile.sector,
        website: profile.assetProfile.website,
        description: profile.assetProfile.longBusinessSummary
      };
    }
  } catch (error) {
    console.warn(`Error fetching company info: ${error.message}`);
    // Fall through to alternative methods
  }
  
  // Add additional fallback sources for company info if needed
  return null;
}

/**
 * Fallback function to fetch stock data from free/alternative APIs
 * @param {string} ticker - Stock ticker
 * @returns {Promise<Object|null>} - Stock data
 */
async function fetchFallbackStockData(ticker) {
  try {
    // Try FMP API as a fallback (they have some free endpoints)
    const response = await axios.get(`https://financialmodelingprep.com/api/v3/quote/${ticker}?apikey=demo`);
    
    if (response.data && response.data.length > 0) {
      const quote = response.data[0];
      
      return {
        ticker,
        companyName: quote.name,
        currentPrice: quote.price,
        change: quote.change,
        changePercent: quote.changesPercentage,
        marketCap: quote.marketCap,
        volume: quote.volume,
        exchange: quote.exchange,
        dataSource: 'fmp-api',
        lastUpdated: new Date().toISOString()
      };
    }
  } catch (error) {
    console.warn(`FMP API error: ${error.message}`);
  }
  
  // No data available from fallback sources
  return null;
}

/**
 * Process multiple trades in batch to enrich them with stock data
 * @param {Array} trades - Array of trade objects
 * @returns {Promise<Array>} - Enriched trades
 */
async function batchEnrichTrades(trades) {
  if (!Array.isArray(trades) || trades.length === 0) {
    return [];
  }
  
  console.log(`Starting batch enrichment of ${trades.length} trades`);
  
  // First extract all unique tickers and map trades
  const tickerSet = new Set();
  const tickerToTradeMap = new Map();
  
  trades.forEach(trade => {
    if (trade.ticker && trade.ticker !== '') {
      tickerSet.add(trade.ticker);
      
      if (!tickerToTradeMap.has(trade.ticker)) {
        tickerToTradeMap.set(trade.ticker, []);
      }
      
      tickerToTradeMap.get(trade.ticker).push(trade);
    }
  });
  
  console.log(`Found ${tickerSet.size} unique tickers to enrich`);
  
  // Process tickers in batches to avoid rate limits
  const BATCH_SIZE = 5;
  const uniqueTickers = Array.from(tickerSet);
  const enrichedData = {};
  
  for (let i = 0; i < uniqueTickers.length; i += BATCH_SIZE) {
    const batchTickers = uniqueTickers.slice(i, i + BATCH_SIZE);
    
    // Process batch in parallel
    const batchPromises = batchTickers.map(ticker => 
      enrichStockData(ticker)
        .then(data => {
          enrichedData[ticker] = data;
        })
        .catch(error => {
          console.error(`Error enriching ${ticker}: ${error.message}`);
          // Still provide some data even on error
          enrichedData[ticker] = {
            ticker,
            error: 'Failed to fetch data',
            dataSource: 'error'
          };
        })
    );
    
    // Wait for batch to complete
    await Promise.all(batchPromises);
    
    // Add a small delay to avoid overwhelming APIs
    if (i + BATCH_SIZE < uniqueTickers.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  // Now enrich all trades with the fetched data
  const enrichedTrades = trades.map(trade => {
    const enriched = { ...trade };
    
    // Add stock data if available
    if (trade.ticker && enrichedData[trade.ticker]) {
      enriched.stockData = enrichedData[trade.ticker];
    }
    
    // If no ticker but we have a company name, try to find it
    if ((!trade.ticker || trade.ticker === '') && trade.asset_description) {
      enriched.companyNameForLookup = trade.asset_description;
    }
    
    return enriched;
  });
  
  console.log(`Completed batch enrichment for ${trades.length} trades`);
  return enrichedTrades;
}

/**
 * Second pass to try to fill in missing tickers by company name
 * @param {Array} trades - Partially enriched trades
 * @returns {Promise<Array>} - Trades with more tickers filled in
 */
async function fillMissingTickers(trades) {
  const tradesNeedingLookup = trades.filter(
    trade => (!trade.ticker || trade.ticker === '') && trade.companyNameForLookup
  );
  
  if (tradesNeedingLookup.length === 0) {
    return trades;
  }
  
  console.log(`Attempting to find tickers for ${tradesNeedingLookup.length} trades by company name`);
  
  // Process in series to avoid overwhelming APIs
  for (const trade of tradesNeedingLookup) {
    try {
      const ticker = await lookupTickerByCompanyName(trade.companyNameForLookup);
      
      if (ticker) {
        trade.ticker = ticker;
        trade.ticker_source = 'company_name_lookup';
        
        // Now enrich with stock data
        const stockData = await enrichStockData(ticker);
        if (stockData) {
          trade.stockData = stockData;
        }
      }
    } catch (error) {
      console.warn(`Error during ticker lookup for "${trade.companyNameForLookup}": ${error.message}`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  return trades;
}

module.exports = {
  enrichStockData,
  lookupTickerByCompanyName,
  batchEnrichTrades,
  fillMissingTickers
};