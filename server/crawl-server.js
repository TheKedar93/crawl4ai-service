const express = require('express');
const cors = require('cors');
const path = require('path');
const puppeteer = require('puppeteer');
const { scrapeHouseTrades, scrapeSenateTrades, getPoliticians } = require('./political-scraper');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Serve static files (logo, favicon, etc.)
app.use(express.static(path.join(__dirname, 'public')));

let browser;

// Browser initialization function
async function initBrowser() {
  if (browser) return browser;
  
  try {
    console.log('Initializing headless browser...');
    const args = [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ];
    
    // Check if running in a Docker container
    if (process.env.PUPPETEER_DOCKER_MODE === 'true') {
      console.log('Running in Docker mode with additional args');
      args.push('--single-process');
    }
    
    browser = await puppeteer.launch({
      headless: 'new',
      args: args
    });
    
    console.log('Browser initialized successfully');
    
    // Handle browser close
    browser.on('disconnected', () => {
      console.log('Browser disconnected, will reinitialize on next request');
      browser = null;
    });
    
    return browser;
  } catch (error) {
    console.error('Failed to initialize browser:', error);
    throw error;
  }
}

// API route to get stock data from Finviz
app.post('/api/crawl-finviz', async (req, res) => {
  const { ticker } = req.body;
  
  if (!ticker) {
    return res.status(400).json({ error: 'Ticker symbol is required' });
  }
  
  console.log(`Received request to crawl Finviz for ticker: ${ticker}`);
  
  try {
    const browser = await initBrowser();
    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Navigate to Finviz
    const url = `https://finviz.com/quote.ashx?t=${ticker}`;
    console.log(`Navigating to: ${url}`);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Extract stock data
    const stockData = await page.evaluate(() => {
      const data = {};
      
      // Extract snapshot table data
      const snapshotTables = document.querySelectorAll('.snapshot-table2');
      if (snapshotTables.length > 0) {
        snapshotTables.forEach(table => {
          const rows = table.querySelectorAll('tr');
          rows.forEach(row => {
            const cells = row.querySelectorAll('td');
            for (let i = 0; i < cells.length; i += 2) {
              if (i + 1 < cells.length) {
                const key = cells[i].textContent.trim();
                const value = cells[i + 1].textContent.trim();
                data[key] = value;
              }
            }
          });
        });
      }
      
      // Get the stock name and price
      const quote = document.querySelector('.quote-header');
      if (quote) {
        data.fullName = quote.textContent.trim();
      }
      
      // Get price data
      const priceElement = document.querySelector('.quote-price');
      if (priceElement) {
        data.currentPrice = priceElement.textContent.trim();
      }
      
      // Get news headlines
      const news = [];
      const newsElements = document.querySelectorAll('.news-link-container');
      newsElements.forEach(el => {
        const link = el.querySelector('a');
        if (link) {
          news.push({
            title: link.textContent.trim(),
            url: link.href
          });
        }
      });
      data.news = news;
      
      return data;
    });
    
    console.log(`Successfully crawled data for ${ticker}`);
    await page.close();
    
    res.json({
      ticker,
      data: stockData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error crawling Finviz for ${ticker}:`, error);
    res.status(500).json({ 
      error: 'Failed to crawl stock data',
      message: error.message,
      ticker
    });
  }
});

// House trades endpoint
app.get('/api/house-trades', async (req, res) => {
  try {
    console.log('Received request for House trades');
    const trades = await scrapeHouseTrades();
    
    res.json({
      success: true,
      data: trades,
      count: trades.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching House trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch House trades',
      message: error.message
    });
  }
});

// Senate trades endpoint
app.get('/api/senate-trades', async (req, res) => {
  try {
    console.log('Received request for Senate trades');
    const trades = await scrapeSenateTrades();
    
    res.json({
      success: true,
      data: trades,
      count: trades.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching Senate trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch Senate trades',
      message: error.message
    });
  }
});

// All congressional trades endpoint
app.get('/api/congressional-trades', async (req, res) => {
  try {
    console.log('Received request for all congressional trades');
    const [houseTrades, senateTrades] = await Promise.all([
      scrapeHouseTrades(),
      scrapeSenateTrades()
    ]);
    
    const allTrades = [...houseTrades, ...senateTrades];
    
    res.json({
      success: true,
      data: allTrades,
      count: allTrades.length,
      house_count: houseTrades.length,
      senate_count: senateTrades.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching congressional trades:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch congressional trades',
      message: error.message
    });
  }
});

// Politicians endpoint
app.get('/api/politicians', async (req, res) => {
  try {
    const { chamber = 'all' } = req.query;
    console.log(`Received request for politicians, chamber: ${chamber}`);
    
    const politicians = await getPoliticians(chamber);
    
    res.json({
      success: true,
      data: politicians,
      count: politicians.length,
      chamber: chamber,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching politicians:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch politicians',
      message: error.message
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'crawl4ai-service'
  });
});

// Root route that returns API info
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, async () => {
  console.log(`Crawl4AI service running on port ${PORT}`);
  
  try {
    // Pre-initialize the browser
    await initBrowser();
    console.log('Browser pre-initialized');
  } catch (error) {
    console.error('Failed to pre-initialize browser:', error);
  }
});

// Handle cleanup on shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  
  if (browser) {
    console.log('Closing browser...');
    await browser.close();
  }
  
  console.log('Clean shutdown complete');
  process.exit(0);
});

module.exports = app; // Export for testing