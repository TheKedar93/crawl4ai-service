const express = require('express');
const fetch = require('node-fetch');
const cheerio = require('cheerio');
const { JSDOM } = require('jsdom');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Import the political data scraper
const politicalScraper = require('./political-scraper');

// Middleware
app.use(cors());
app.use(express.json());

// In-memory cache to avoid hitting the websites too frequently
const cache = {
  finvizData: null,
  finvizTimestamp: 0,
  politicalTrades: null,
  politicalTradesTimestamp: 0,
  politicians: null,
  politiciansTimestamp: 0
};

// Cache timeout (15 minutes)
const CACHE_TIMEOUT = 15 * 60 * 1000;

// Routes
app.get('/', (req, res) => {
  res.send('Crawl4AI Service is running');
});

// Fetch stock data from Finviz
app.get('/api/stock/:ticker', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    const data = await fetchFinvizData(ticker);
    res.json(data);
  } catch (error) {
    console.error('Error fetching stock data:', error);
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Get political trades from House and Senate
app.get('/api/political/trades', async (req, res) => {
  try {
    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (cache.politicalTrades && now - cache.politicalTradesTimestamp < CACHE_TIMEOUT) {
      return res.json(cache.politicalTrades);
    }
    
    // Fetch new data
    const trades = await politicalScraper.scrapeAllPoliticalTrades();
    
    // Update cache
    cache.politicalTrades = trades;
    cache.politicalTradesTimestamp = now;
    
    res.json(trades);
  } catch (error) {
    console.error('Error fetching political trades:', error);
    res.status(500).json({ 
      error: 'Failed to fetch political trades',
      message: error.message
    });
  }
});

// Get House trades
app.get('/api/political/house', async (req, res) => {
  try {
    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (cache.politicalTrades && now - cache.politicalTradesTimestamp < CACHE_TIMEOUT) {
      return res.json(cache.politicalTrades.houseTrades);
    }
    
    // Fetch new data
    const houseTrades = await politicalScraper.scrapeHouseTrades();
    
    res.json(houseTrades);
  } catch (error) {
    console.error('Error fetching House trades:', error);
    res.status(500).json({ 
      error: 'Failed to fetch House trades',
      message: error.message
    });
  }
});

// Get Senate trades
app.get('/api/political/senate', async (req, res) => {
  try {
    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (cache.politicalTrades && now - cache.politicalTradesTimestamp < CACHE_TIMEOUT) {
      return res.json(cache.politicalTrades.senateTrades);
    }
    
    // Fetch new data
    const senateTrades = await politicalScraper.scrapeSenateTrades();
    
    res.json(senateTrades);
  } catch (error) {
    console.error('Error fetching Senate trades:', error);
    res.status(500).json({ 
      error: 'Failed to fetch Senate trades',
      message: error.message
    });
  }
});

// Get all politicians (House representatives and Senators)
app.get('/api/political/politicians', async (req, res) => {
  try {
    // Check if we have cached data that's still fresh
    const now = Date.now();
    if (cache.politicians && now - cache.politiciansTimestamp < CACHE_TIMEOUT) {
      return res.json(cache.politicians);
    }
    
    // Fetch new data
    const politicians = await politicalScraper.scrapeAllPoliticians();
    
    // Update cache
    cache.politicians = politicians;
    cache.politiciansTimestamp = now;
    
    res.json(politicians);
  } catch (error) {
    console.error('Error fetching politicians:', error);
    res.status(500).json({ 
      error: 'Failed to fetch politicians',
      message: error.message
    });
  }
});

// Get trades by specific politician
app.get('/api/political/politician/:name/trades', async (req, res) => {
  try {
    const politicianName = req.params.name;
    
    // Check if we have cached data that's still fresh
    const now = Date.now();
    let allTrades = [];
    
    if (cache.politicalTrades && now - cache.politicalTradesTimestamp < CACHE_TIMEOUT) {
      allTrades = cache.politicalTrades.combinedTrades;
    } else {
      // Fetch new data
      const trades = await politicalScraper.scrapeAllPoliticalTrades();
      allTrades = trades.combinedTrades;
      
      // Update cache
      cache.politicalTrades = trades;
      cache.politicalTradesTimestamp = now;
    }
    
    // Filter trades by politician name
    const politicianTrades = allTrades.filter(trade => {
      return trade.politician.toLowerCase().includes(politicianName.toLowerCase());
    });
    
    res.json(politicianTrades);
  } catch (error) {
    console.error(`Error fetching trades for politician ${req.params.name}:`, error);
    res.status(500).json({ 
      error: `Failed to fetch trades for politician ${req.params.name}`,
      message: error.message
    });
  }
});

// Get trades by ticker
app.get('/api/political/ticker/:ticker/trades', async (req, res) => {
  try {
    const ticker = req.params.ticker.toUpperCase();
    
    // Check if we have cached data that's still fresh
    const now = Date.now();
    let allTrades = [];
    
    if (cache.politicalTrades && now - cache.politicalTradesTimestamp < CACHE_TIMEOUT) {
      allTrades = cache.politicalTrades.combinedTrades;
    } else {
      // Fetch new data
      const trades = await politicalScraper.scrapeAllPoliticalTrades();
      allTrades = trades.combinedTrades;
      
      // Update cache
      cache.politicalTrades = trades;
      cache.politicalTradesTimestamp = now;
    }
    
    // Filter trades by ticker
    const tickerTrades = allTrades.filter(trade => {
      return trade.ticker === ticker;
    });
    
    res.json(tickerTrades);
  } catch (error) {
    console.error(`Error fetching trades for ticker ${req.params.ticker}:`, error);
    res.status(500).json({ 
      error: `Failed to fetch trades for ticker ${req.params.ticker}`,
      message: error.message
    });
  }
});

// Fetch data from Finviz
async function fetchFinvizData(ticker) {
  try {
    // Check cache first
    const now = Date.now();
    if (cache.finvizData && cache.finvizData[ticker] && now - cache.finvizTimestamp < CACHE_TIMEOUT) {
      return cache.finvizData[ticker];
    }

    const url = `https://finviz.com/quote.ashx?t=${ticker}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Extract basic info
    const basicInfo = {};

    // Get tables with class "snapshot-table2"
    const tables = document.querySelectorAll('.snapshot-table2');
    
    for (const table of tables) {
      const rows = table.querySelectorAll('tr');
      
      for (const row of rows) {
        const cells = row.querySelectorAll('td');
        
        for (let i = 0; i < cells.length; i += 2) {
          if (i + 1 < cells.length) {
            const key = cells[i].textContent.trim();
            const value = cells[i + 1].textContent.trim();
            basicInfo[key] = value;
          }
        }
      }
    }

    // Extract news
    const news = [];
    const newsTable = document.querySelector('.news-table');
    
    if (newsTable) {
      const newsItems = newsTable.querySelectorAll('tr');
      
      for (const item of newsItems) {
        const dateTd = item.querySelector('td:first-child');
        const linkTd = item.querySelector('td:last-child');
        
        if (dateTd && linkTd) {
          const dateTime = dateTd.textContent.trim();
          const linkElement = linkTd.querySelector('a');
          
          if (linkElement) {
            const title = linkElement.textContent.trim();
            const url = linkElement.getAttribute('href');
            
            news.push({
              dateTime,
              title,
              url
            });
          }
        }
      }
    }

    // Extract insider trading if available
    const insiderTrading = [];
    const insiderTable = document.querySelector('#insider-table');
    
    if (insiderTable) {
      const insiderRows = insiderTable.querySelectorAll('tbody tr');
      
      for (const row of insiderRows) {
        const cells = row.querySelectorAll('td');
        
        if (cells.length >= 6) {
          insiderTrading.push({
            owner: cells[0].textContent.trim(),
            relationship: cells[1].textContent.trim(),
            date: cells[2].textContent.trim(),
            transaction: cells[3].textContent.trim(),
            cost: cells[4].textContent.trim(),
            shares: cells[5].textContent.trim(),
            value: cells[6]?.textContent.trim() || '',
            sharesTotal: cells[7]?.textContent.trim() || '',
            secForm: cells[8]?.textContent.trim() || ''
          });
        }
      }
    }

    // Compile result
    const result = {
      ticker,
      basicInfo,
      news,
      insiderTrading,
      scrapedAt: new Date().toISOString()
    };

    // Update cache
    if (!cache.finvizData) {
      cache.finvizData = {};
    }
    cache.finvizData[ticker] = result;
    cache.finvizTimestamp = now;

    return result;
  } catch (error) {
    console.error(`Error scraping Finviz for ${ticker}:`, error);
    throw error;
  }
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;