const express = require('express');
const cors = require('cors');
const { JSDOM } = require('jsdom');
const fetch = require('node-fetch');

// Create Express app
const app = express();
app.use(cors());
app.use(express.json());

// Mock the necessary browser globals
global.DOMParser = new JSDOM().window.DOMParser;

// Import types and default options from the crawl service
const defaultCrawlOptions = {
  maxDepth: 2,
  maxPages: 10,
  ignoreRobotsTxt: true,
  timeout: 10000,
  userAgent: 'StockAdvisorAI/1.0',
  sources: ['finviz', 'capitoltrades']
};

// API endpoint to crawl Finviz
app.post('/api/crawl/finviz', async (req, res) => {
  try {
    const options = req.body.options || {};
    const results = await crawlFinviz(options);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error crawling Finviz:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to crawl CapitolTrades
app.post('/api/crawl/capitoltrades', async (req, res) => {
  try {
    const options = req.body.options || {};
    const results = await crawlCapitolTrades(options);
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error crawling CapitolTrades:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint for general crawling
app.post('/api/crawl', async (req, res) => {
  try {
    const { seedUrls, options } = req.body;
    if (!seedUrls || !Array.isArray(seedUrls)) {
      return res.status(400).json({ success: false, error: 'seedUrls must be an array' });
    }
    
    const results = await startCrawl(seedUrls, options || {});
    res.json({ success: true, results });
  } catch (error) {
    console.error('Error crawling:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to get the status of the crawler
app.get('/api/crawl/status', (req, res) => {
  res.json({
    status: 'idle', // You'll need to implement status tracking
    message: 'Crawler is ready'
  });
});

// Function implementations from crawl4ai-service.ts
// (simplified versions adapted for Node.js)

async function crawlFinviz(options = {}) {
  const seedUrls = [
    'https://finviz.com/',
    'https://finviz.com/news.ashx',
    'https://finviz.com/quote.ashx?t=AAPL',
    'https://finviz.com/quote.ashx?t=MSFT',
  ];
  
  try {
    return await startCrawl(seedUrls, { 
      ...options, 
      sources: ['finviz'] 
    });
  } catch (error) {
    console.error("Error crawling Finviz:", error);
    return generateMockStocks();
  }
}

async function crawlCapitolTrades(options = {}) {
  const seedUrls = [
    'https://www.capitoltrades.com/trades?per_page=96',
    'https://www.capitoltrades.com/politicians?per_page=96'
  ];
  
  try {
    const results = await startCrawl(seedUrls, { 
      ...options, 
      sources: ['capitoltrades'] 
    });
    
    if (results.length === 0) {
      throw new Error("No valid data returned from Capitol Trades");
    }
    
    return results;
  } catch (error) {
    console.error("Error crawling Capitol Trades:", error);
    return generateMockTrades();
  }
}

async function startCrawl(seedUrls, options = {}) {
  const mergedOptions = {
    ...defaultCrawlOptions,
    ...options
  };
  
  const results = [];
  const visited = new Set();
  
  const queue = seedUrls.map(url => ({ url, depth: 0 }));
  
  while (queue.length > 0 && results.length < mergedOptions.maxPages) {
    const { url, depth } = queue.shift();
    
    if (visited.has(url)) continue;
    visited.add(url);
    
    try {
      const result = await crawlUrl(url, depth, mergedOptions);
      results.push(result);
      
      if (depth < mergedOptions.maxDepth) {
        const allowedLinks = result.links.filter(link => {
          return (
            link.includes('finviz.com') || 
            link.includes('capitoltrades.com/trades') || 
            link.includes('capitoltrades.com/politicians')
          );
        });
        
        for (const link of allowedLinks) {
          if (!visited.has(link)) {
            queue.push({ url: link, depth: depth + 1 });
          }
        }
      }
    } catch (error) {
      console.error(`Error crawling ${url}:`, error);
    }
  }
  
  return results;
}

async function crawlUrl(url, depth = 1, options = {}) {
  try {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    
    const response = await fetch(proxyUrl, {
      headers: {
        'User-Agent': options.userAgent || defaultCrawlOptions.userAgent
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }
    
    const html = await response.text();
    
    // Parse the HTML
    const dom = new JSDOM(html);
    const doc = dom.window.document;
    
    const title = doc.querySelector('title')?.textContent || url;
    const content = extractTextContent(doc);
    const links = extractLinks(doc, url);
    
    // Extract metadata based on the URL
    const metadata = extractMetadata(doc, url);
    
    return {
      url,
      title,
      content,
      links,
      timestamp: Date.now(),
      metadata
    };
  } catch (error) {
    console.error(`Error crawling ${url}:`, error);
    
    // Return a minimal result with error information
    return {
      url,
      title: `Error: ${url}`,
      content: `Failed to crawl this URL: ${error.message}`,
      links: [],
      timestamp: Date.now()
    };
  }
}

// Helper functions
function extractTextContent(doc) {
  // Remove script and style elements
  const scripts = doc.querySelectorAll('script, style');
  scripts.forEach(script => script.remove());
  
  // Get text from body
  return doc.body.textContent?.trim() || '';
}

function extractLinks(doc, baseUrl) {
  const links = [];
  const anchors = doc.querySelectorAll('a');
  
  anchors.forEach(anchor => {
    const href = anchor.getAttribute('href');
    if (href) {
      try {
        // Convert relative URLs to absolute
        const absoluteUrl = new URL(href, baseUrl).href;
        links.push(absoluteUrl);
      } catch (error) {
        // Skip invalid URLs
        console.warn(`Invalid URL: ${href}`);
      }
    }
  });
  
  return links;
}

function extractMetadata(doc, url) {
  // Simplified metadata extraction
  if (url.includes('finviz.com')) {
    return { source: 'finviz' };
  } else if (url.includes('capitoltrades.com')) {
    return { source: 'capitoltrades' };
  }
  
  return null;
}

// Mock data generators
function generateMockStocks() {
  return [
    {
      ticker: 'AAPL',
      name: 'Apple Inc.',
      price: '187.32',
      change: '+1.25%',
      volume: '56.8M',
      pe: '28.5',
      marketCap: '2.53T'
    },
    {
      ticker: 'MSFT',
      name: 'Microsoft Corporation',
      price: '378.92',
      change: '+0.75%',
      volume: '22.3M',
      pe: '32.7',
      marketCap: '2.81T'
    },
    // Add more mock stocks as needed
  ];
}

function generateMockTrades() {
  return [
    {
      id: 'mock-1',
      politician: 'Nancy Pelosi',
      party: 'D',
      chamber: 'House',
      stock: 'AAPL',
      stockName: 'Apple Inc.',
      tradeType: 'Buy',
      date: '2023-06-15',
      amountRange: '$100,001 - $250,000',
      link: 'https://www.capitoltrades.com/trades?politician=Nancy%20Pelosi'
    },
    // Add more mock trades as needed
  ];
}

// Start the server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Crawl4AI server running on port ${PORT}`);
});