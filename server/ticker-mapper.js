/**
 * Ticker Mapper - Maps company names to their ticker symbols
 * This helps resolve cases where the source data doesn't explicitly include tickers
 */

// Map of common company names to their ticker symbols
// This helps resolve "Unknown" tickers when only company names are available
const COMPANY_TO_TICKER_MAP = {
  // Major Tech Companies
  'Apple': 'AAPL',
  'Apple Inc': 'AAPL',
  'Microsoft': 'MSFT',
  'Microsoft Corporation': 'MSFT',
  'Amazon': 'AMZN',
  'Amazon.com': 'AMZN',
  'Amazon.com Inc': 'AMZN',
  'Alphabet': 'GOOGL',
  'Alphabet Inc': 'GOOGL',
  'Google': 'GOOGL',
  'Meta': 'META',
  'Meta Platforms': 'META',
  'Facebook': 'META',
  'Tesla': 'TSLA',
  'Tesla Inc': 'TSLA',
  
  // Major Financial Companies
  'JPMorgan': 'JPM',
  'JPMorgan Chase': 'JPM',
  'JPMorgan Chase & Co': 'JPM',
  'Bank of America': 'BAC',
  'Bank of America Corporation': 'BAC',
  'Goldman Sachs': 'GS',
  'Goldman Sachs Group': 'GS',
  'Visa': 'V',
  'Visa Inc': 'V',
  'Mastercard': 'MA',
  'Mastercard Inc': 'MA',
  
  // Healthcare/Pharma Companies
  'Johnson & Johnson': 'JNJ',
  'Pfizer': 'PFE',
  'Pfizer Inc': 'PFE',
  'UnitedHealth': 'UNH',
  'UnitedHealth Group': 'UNH',
  'Merck': 'MRK',
  'Merck & Co': 'MRK',
  'Abbott Laboratories': 'ABT',
  
  // Consumer Companies
  'Coca-Cola': 'KO',
  'Coca-Cola Company': 'KO',
  'PepsiCo': 'PEP',
  'PepsiCo Inc': 'PEP',
  'Walmart': 'WMT',
  'Walmart Inc': 'WMT',
  'Procter & Gamble': 'PG',
  'Nike': 'NKE',
  'Nike Inc': 'NKE',
  'McDonald\'s': 'MCD',
  'McDonald\'s Corporation': 'MCD',
  
  // Energy Companies
  'Exxon Mobil': 'XOM',
  'Exxon Mobil Corporation': 'XOM',
  'Chevron': 'CVX',
  'Chevron Corporation': 'CVX',
  'ConocoPhillips': 'COP',
  'Duke Energy': 'DUK',
  'Duke Energy Corporation': 'DUK',
  
  // Telecom Companies
  'AT&T': 'T',
  'AT&T Inc': 'T',
  'Verizon': 'VZ',
  'Verizon Communications': 'VZ',
  'T-Mobile': 'TMUS',
  'T-Mobile US': 'TMUS',
  
  // Others (from the screenshot examples)
  'Altria Group': 'MO',
  'Altria Group Inc': 'MO',
  'GlaxoSmithKline': 'GSK',
  'GlaxoSmithKline PLC': 'GSK',
  
  // Common REITs
  'American Tower': 'AMT',
  'American Tower Corporation': 'AMT',
  'Crown Castle': 'CCI',
  'Crown Castle Inc': 'CCI',
  'Prologis': 'PLD',
  'Prologis Inc': 'PLD',
  
  // Semiconductor Companies
  'NVIDIA': 'NVDA',
  'NVIDIA Corporation': 'NVDA',
  'Intel': 'INTC',
  'Intel Corporation': 'INTC',
  'AMD': 'AMD',
  'Advanced Micro Devices': 'AMD',
  
  // Aerospace and Defense
  'Boeing': 'BA',
  'Boeing Company': 'BA',
  'Lockheed Martin': 'LMT',
  'Lockheed Martin Corporation': 'LMT',
  'Raytheon': 'RTX',
  'Raytheon Technologies': 'RTX',
  
  // Additional companies frequently traded by Congress
  'NVIDIA': 'NVDA',
  'Moderna': 'MRNA',
  'Palantir': 'PLTR',
  'Palantir Technologies': 'PLTR',
  'Alibaba': 'BABA',
  'Alibaba Group': 'BABA',
  'Walt Disney': 'DIS',
  'Walt Disney Company': 'DIS',
  'Disney': 'DIS',
  'Netflix': 'NFLX',
  'Netflix Inc': 'NFLX'
};

/**
 * Lookup a ticker symbol based on company name
 * @param {string} companyName - The company name to lookup
 * @returns {string|null} - The ticker symbol or null if not found
 */
function lookupTickerByCompanyName(companyName) {
  if (!companyName) return null;
  
  // Direct lookup
  const normalizedName = companyName.trim();
  if (COMPANY_TO_TICKER_MAP[normalizedName]) {
    return COMPANY_TO_TICKER_MAP[normalizedName];
  }
  
  // Try partial match for longer company names
  for (const [name, ticker] of Object.entries(COMPANY_TO_TICKER_MAP)) {
    // Check if the company name includes the mapped name
    if (normalizedName.toLowerCase().includes(name.toLowerCase())) {
      return ticker;
    }
    
    // Check if the mapped name includes the company name (for shorter lookups)
    if (name.toLowerCase().includes(normalizedName.toLowerCase()) && 
        normalizedName.length > 3) { // Avoid matching short strings
      return ticker;
    }
  }
  
  return null;
}

/**
 * Try to extract a ticker from text using various methods including company name matching
 * @param {string} text - The text to extract from
 * @param {string} assetDescription - Optional asset description to check
 * @returns {string} - The extracted ticker or empty string
 */
function extractTickerWithCompanyMatch(text, assetDescription = '') {
  // First try traditional extraction methods (parentheses, standalone, etc.)
  const traditionalTicker = extractTickerTraditional(text);
  if (traditionalTicker) {
    return traditionalTicker;
  }
  
  // Then try company name matching on either the text or asset description
  const companyTicker = lookupTickerByCompanyName(text) || 
                        lookupTickerByCompanyName(assetDescription);
  if (companyTicker) {
    return companyTicker;
  }
  
  return '';
}

/**
 * Extract ticker using traditional methods
 * @param {string} text - Text to extract from
 * @returns {string} - Extracted ticker or empty string
 */
function extractTickerTraditional(text) {
  if (!text) return '';
  
  // Common words that might be incorrectly identified as tickers
  const COMMON_WORDS = ['A', 'I', 'AM', 'PM', 'AN', 'AS', 'AT', 'BE', 'BY', 'GO', 'IF', 
                        'IN', 'IS', 'IT', 'NO', 'OF', 'ON', 'OR', 'TO', 'UP', 'US', 'WE'];
  
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

module.exports = {
  lookupTickerByCompanyName,
  extractTickerWithCompanyMatch
};