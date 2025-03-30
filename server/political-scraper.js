// Load polyfill before any other imports
require('./fetch-polyfill').ensurePolyfilled();

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const axios = require('axios');

// Website URLs
const HOUSE_URL = 'https://housestockwatcher.com';
const SENATE_URL = 'https://senatestockwatcher.com';

// Enhanced headers to avoid being blocked
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0'
};

// Cache to store temporarily scraped data
const scrapeCache = {
  houseTradesLastAttempt: 0,
  houseTradesData: null,
  senateTradesLastAttempt: 0,
  senateTradesData: null,
  housePoliticiansLastAttempt: 0,
  housePoliticiansData: null,
  senatePoliticiansLastAttempt: 0,
  senatePoliticiansData: null,
  CACHE_TIMEOUT: 60 * 60 * 1000 // 1 hour cache
};

/**
 * Scrape House representative stock trades
 * @param {Object} options - Options for scraping
 * @returns {Promise<Array>} - House trades data
 */
async function scrapeHouseTrades(options = {}) {
  // Check cache first
  const now = Date.now();
  if (
    scrapeCache.houseTradesData && 
    now - scrapeCache.houseTradesLastAttempt < scrapeCache.CACHE_TIMEOUT
  ) {
    console.log('Using cached House trades data');
    return scrapeCache.houseTradesData;
  }

  try {
    console.log('Scraping House trades data...');
    scrapeCache.houseTradesLastAttempt = now;
    
    // First check if there's a data download link
    const mainPage = await axios.get(HOUSE_URL, { headers: HEADERS });
    const mainPageHtml = mainPage.data;
    const mainDom = new JSDOM(mainPageHtml);
    const doc = mainDom.window.document;
    
    // Look for download links (CSV, JSON, etc.)
    const downloadLinks = Array.from(doc.querySelectorAll('a'))
      .filter(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent || '';
        return (href.includes('.csv') || href.includes('.json') || 
                href.includes('download') || text.toLowerCase().includes('download data'));
      })
      .map(a => a.getAttribute('href'));
    
    if (downloadLinks.length > 0) {
      console.log(`Found potential download link: ${downloadLinks[0]}`);
      // Try to get data from the first download link
      const downloadUrl = new URL(downloadLinks[0], HOUSE_URL).href;
      const dataResponse = await axios.get(downloadUrl, { headers: HEADERS });
      
      // Check if it's JSON or CSV
      const contentType = dataResponse.headers['content-type'];
      if (contentType && contentType.includes('json')) {
        const data = dataResponse.data;
        scrapeCache.houseTradesData = processTrades(data, 'house');
        return scrapeCache.houseTradesData;
      } else if (contentType && (contentType.includes('csv') || contentType.includes('text/plain'))) {
        const csvText = dataResponse.data;
        const data = parseCSV(csvText);
        scrapeCache.houseTradesData = processTrades(data, 'house');
        return scrapeCache.houseTradesData;
      }
    }
    
    // If no download link, scrape trades from the trades page
    console.log('No download links found, scraping trades page...');
    const tradesPage = await axios.get(`${HOUSE_URL}/trades`, { headers: HEADERS });
    const tradesHtml = tradesPage.data;
    const tradesDom = new JSDOM(tradesHtml);
    const tradesDoc = tradesDom.window.document;
    
    const trades = scrapeTradesFromDocument(tradesDoc, 'house');
    console.log(`Scraped ${trades.length} house trades`);
    
    if (trades.length > 0) {
      scrapeCache.houseTradesData = trades;
      return trades;
    }
    
    // As a last resort, try Capitol Trades API
    console.log('Trying Capitol Trades API as fallback...');
    const capitolTradesData = await scrapeCapitolTrades('house');
    if (capitolTradesData.length > 0) {
      scrapeCache.houseTradesData = capitolTradesData;
      return capitolTradesData;
    }
    
    // If we made it here, we couldn't find any data
    console.error('Failed to find House trades data from any source');
    return [];
  } catch (error) {
    console.error('Error scraping House trades:', error);
    // Try Capitol Trades API as fallback if main site scraping fails
    try {
      console.log('Trying Capitol Trades API due to scraping failure...');
      const capitolTradesData = await scrapeCapitolTrades('house');
      if (capitolTradesData.length > 0) {
        scrapeCache.houseTradesData = capitolTradesData;
        return capitolTradesData;
      }
    } catch (fallbackError) {
      console.error('Capitol Trades API fallback also failed:', fallbackError);
    }
    
    return [];
  }
}

/**
 * Scrape Senate stock trades
 * @param {Object} options - Options for scraping
 * @returns {Promise<Array>} - Senate trades data
 */
async function scrapeSenateTrades(options = {}) {
  // Check cache first
  const now = Date.now();
  if (
    scrapeCache.senateTradesData && 
    now - scrapeCache.senateTradesLastAttempt < scrapeCache.CACHE_TIMEOUT
  ) {
    console.log('Using cached Senate trades data');
    return scrapeCache.senateTradesData;
  }

  try {
    console.log('Scraping Senate trades data...');
    scrapeCache.senateTradesLastAttempt = now;
    
    // First check if there's a data download link
    const mainPage = await axios.get(SENATE_URL, { headers: HEADERS });
    const mainPageHtml = mainPage.data;
    const mainDom = new JSDOM(mainPageHtml);
    const doc = mainDom.window.document;
    
    // Look for download links (CSV, JSON, etc.)
    const downloadLinks = Array.from(doc.querySelectorAll('a'))
      .filter(a => {
        const href = a.getAttribute('href') || '';
        const text = a.textContent || '';
        return (href.includes('.csv') || href.includes('.json') || 
                href.includes('download') || text.toLowerCase().includes('download data'));
      })
      .map(a => a.getAttribute('href'));
    
    if (downloadLinks.length > 0) {
      console.log(`Found potential download link: ${downloadLinks[0]}`);
      // Try to get data from the first download link
      const downloadUrl = new URL(downloadLinks[0], SENATE_URL).href;
      const dataResponse = await axios.get(downloadUrl, { headers: HEADERS });
      
      // Check if it's JSON or CSV
      const contentType = dataResponse.headers['content-type'];
      if (contentType && contentType.includes('json')) {
        const data = dataResponse.data;
        scrapeCache.senateTradesData = processTrades(data, 'senate');
        return scrapeCache.senateTradesData;
      } else if (contentType && (contentType.includes('csv') || contentType.includes('text/plain'))) {
        const csvText = dataResponse.data;
        const data = parseCSV(csvText);
        scrapeCache.senateTradesData = processTrades(data, 'senate');
        return scrapeCache.senateTradesData;
      }
    }
    
    // If no download link, scrape trades from the trades page
    console.log('No download links found, scraping trades page...');
    const tradesPage = await axios.get(`${SENATE_URL}/trades`, { headers: HEADERS });
    const tradesHtml = tradesPage.data;
    const tradesDom = new JSDOM(tradesHtml);
    const tradesDoc = tradesDom.window.document;
    
    const trades = scrapeTradesFromDocument(tradesDoc, 'senate');
    console.log(`Scraped ${trades.length} senate trades`);
    
    if (trades.length > 0) {
      scrapeCache.senateTradesData = trades;
      return trades;
    }
    
    // As a last resort, try Capitol Trades API
    console.log('Trying Capitol Trades API as fallback...');
    const capitolTradesData = await scrapeCapitolTrades('senate');
    if (capitolTradesData.length > 0) {
      scrapeCache.senateTradesData = capitolTradesData;
      return capitolTradesData;
    }
    
    // If we made it here, we couldn't find any data
    console.error('Failed to find Senate trades data from any source');
    return [];
  } catch (error) {
    console.error('Error scraping Senate trades:', error);
    // Try Capitol Trades API as fallback if main site scraping fails
    try {
      console.log('Trying Capitol Trades API due to scraping failure...');
      const capitolTradesData = await scrapeCapitolTrades('senate');
      if (capitolTradesData.length > 0) {
        scrapeCache.senateTradesData = capitolTradesData;
        return capitolTradesData;
      }
    } catch (fallbackError) {
      console.error('Capitol Trades API fallback also failed:', fallbackError);
    }
    
    return [];
  }
}

/**
 * Process raw trades data into a consistent format
 * @param {Array|Object} data - Raw trades data
 * @param {string} type - 'house' or 'senate'
 * @returns {Array} - Processed trades
 */
function processTrades(data, type) {
  if (!data) return [];
  
  // Make sure we're working with an array
  let tradesArray = Array.isArray(data) ? data : [data];
  
  return tradesArray.map((item, index) => {
    // Extract ticker with improved logic
    const rawTickerText = item.ticker || item.symbol || '';
    
    // Try several methods to extract the ticker
    let ticker = extractTickerSymbol(rawTickerText);
    
    // If no ticker found directly, try to extract from asset description
    if (!ticker) {
      const assetDescription = item.asset_description || item.assetDescription || item.asset || '';
      ticker = extractTickerSymbol(assetDescription);
    }
    
    // Create the trade object with enhanced data
    return {
      id: item.id || `scraped-${type}-${Date.now()}-${index}`,
      type: type, // 'house' or 'senate'
      politician: item.politician || item.representative || item.senator || item.name || '',
      transaction_date: formatDate(item.transaction_date || item.transactionDate || item.date || ''),
      ticker: ticker,
      asset_description: item.asset_description || item.assetDescription || item.asset || '',
      transaction_type: item.transaction_type || item.transactionType || item.type || '',
      amount: item.amount || item.value || '',
      comment: item.comment || item.notes || '',
      raw_ticker_text: rawTickerText,
      scraped_at: new Date().toISOString(),
      data_source: 'download'
    };
  }).filter(trade => trade.politician && trade.transaction_date); // Ensure basic data exists
}

/**
 * Format date consistently
 * @param {string} dateStr - Input date string
 * @returns {string} - Formatted date
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  
  try {
    // Try to parse the date
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      // Return MM/DD/YYYY format
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
    
    // If direct parsing fails, try different formats
    const formats = [
      // MM/DD/YYYY
      /(\d{1,2})\/(\d{1,2})\/(\d{4})/,
      // MM-DD-YYYY
      /(\d{1,2})-(\d{1,2})-(\d{4})/,
      // YYYY-MM-DD
      /(\d{4})-(\d{1,2})-(\d{1,2})/
    ];
    
    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        if (format === formats[2]) {
          // YYYY-MM-DD
          return `${match[2]}/${match[3]}/${match[1]}`;
        } else {
          // MM/DD/YYYY or MM-DD-YYYY
          return `${match[1]}/${match[2]}/${match[3]}`;
        }
      }
    }
    
    // If all parsing fails, return the original string
    return dateStr;
  } catch (e) {
    console.log(`Date parsing error for ${dateStr}: ${e.message}`);
    return dateStr;
  }
}

/**
 * Extract ticker symbol from text using various methods
 * @param {string} text - Text containing potential ticker symbol
 * @returns {string} - Extracted ticker or empty string
 */
function extractTickerSymbol(text) {
  if (!text) return '';
  
  // Method 1: Look for text in parentheses that might be a ticker
  const parenthesesMatch = text.match(/\(([A-Z]{1,5})\)/);
  if (parenthesesMatch && parenthesesMatch[1]) {
    return parenthesesMatch[1];
  }
  
  // Method 2: Look for standalone uppercase text that might be a ticker
  const standaloneMatch = text.match(/\b[A-Z]{1,5}\b/);
  if (standaloneMatch && standaloneMatch[0] && !COMMON_WORDS.includes(standaloneMatch[0])) {
    return standaloneMatch[0];
  }
  
  // Method 3: Look for ticker: PREFIX
  const tickerPrefixMatch = text.match(/ticker:\s*([A-Z]{1,5})/i);
  if (tickerPrefixMatch && tickerPrefixMatch[1]) {
    return tickerPrefixMatch[1].toUpperCase();
  }
  
  // Method 4: Check if the entire text is just a ticker
  if (/^[A-Z]{1,5}$/.test(text) && !COMMON_WORDS.includes(text)) {
    return text;
  }
  
  return '';
}

// Common words that might be incorrectly identified as tickers
const COMMON_WORDS = ['A', 'I', 'AM', 'PM', 'AN', 'AS', 'AT', 'BE', 'BY', 'GO', 'IF', 'IN', 'IS', 'IT', 'NO', 'OF', 'ON', 'OR', 'TO', 'UP', 'US'];

// Continuing in part 2...