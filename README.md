# Crawl4AI Service

A web scraping service that collects and serves stock market data and congressional trading information. This service provides a unified API for accessing financial data from Finviz and political trading data from various sources including Capitol Trades, House Stock Watcher, and Senate Stock Watcher websites.

![Crawl4AI Spider Logo](server/public/logo.gif)

## Features

- **Financial Data**: Scrape stock data from Finviz including basic metrics, news, and insider trading
- **Congressional Trading**: Extract real trading data from multiple sources with fallback mechanisms
- **Unified API**: Access all data through a clean RESTful API
- **Intelligent Caching**: Reduce website load and improve response times
- **TypeScript Client**: Strongly-typed client library for easy integration
- **Multiple Data Sources**: Prioritizes the most reliable data sources with fallbacks
- **Enhanced Data Extraction**: Robust scraping techniques to ensure data quality

## Repository Structure

```
crawl4ai-service/
├── server/                # Backend server code
│   ├── crawl-server.js    # Express server implementation
│   ├── political-scraper.js # Advanced scraper for political trading data
│   ├── fetch-polyfill.js  # Ensures fetch API consistency across Node versions
│   ├── package.json       # Server dependencies
│   ├── render.yaml        # Render deployment configuration
│   └── public/            # Static files for the frontend
│       ├── index.html     # API documentation page
│       ├── logo.gif       # Animated logo
│       └── favicon.ico    # Favicon
├── crawl4ai-client.ts     # TypeScript client library
├── Dockerfile             # Docker configuration
├── .dockerignore          # Docker build exclusions
├── render.yaml            # Root deployment configuration
└── README.md              # This documentation file
```

## API Endpoints

### Financial Data
- `POST /api/crawl-finviz` - Get financial data for a specific stock ticker

### Political Trading Data
- `GET /api/house-trades` - Get House representatives' trading data
- `GET /api/senate-trades` - Get Senators' trading data
- `GET /api/congressional-trades` - Get all congressional trading data (House and Senate combined)
- `GET /api/politicians` - Get profiles of politicians (supports filtering by chamber)

### Utility Endpoints
- `GET /api/health` - Health check endpoint
- `GET /` - API documentation page

## Data Sources

The service scrapes data from the following sources, with fallbacks for reliability:

### Primary Sources
- **Capitol Trades** - Primary source for congressional trading data
- **Finviz** - For stock data and financial metrics

### Fallback Sources
- **House Stock Watcher** - Fallback for House representatives' trading data
- **Senate Stock Watcher** - Fallback for Senators' trading data

## Enhanced Data Extraction

The service implements advanced scraping techniques to ensure high-quality data:

- **Multiple Source Strategy**: Tries multiple sources to get the most reliable data
- **Flexible Parsing**: Can extract data from various HTML structures
- **Smart Ticker Extraction**: Uses multiple methods to extract stock tickers
- **Cache Management**: Intelligent caching to reduce website load and improve response times
- **Error Handling**: Comprehensive error handling and fallbacks

## Deployment

### Deploy on Render

This service is configured for deployment on Render.com with Docker.

1. Fork or clone this repository
2. Create a new Web Service on Render
3. Connect to your fork of this repository
4. Select "Docker" as the Environment
5. The service will automatically build and deploy

**Configuration**:
- Build Command: `N/A` (Docker handles the build)
- Start Command: `N/A` (Docker handles the startup)

### Local Development

To run the service locally:

```bash
# Clone the repository
git clone https://github.com/yourusername/crawl4ai-service.git
cd crawl4ai-service

# Install dependencies
cd server && npm install

# Start the server
npm start
```

The server will be available at `http://localhost:3000`.

## Client Usage

The TypeScript client provides a simple way to interact with the API:

```typescript
import Crawl4AIClient from './crawl4ai-client';

// Create a client instance
const client = new Crawl4AIClient();

// Get stock data
client.getStockData('AAPL').then(stockData => {
  console.log(stockData.data.fullName);
  console.log(stockData.data.currentPrice);
  console.log(stockData.data.news);
});

// Get House trades
client.getHouseTrades().then(response => {
  console.log(`Found ${response.count} House trades`);
  response.data.forEach(trade => {
    console.log(`${trade.politician} traded ${trade.ticker} on ${trade.transaction_date}`);
  });
});

// Get Senate trades
client.getSenateTrades().then(response => {
  console.log(`Found ${response.count} Senate trades`);
});

// Get all congressional trades
client.getCongressionalTrades().then(response => {
  console.log(`Total trades: ${response.count}`);
  console.log(`House: ${response.house_count}, Senate: ${response.senate_count}`);
});

// Get politician profiles
client.getPoliticians('house').then(response => {
  console.log(`Found ${response.count} House politicians`);
});
```

## Technical Details

The service uses:
- **Express.js** - Web server framework
- **Puppeteer** - For browser automation to scrape Finviz
- **JSDOM** - For parsing HTML from political trading sites
- **Axios** - For making HTTP requests
- **Node-fetch** - For fallback fetch API in older Node versions
- **TypeScript** - For the client library with type safety

## Data Quality Focus

This service prioritizes data quality with several strategies:
1. **Multi-Source Approach**: Pulls data from the most reliable sources first
2. **Fallback Mechanisms**: If primary sources fail, falls back to alternative sources
3. **Smart Extraction**: Uses multiple parsing methods to ensure data extraction
4. **No Mock Data**: Relies on real scraped data rather than mock data
5. **Caching**: Balances between fresh data and website load management

## Legal Considerations

This service is for educational and research purposes only. It accesses publicly available data but users should ensure compliance with the terms of service of the source websites. Always include appropriate delays and caching to avoid excessive requests to the source websites.

## License

MIT