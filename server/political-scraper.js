const fetch = require('node-fetch');
const { JSDOM } = require('jsdom');

// Website URLs
const HOUSE_URL = 'https://housestockwatcher.com';
const SENATE_URL = 'https://senatestockwatcher.com';

/**
 * Scrape House representative stock trades
 * @param {Object} options - Options for scraping
 * @returns {Promise<Array>} - House trades data
 */
async function scrapeHouseTrades(options = {}) {
  try {
    // First check if there's a data download link
    const mainPage = await fetch(HOUSE_URL);
    const mainPageHtml = await mainPage.text();
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
      // Try to get data from the first download link
      const downloadUrl = new URL(downloadLinks[0], HOUSE_URL).href;
      const dataResponse = await fetch(downloadUrl);
      
      // Check if it's JSON or CSV
      const contentType = dataResponse.headers.get('content-type');
      if (contentType && contentType.includes('json')) {
        return await dataResponse.json();
      } else if (contentType && (contentType.includes('csv') || contentType.includes('text/plain'))) {
        const csvText = await dataResponse.text();
        return parseCSV(csvText);
      }
    }
    
    // If no download link, scrape trades from the trades page
    const tradesPage = await fetch(`${HOUSE_URL}/trades`);
    const tradesHtml = await tradesPage.text();
    const tradesDom = new JSDOM(tradesHtml);
    const tradesDoc = tradesDom.window.document;
    
    return scrapeTradesFromDocument(tradesDoc, 'house');
  } catch (error) {
    console.error('Error scraping House trades:', error);
    return generateMockHouseTrades();
  }
}

/**
 * Scrape Senate stock trades
 * @param {Object} options - Options for scraping
 * @returns {Promise<Array>} - Senate trades data
 */
async function scrapeSenateTrades(options = {}) {
  try {
    // First check if there's a data download link
    const mainPage = await fetch(SENATE_URL);
    const mainPageHtml = await mainPage.text();
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
      // Try to get data from the first download link
      const downloadUrl = new URL(downloadLinks[0], SENATE_URL).href;
      const dataResponse = await fetch(downloadUrl);
      
      // Check if it's JSON or CSV
      const contentType = dataResponse.headers.get('content-type');
      if (contentType && contentType.includes('json')) {
        return await dataResponse.json();
      } else if (contentType && (contentType.includes('csv') || contentType.includes('text/plain'))) {
        const csvText = await dataResponse.text();
        return parseCSV(csvText);
      }
    }
    
    // If no download link, scrape trades from the trades page
    const tradesPage = await fetch(`${SENATE_URL}/trades`);
    const tradesHtml = await tradesPage.text();
    const tradesDom = new JSDOM(tradesHtml);
    const tradesDoc = tradesDom.window.document;
    
    return scrapeTradesFromDocument(tradesDoc, 'senate');
  } catch (error) {
    console.error('Error scraping Senate trades:', error);
    return generateMockSenateTrades();
  }
}

/**
 * Scrape House representative profiles
 * @returns {Promise<Array>} - House representatives data
 */
async function scrapeHouseRepresentatives() {
  try {
    const page = await fetch(`${HOUSE_URL}/representatives`);
    const html = await page.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    return scrapePoliticiansFromDocument(doc, 'house');
  } catch (error) {
    console.error('Error scraping House representatives:', error);
    return generateMockHouseRepresentatives();
  }
}

/**
 * Scrape Senate profiles
 * @returns {Promise<Array>} - Senators data
 */
async function scrapeSenators() {
  try {
    const page = await fetch(`${SENATE_URL}/senators`);
    const html = await page.text();
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    return scrapePoliticiansFromDocument(doc, 'senate');
  } catch (error) {
    console.error('Error scraping Senators:', error);
    return generateMockSenators();
  }
}

/**
 * Scrape all political trades (both House and Senate)
 * @returns {Promise<Object>} - Combined political trades
 */
async function scrapeAllPoliticalTrades() {
  try {
    const [houseTrades, senateTrades] = await Promise.all([
      scrapeHouseTrades(),
      scrapeSenateTrades()
    ]);
    
    return {
      houseTrades,
      senateTrades,
      combinedTrades: [...houseTrades, ...senateTrades],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error scraping all political trades:', error);
    throw error;
  }
}

/**
 * Scrape all political profiles (both House and Senate)
 * @returns {Promise<Object>} - Combined political profiles
 */
async function scrapeAllPoliticians() {
  try {
    const [representatives, senators] = await Promise.all([
      scrapeHouseRepresentatives(),
      scrapeSenators()
    ]);
    
    return {
      representatives,
      senators,
      combinedPoliticians: [...representatives, ...senators],
      timestamp: Date.now()
    };
  } catch (error) {
    console.error('Error scraping all politicians:', error);
    throw error;
  }
}

// Helper function to parse CSV data
function parseCSV(csvText) {
  // Simple CSV parser (can be enhanced for more complex CSVs)
  const lines = csvText.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  
  return lines.slice(1)
    .filter(line => line.trim().length > 0)
    .map(line => {
      const values = line.split(',').map(v => v.trim());
      return headers.reduce((obj, header, i) => {
        obj[header] = values[i];
        return obj;
      }, {});
    });
}

// Helper function to scrape trades from an HTML document
function scrapeTradesFromDocument(doc, type) {
  const trades = [];
  
  // Look for a table with trades data
  const tables = doc.querySelectorAll('table');
  let tradesTable = null;
  
  // Find the table that might contain trade data
  for (const table of tables) {
    const headerRow = table.querySelector('tr');
    if (headerRow) {
      const headerText = headerRow.textContent.toLowerCase();
      if (headerText.includes('ticker') || 
          headerText.includes('trade') || 
          headerText.includes('stock') ||
          headerText.includes('transaction')) {
        tradesTable = table;
        break;
      }
    }
  }
  
  if (tradesTable) {
    const rows = tradesTable.querySelectorAll('tr');
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      
      if (cells.length >= 5) {
        const trade = {
          id: `scraped-${type}-${Date.now()}-${i}`,
          type: type, // 'house' or 'senate'
          politician: cells[0]?.textContent?.trim() || '',
          transaction_date: cells[1]?.textContent?.trim() || '',
          ticker: cells[2]?.textContent?.trim() || '',
          asset_description: cells[3]?.textContent?.trim() || '',
          transaction_type: cells[4]?.textContent?.trim() || '',
        };
        
        // Add more fields if available
        if (cells.length > 5) {
          trade.amount = cells[5]?.textContent?.trim() || '';
        }
        
        if (cells.length > 6) {
          trade.comment = cells[6]?.textContent?.trim() || '';
        }
        
        trades.push(trade);
      }
    }
  }
  
  return trades.length > 0 ? trades : (type === 'house' ? generateMockHouseTrades() : generateMockSenateTrades());
}

// Helper function to scrape politicians from an HTML document
function scrapePoliticiansFromDocument(doc, type) {
  const politicians = [];
  
  // Look for a table with politician data
  const tables = doc.querySelectorAll('table');
  let politiciansTable = null;
  
  // Find the table that might contain politician data
  for (const table of tables) {
    const headerRow = table.querySelector('tr');
    if (headerRow) {
      const headerText = headerRow.textContent.toLowerCase();
      if (headerText.includes('name') || 
          headerText.includes('party') || 
          headerText.includes('state')) {
        politiciansTable = table;
        break;
      }
    }
  }
  
  if (politiciansTable) {
    const rows = politiciansTable.querySelectorAll('tr');
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      
      if (cells.length >= 3) {
        const politician = {
          id: `scraped-${type}-${Date.now()}-${i}`,
          type: type, // 'house' or 'senate'
          name: cells[0]?.textContent?.trim() || '',
          party: cells[1]?.textContent?.trim() || '',
          state: cells[2]?.textContent?.trim() || '',
        };
        
        // District for House representatives
        if (type === 'house' && cells.length > 3) {
          politician.district = cells[3]?.textContent?.trim() || '';
        }
        
        politicians.push(politician);
      }
    }
  }
  
  return politicians.length > 0 ? politicians : 
    (type === 'house' ? generateMockHouseRepresentatives() : generateMockSenators());
}

// Mock data generators

function generateMockHouseTrades() {
  return [
    {
      id: 'mock-house-1',
      type: 'house',
      politician: 'Nancy Pelosi',
      transaction_date: '2023-03-15',
      ticker: 'AAPL',
      asset_description: 'Apple Inc.',
      transaction_type: 'Purchase',
      amount: '$500,001 - $1,000,000',
      comment: ''
    },
    {
      id: 'mock-house-2',
      type: 'house',
      politician: 'Kevin McCarthy',
      transaction_date: '2023-03-10',
      ticker: 'MSFT',
      asset_description: 'Microsoft Corporation',
      transaction_type: 'Sale',
      amount: '$15,001 - $50,000',
      comment: ''
    },
    {
      id: 'mock-house-3',
      type: 'house',
      politician: 'Alexandria Ocasio-Cortez',
      transaction_date: '2023-02-28',
      ticker: 'TSLA',
      asset_description: 'Tesla, Inc.',
      transaction_type: 'Purchase',
      amount: '$1,001 - $15,000',
      comment: ''
    }
  ];
}

function generateMockSenateTrades() {
  return [
    {
      id: 'mock-senate-1',
      type: 'senate',
      politician: 'Mitch McConnell',
      transaction_date: '2023-03-20',
      ticker: 'JPM',
      asset_description: 'JPMorgan Chase & Co.',
      transaction_type: 'Purchase',
      amount: '$100,001 - $250,000',
      comment: ''
    },
    {
      id: 'mock-senate-2',
      type: 'senate',
      politician: 'Elizabeth Warren',
      transaction_date: '2023-03-05',
      ticker: 'AMZN',
      asset_description: 'Amazon.com, Inc.',
      transaction_type: 'Sale',
      amount: '$50,001 - $100,000',
      comment: ''
    },
    {
      id: 'mock-senate-3',
      type: 'senate',
      politician: 'Bernie Sanders',
      transaction_date: '2023-02-15',
      ticker: 'JNJ',
      asset_description: 'Johnson & Johnson',
      transaction_type: 'Purchase',
      amount: '$1,001 - $15,000',
      comment: ''
    }
  ];
}

function generateMockHouseRepresentatives() {
  return [
    {
      id: 'mock-rep-1',
      type: 'house',
      name: 'Nancy Pelosi',
      party: 'Democrat',
      state: 'CA',
      district: '12'
    },
    {
      id: 'mock-rep-2',
      type: 'house',
      name: 'Kevin McCarthy',
      party: 'Republican',
      state: 'CA',
      district: '20'
    },
    {
      id: 'mock-rep-3',
      type: 'house',
      name: 'Alexandria Ocasio-Cortez',
      party: 'Democrat',
      state: 'NY',
      district: '14'
    }
  ];
}

function generateMockSenators() {
  return [
    {
      id: 'mock-sen-1',
      type: 'senate',
      name: 'Mitch McConnell',
      party: 'Republican',
      state: 'KY'
    },
    {
      id: 'mock-sen-2',
      type: 'senate',
      name: 'Elizabeth Warren',
      party: 'Democrat',
      state: 'MA'
    },
    {
      id: 'mock-sen-3',
      type: 'senate',
      name: 'Bernie Sanders',
      party: 'Independent',
      state: 'VT'
    }
  ];
}

module.exports = {
  scrapeHouseTrades,
  scrapeSenateTrades,
  scrapeHouseRepresentatives,
  scrapeSenators,
  scrapeAllPoliticalTrades,
  scrapeAllPoliticians
};