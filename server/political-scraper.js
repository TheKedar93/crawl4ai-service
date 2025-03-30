// Load polyfill before any other imports
require('./fetch-polyfill').ensurePolyfilled();

const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const { extractTickerWithCompanyMatch } = require('./ticker-mapper');

// Website URLs
const HOUSE_URL = 'https://housestockwatcher.com';
const SENATE_URL = 'https://senatestockwatcher.com';
const CAPITOL_TRADES_URL = 'https://www.capitoltrades.com';

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
    
    // Try Capitol Trades first as it has more reliable data
    try {
      console.log('Trying Capitol Trades for House data...');
      const capitolTradesData = await scrapeCapitolTrades('house');
      if (capitolTradesData && capitolTradesData.length > 0) {
        console.log(`Found ${capitolTradesData.length} House trades from Capitol Trades`);
        scrapeCache.houseTradesData = capitolTradesData;
        return capitolTradesData;
      }
    } catch (capitolError) {
      console.error('Error fetching from Capitol Trades:', capitolError);
    }
    
    // Fallback to HouseStockWatcher
    console.log('Falling back to HouseStockWatcher...');
    const tradesPage = await axios.get(`${HOUSE_URL}/trades`, { 
      headers: HEADERS,
      timeout: 10000
    });
    
    const tradesHtml = tradesPage.data;
    const tradesDom = new JSDOM(tradesHtml);
    const tradesDoc = tradesDom.window.document;
    
    const trades = scrapeTradesFromDocument(tradesDoc, 'house');
    
    if (trades && trades.length > 0) {
      console.log(`Scraped ${trades.length} House trades from HouseStockWatcher`);
      scrapeCache.houseTradesData = trades;
      return trades;
    }
    
    console.error('Failed to get House trades data from any source');
    return [];
  } catch (error) {
    console.error('Error scraping House trades:', error);
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
    
    // Try Capitol Trades first as it has more reliable data
    try {
      console.log('Trying Capitol Trades for Senate data...');
      const capitolTradesData = await scrapeCapitolTrades('senate');
      if (capitolTradesData && capitolTradesData.length > 0) {
        console.log(`Found ${capitolTradesData.length} Senate trades from Capitol Trades`);
        scrapeCache.senateTradesData = capitolTradesData;
        return capitolTradesData;
      }
    } catch (capitolError) {
      console.error('Error fetching from Capitol Trades:', capitolError);
    }
    
    // Fallback to SenateStockWatcher
    console.log('Falling back to SenateStockWatcher...');
    const tradesPage = await axios.get(`${SENATE_URL}/trades`, { 
      headers: HEADERS,
      timeout: 10000
    });
    
    const tradesHtml = tradesPage.data;
    const tradesDom = new JSDOM(tradesHtml);
    const tradesDoc = tradesDom.window.document;
    
    const trades = scrapeTradesFromDocument(tradesDoc, 'senate');
    
    if (trades && trades.length > 0) {
      console.log(`Scraped ${trades.length} Senate trades from SenateStockWatcher`);
      scrapeCache.senateTradesData = trades;
      return trades;
    }
    
    console.error('Failed to get Senate trades data from any source');
    return [];
  } catch (error) {
    console.error('Error scraping Senate trades:', error);
    return [];
  }
}

/**
 * Extract trades from HTML document
 * @param {Document} doc - JSDOM document
 * @param {string} type - 'house' or 'senate'
 * @returns {Array} - Extracted trades
 */
function scrapeTradesFromDocument(doc, type) {
  try {
    // First look for a table with trade data
    const tables = doc.querySelectorAll('table');
    if (tables.length > 0) {
      // Find the largest table which is likely to be the trades table
      let largestTable = null;
      let maxRows = 0;
      
      tables.forEach(table => {
        const rows = table.querySelectorAll('tr');
        if (rows.length > maxRows) {
          maxRows = rows.length;
          largestTable = table;
        }
      });
      
      if (largestTable && maxRows > 1) {
        return extractTradesFromTable(largestTable, type);
      }
    }
    
    // If no table found, look for divs that might be trade cards
    const tradeCards = Array.from(doc.querySelectorAll('.trade-card, .card, [class*="trade"], [class*="card"]'));
    if (tradeCards.length > 0) {
      return extractTradesFromCards(tradeCards, type);
    }
    
    // If no structured content found, try a more generic approach
    return extractTradesGeneric(doc, type);
  } catch (error) {
    console.error('Error extracting trades from document:', error);
    return [];
  }
}

/**
 * Extract trades from a table element
 * @param {Element} table - HTML table element
 * @param {string} type - 'house' or 'senate'
 * @returns {Array} - Extracted trades
 */
function extractTradesFromTable(table, type) {
  const trades = [];
  const rows = table.querySelectorAll('tr');
  
  // Skip the header row
  if (rows.length <= 1) return [];
  
  // First try to identify column indices by header
  const headerRow = rows[0];
  const headerCells = headerRow.querySelectorAll('th, td');
  const columnMap = {};
  
  Array.from(headerCells).forEach((cell, index) => {
    const text = cell.textContent.trim().toLowerCase();
    
    if (text.includes('politician') || text.includes('representative') || text.includes('senator') || text.includes('name')) {
      columnMap.politician = index;
    } else if (text.includes('date') || text.includes('transaction date')) {
      columnMap.date = index;
    } else if (text.includes('ticker') || text.includes('symbol')) {
      columnMap.ticker = index;
    } else if (text.includes('asset') || text.includes('description')) {
      columnMap.asset = index;
    } else if (text.includes('type') || text.includes('transaction type')) {
      columnMap.type = index;
    } else if (text.includes('amount') || text.includes('value')) {
      columnMap.amount = index;
    } else if (text.includes('comment') || text.includes('notes')) {
      columnMap.comment = index;
    }
  });
  
  // Process data rows
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const cells = row.querySelectorAll('td');
    
    if (cells.length < 3) continue; // Skip rows with too few cells
    
    const politician = columnMap.politician !== undefined ? cells[columnMap.politician]?.textContent.trim() : '';
    const transactionDate = columnMap.date !== undefined ? formatDate(cells[columnMap.date]?.textContent.trim()) : '';
    const rawTickerText = columnMap.ticker !== undefined ? cells[columnMap.ticker]?.textContent.trim() : '';
    const assetDescription = columnMap.asset !== undefined ? cells[columnMap.asset]?.textContent.trim() : '';
    const transactionType = columnMap.type !== undefined ? cells[columnMap.type]?.textContent.trim() : '';
    const amount = columnMap.amount !== undefined ? cells[columnMap.amount]?.textContent.trim() : '';
    const comment = columnMap.comment !== undefined ? cells[columnMap.comment]?.textContent.trim() : '';
    
    // Extract ticker with the enhanced method that uses company name matching
    const ticker = extractTickerWithCompanyMatch(rawTickerText, assetDescription);
    
    const trade = {
      id: `scraped-${type}-${Date.now()}-${i}`,
      type: type,
      politician: politician,
      transaction_date: transactionDate,
      ticker: ticker,
      raw_ticker_text: rawTickerText,
      asset_description: assetDescription,
      transaction_type: transactionType,
      amount: amount,
      comment: comment,
      scraped_at: new Date().toISOString(),
      data_source: `${type === 'house' ? 'housestockwatcher' : 'senatestockwatcher'}`
    };
    
    // Only add trades with basic information
    if (trade.politician && trade.transaction_date) {
      trades.push(trade);
    }
  }
  
  return trades;
}

/**
 * Extract trades from card-style elements
 * @param {Array} cards - HTML elements representing trade cards
 * @param {string} type - 'house' or 'senate'
 * @returns {Array} - Extracted trades
 */
function extractTradesFromCards(cards, type) {
  const trades = [];
  
  cards.forEach((card, index) => {
    // Find various elements in the card
    const politicianEl = card.querySelector('[class*="politician"], [class*="name"], [class*="senator"], [class*="representative"]');
    const dateEl = card.querySelector('[class*="date"], [class*="transaction-date"]');
    const tickerEl = card.querySelector('[class*="ticker"], [class*="symbol"]');
    const assetEl = card.querySelector('[class*="asset"], [class*="description"]');
    const typeEl = card.querySelector('[class*="type"], [class*="transaction-type"]');
    const amountEl = card.querySelector('[class*="amount"], [class*="value"]');
    const commentEl = card.querySelector('[class*="comment"], [class*="notes"]');
    
    // Extract text content from elements
    const politician = politicianEl ? politicianEl.textContent.trim() : '';
    const transactionDate = dateEl ? formatDate(dateEl.textContent.trim()) : '';
    const rawTickerText = tickerEl ? tickerEl.textContent.trim() : '';
    const assetDescription = assetEl ? assetEl.textContent.trim() : '';
    const transactionType = typeEl ? typeEl.textContent.trim() : '';
    const amount = amountEl ? amountEl.textContent.trim() : '';
    const comment = commentEl ? commentEl.textContent.trim() : '';
    
    // If we don't have structured elements, try to extract from full text
    let fullTextPolitician = politician;
    let fullTextDate = transactionDate;
    let fullTextAsset = assetDescription;
    
    if (!politician || !transactionDate) {
      const fullText = card.textContent.trim();
      
      // Try to extract politician name
      if (!fullTextPolitician) {
        const nameMatch = fullText.match(/(?:Senator|Representative|Politician|Name):?\s*([^,\n]+)/i);
        if (nameMatch && nameMatch[1]) {
          fullTextPolitician = nameMatch[1].trim();
        }
      }
      
      // Try to extract date
      if (!fullTextDate) {
        const dateMatch = fullText.match(/(?:Date|Transaction Date):?\s*([^,\n]+)/i);
        if (dateMatch && dateMatch[1]) {
          fullTextDate = formatDate(dateMatch[1].trim());
        }
      }
      
      // Try to extract asset description
      if (!fullTextAsset) {
        const assetMatch = fullText.match(/(?:Asset|Description):?\s*([^,\n]+)/i);
        if (assetMatch && assetMatch[1]) {
          fullTextAsset = assetMatch[1].trim();
        }
      }
    }
    
    // Extract ticker with the enhanced method that uses company name matching
    const ticker = extractTickerWithCompanyMatch(rawTickerText, assetDescription || fullTextAsset);
    
    const trade = {
      id: `scraped-${type}-${Date.now()}-${index}`,
      type: type,
      politician: fullTextPolitician,
      transaction_date: fullTextDate,
      ticker: ticker,
      raw_ticker_text: rawTickerText,
      asset_description: assetDescription || fullTextAsset,
      transaction_type: transactionType,
      amount: amount,
      comment: comment,
      scraped_at: new Date().toISOString(),
      data_source: `${type === 'house' ? 'housestockwatcher' : 'senatestockwatcher'}`
    };
    
    // Only add trades with basic information
    if (trade.politician && trade.transaction_date) {
      trades.push(trade);
    }
  });
  
  return trades;
}

/**
 * Generic trade extraction when no structured data is available
 * @param {Document} doc - JSDOM document
 * @param {string} type - 'house' or 'senate'
 * @returns {Array} - Extracted trades
 */
function extractTradesGeneric(doc, type) {
  const fullText = doc.body.textContent.trim();
  const potentialTrades = [];
  
  // Split by potential trade delimitters
  const sections = fullText.split(/\n{2,}|\r\n{2,}|\r{2,}|<br\s*\/?>\s*<br\s*\/?>|<hr\s*\/?>|\*{3,}|-{3,}|={3,}/);
  
  sections.forEach((section, index) => {
    const text = section.trim();
    if (text.length < 30) return; // Skip short sections
    
    // Extract various fields using regex
    const nameMatch = text.match(/(?:Senator|Representative|Politician|Name):?\s*([^,\n]+)/i);
    const dateMatch = text.match(/(?:Date|Transaction Date):?\s*([^,\n]+)/i);
    const tickerMatch = text.match(/(?:Ticker|Symbol):?\s*([^,\n]+)/i);
    const assetMatch = text.match(/(?:Asset|Description):?\s*([^,\n]+)/i);
    const typeMatch = text.match(/(?:Type|Transaction Type):?\s*([^,\n]+)/i);
    const amountMatch = text.match(/(?:Amount|Value):?\s*([^,\n]+)/i);
    
    const politician = nameMatch && nameMatch[1] ? nameMatch[1].trim() : '';
    const transactionDate = dateMatch && dateMatch[1] ? formatDate(dateMatch[1].trim()) : '';
    const rawTickerText = tickerMatch && tickerMatch[1] ? tickerMatch[1].trim() : '';
    const assetDescription = assetMatch && assetMatch[1] ? assetMatch[1].trim() : '';
    const transactionType = typeMatch && typeMatch[1] ? typeMatch[1].trim() : '';
    const amount = amountMatch && amountMatch[1] ? amountMatch[1].trim() : '';
    
    // Extract ticker with the enhanced method that uses company name matching
    const ticker = extractTickerWithCompanyMatch(rawTickerText, assetDescription);
    
    const trade = {
      id: `scraped-${type}-${Date.now()}-${index}`,
      type: type,
      politician: politician,
      transaction_date: transactionDate,
      ticker: ticker,
      raw_ticker_text: rawTickerText,
      asset_description: assetDescription,
      transaction_type: transactionType,
      amount: amount,
      comment: '',
      scraped_at: new Date().toISOString(),
      data_source: `${type === 'house' ? 'housestockwatcher' : 'senatestockwatcher'}-generic`
    };
    
    // Only add trades with basic information
    if (trade.politician && trade.transaction_date) {
      potentialTrades.push(trade);
    }
  });
  
  return potentialTrades;
}

/**
 * Scrape Capitol Trades for political trading data
 * @param {string} type - 'house' or 'senate'
 * @returns {Promise<Array>} - Trade data
 */
async function scrapeCapitolTrades(type) {
  try {
    console.log(`Scraping CapitolTrades for ${type} trades...`);
    
    // Define the politician type for the API request
    const politicianType = type === 'house' ? 'representative' : 'senator';
    
    // Make the API request to Capitol Trades
    const response = await axios.get(`${CAPITOL_TRADES_URL}/api/trades`, {
      params: {
        limit: 100,
        politician_type: politicianType,
        sort_field: 'transaction_date',
        sort_direction: 'desc'
      },
      headers: {
        ...HEADERS,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      timeout: 10000
    });
    
    // Check if we got a valid response
    if (response.data && Array.isArray(response.data.data)) {
      const trades = response.data.data;
      console.log(`Got ${trades.length} trades from Capitol Trades API`);
      
      // Transform the data to our standard format
      return trades.map((trade, index) => {
        // Extract asset description and get ticker using our enhanced method
        const assetName = trade.asset_name || '';
        
        // If ticker is provided directly, use it, otherwise try to extract it
        let ticker = trade.ticker || '';
        if (!ticker) {
          ticker = extractTickerWithCompanyMatch(assetName);
        }
        
        return {
          id: trade.id || `capitol-${type}-${Date.now()}-${index}`,
          type: type,
          politician: trade.politician?.name || '',
          transaction_date: formatDate(trade.transaction_date || ''),
          ticker: ticker,
          raw_ticker_text: trade.ticker || '',
          asset_description: assetName,
          transaction_type: trade.transaction_type || '',
          amount: trade.amount || '',
          comment: '',
          scraped_at: new Date().toISOString(),
          data_source: 'capitoltrades'
        };
      }).filter(trade => trade.politician && trade.transaction_date);
    }
    
    console.log('No valid data from Capitol Trades API');
    return [];
  } catch (error) {
    console.error('Error scraping Capitol Trades:', error);
    return [];
  }
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
 * Parse CSV text to JSON
 * @param {string} csvText - CSV text
 * @returns {Array} - Parsed data
 */
function parseCSV(csvText) {
  if (!csvText) return [];
  
  try {
    // Split by rows
    const rows = csvText.split(/\r?\n/);
    if (rows.length < 2) return [];
    
    // Get headers
    const headers = rows[0].split(',').map(header => header.trim());
    
    // Parse data rows
    const result = [];
    for (let i = 1; i < rows.length; i++) {
      if (!rows[i].trim()) continue;
      
      const values = rows[i].split(',');
      const obj = {};
      
      headers.forEach((header, index) => {
        obj[header] = values[index] ? values[index].trim() : '';
      });
      
      result.push(obj);
    }
    
    return result;
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

/**
 * Fetch politician profiles (House)
 * @returns {Promise<Array>} - House politician profiles
 */
async function fetchHousePoliticians() {
  // Check cache first
  const now = Date.now();
  if (
    scrapeCache.housePoliticiansData && 
    now - scrapeCache.housePoliticiansLastAttempt < scrapeCache.CACHE_TIMEOUT
  ) {
    console.log('Using cached House politicians data');
    return scrapeCache.housePoliticiansData;
  }

  try {
    console.log('Fetching House politicians data...');
    scrapeCache.housePoliticiansLastAttempt = now;
    
    // Try to fetch from Capitol Trades first
    try {
      const response = await axios.get(`${CAPITOL_TRADES_URL}/api/politicians`, {
        params: {
          limit: 500,
          type: 'representative'
        },
        headers: {
          ...HEADERS,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        const politicians = response.data.data.map(p => ({
          id: p.id || `house-${Date.now()}-${p.name.replace(/\s+/g, '')}`,
          name: p.name || '',
          state: p.state || '',
          party: p.party || '',
          chamber: 'house',
          district: p.district || '',
          data_source: 'capitoltrades'
        }));
        
        console.log(`Found ${politicians.length} House politicians from Capitol Trades`);
        
        if (politicians.length > 0) {
          scrapeCache.housePoliticiansData = politicians;
          return politicians;
        }
      }
    } catch (capitolError) {
      console.error('Error fetching House politicians from Capitol Trades:', capitolError);
    }
    
    // Fallback to HouseStockWatcher
    console.log('Falling back to HouseStockWatcher for politicians data...');
    const mainPage = await axios.get(HOUSE_URL, { 
      headers: HEADERS,
      timeout: 10000
    });
    
    const mainPageHtml = mainPage.data;
    const mainDom = new JSDOM(mainPageHtml);
    const doc = mainDom.window.document;
    
    // Look for links to politician profiles
    const politicianLinks = Array.from(doc.querySelectorAll('a'))
      .filter(a => {
        const href = a.getAttribute('href') || '';
        return href.includes('/politician/') || href.includes('/representative/');
      });
    
    const politicians = [];
    
    for (const link of politicianLinks) {
      const name = link.textContent.trim();
      const href = link.getAttribute('href') || '';
      
      // Skip if no name
      if (!name) continue;
      
      // Extract state and party from text near the link
      let state = '';
      let party = '';
      
      // Check parent elements for state/party info
      let current = link.parentElement;
      for (let i = 0; i < 3 && current; i++) {
        const text = current.textContent;
        
        // Look for state abbreviation
        const stateMatch = text.match(/\b([A-Z]{2})\b/);
        if (stateMatch && stateMatch[1] && !['AM', 'PM', 'US', 'UK'].includes(stateMatch[1])) {
          state = stateMatch[1];
        }
        
        // Look for party
        if (text.includes('(D)') || text.includes('Democrat')) {
          party = 'D';
        } else if (text.includes('(R)') || text.includes('Republican')) {
          party = 'R';
        } else if (text.includes('(I)') || text.includes('Independent')) {
          party = 'I';
        }
        
        current = current.parentElement;
      }
      
      politicians.push({
        id: `house-${Date.now()}-${name.replace(/\s+/g, '')}`,
        name: name,
        state: state,
        party: party,
        chamber: 'house',
        district: '',
        data_source: 'housestockwatcher'
      });
    }
    
    if (politicians.length > 0) {
      console.log(`Found ${politicians.length} House politicians from HouseStockWatcher`);
      scrapeCache.housePoliticiansData = politicians;
      return politicians;
    }
    
    console.log('Failed to find House politicians data from any source');
    return [];
  } catch (error) {
    console.error('Error fetching House politicians:', error);
    return [];
  }
}

/**
 * Fetch politician profiles (Senate)
 * @returns {Promise<Array>} - Senate politician profiles
 */
async function fetchSenatePoliticians() {
  // Check cache first
  const now = Date.now();
  if (
    scrapeCache.senatePoliticiansData && 
    now - scrapeCache.senatePoliticiansLastAttempt < scrapeCache.CACHE_TIMEOUT
  ) {
    console.log('Using cached Senate politicians data');
    return scrapeCache.senatePoliticiansData;
  }

  try {
    console.log('Fetching Senate politicians data...');
    scrapeCache.senatePoliticiansLastAttempt = now;
    
    // Try to fetch from Capitol Trades first
    try {
      const response = await axios.get(`${CAPITOL_TRADES_URL}/api/politicians`, {
        params: {
          limit: 500,
          type: 'senator'
        },
        headers: {
          ...HEADERS,
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        timeout: 10000
      });
      
      if (response.data && Array.isArray(response.data.data)) {
        const politicians = response.data.data.map(p => ({
          id: p.id || `senate-${Date.now()}-${p.name.replace(/\s+/g, '')}`,
          name: p.name || '',
          state: p.state || '',
          party: p.party || '',
          chamber: 'senate',
          data_source: 'capitoltrades'
        }));
        
        console.log(`Found ${politicians.length} Senate politicians from Capitol Trades`);
        
        if (politicians.length > 0) {
          scrapeCache.senatePoliticiansData = politicians;
          return politicians;
        }
      }
    } catch (capitolError) {
      console.error('Error fetching Senate politicians from Capitol Trades:', capitolError);
    }
    
    // Fallback to SenateStockWatcher
    console.log('Falling back to SenateStockWatcher for politicians data...');
    const mainPage = await axios.get(SENATE_URL, { 
      headers: HEADERS,
      timeout: 10000
    });
    
    const mainPageHtml = mainPage.data;
    const mainDom = new JSDOM(mainPageHtml);
    const doc = mainDom.window.document;
    
    // Look for links to politician profiles
    const politicianLinks = Array.from(doc.querySelectorAll('a'))
      .filter(a => {
        const href = a.getAttribute('href') || '';
        return href.includes('/politician/') || href.includes('/senator/');
      });
    
    const politicians = [];
    
    for (const link of politicianLinks) {
      const name = link.textContent.trim();
      const href = link.getAttribute('href') || '';
      
      // Skip if no name
      if (!name) continue;
      
      // Extract state and party from text near the link
      let state = '';
      let party = '';
      
      // Check parent elements for state/party info
      let current = link.parentElement;
      for (let i = 0; i < 3 && current; i++) {
        const text = current.textContent;
        
        // Look for state abbreviation
        const stateMatch = text.match(/\b([A-Z]{2})\b/);
        if (stateMatch && stateMatch[1] && !['AM', 'PM', 'US', 'UK'].includes(stateMatch[1])) {
          state = stateMatch[1];
        }
        
        // Look for party
        if (text.includes('(D)') || text.includes('Democrat')) {
          party = 'D';
        } else if (text.includes('(R)') || text.includes('Republican')) {
          party = 'R';
        } else if (text.includes('(I)') || text.includes('Independent')) {
          party = 'I';
        }
        
        current = current.parentElement;
      }
      
      politicians.push({
        id: `senate-${Date.now()}-${name.replace(/\s+/g, '')}`,
        name: name,
        state: state,
        party: party,
        chamber: 'senate',
        data_source: 'senatestockwatcher'
      });
    }
    
    if (politicians.length > 0) {
      console.log(`Found ${politicians.length} Senate politicians from SenateStockWatcher`);
      scrapeCache.senatePoliticiansData = politicians;
      return politicians;
    }
    
    console.log('Failed to find Senate politicians data from any source');
    return [];
  } catch (error) {
    console.error('Error fetching Senate politicians:', error);
    return [];
  }
}

/**
 * Get politicians of either House or Senate
 * @param {string} type - Either 'house' or 'senate'
 * @returns {Promise<Array>} - Politicians data
 */
async function getPoliticians(type = 'all') {
  try {
    if (type === 'house') {
      return await fetchHousePoliticians();
    } else if (type === 'senate') {
      return await fetchSenatePoliticians();
    } else {
      // If 'all', fetch both and combine
      const [house, senate] = await Promise.all([
        fetchHousePoliticians(),
        fetchSenatePoliticians()
      ]);
      
      return [...house, ...senate];
    }
  } catch (error) {
    console.error('Error fetching politicians:', error);
    return [];
  }
}

module.exports = {
  scrapeHouseTrades,
  scrapeSenateTrades,
  getPoliticians
};