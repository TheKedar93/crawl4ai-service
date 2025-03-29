# Crawl4AI Service

A web scraping service that collects and serves stock market data and congressional trading information. This service provides a unified API for accessing financial data from Finviz and political trading data from House Stock Watcher and Senate Stock Watcher websites.

![Crawl4AI Spider Logo](server/public/favicon.svg)

## Features

- **Financial Data**: Scrape stock data from Finviz including basic metrics, news, and insider trading
- **Congressional Trading**: Extract trading data from House and Senate stock watcher websites
- **Unified API**: Access all data through a clean RESTful API
- **Caching**: Reduce website load and improve response times with intelligent caching
- **TypeScript Client**: Strongly-typed client library for easy integration
- **Animated Spider**: Interactive frontend with animated crawling spider logo

## Repository Structure

```
crawl4ai-service/
├── server/               # Backend server code
│   ├── crawl-server.js   # Express server implementation
│   ├── political-scraper.js # Scraper for political trading data
│   ├── package.json      # Server dependencies
│   ├── render.yaml       # Render deployment configuration
│   └── public/           # Static files for the frontend
│       ├── index.html    # Frontend interface
│       ├── style.css     # Styling with spider animation
│       ├── script.js     # Interactive elements
│       └── favicon.svg   # Spider logo
├── crawl4ai-client.ts    # TypeScript client library
├── Dockerfile            # Docker configuration
├── .dockerignore         # Docker build exclusions
├── render.yaml           # Root deployment configuration
└── README.md             # This documentation file
```

## API Endpoints

### Stock Data
- `GET /api/stock/:ticker` - Get financial data for a specific stock ticker

### Political Trading Data
- `GET /api/political/trades` - Get all congressional trading data
- `GET /api/political/house` - Get House representatives' trading data
- `GET /api/political/senate` - Get Senators' trading data
- `GET /api/political/politicians` - Get profiles of all politicians
- `GET /api/political/politician/:name/trades` - Get trades for a specific politician
- `GET /api/political/ticker/:ticker/trades` - Get congressional trades for a specific ticker

## Data Sources

The service scrapes data from the following sources:
- **Finviz** (`https://finviz.com`) - For stock data and financial metrics
- **House Stock Watcher** (`https://housestockwatcher.com`) - For House representatives' trading data
- **Senate Stock Watcher** (`https://senatestockwatcher.com`) - For Senators' trading data

## Deployment

### Deploy on Render

This service is configured for deployment on Render.com.

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

The server will be available at `http://localhost:3000` with the animated spider logo frontend.

## Spider Animation

The service includes an animated frontend featuring:

- **Crawling Spider Logo**: An animated spider that crawls around a web
- **Interactive Elements**: The spider reacts to user interactions
- **Data Visualization**: Animated data "dots" represent data being collected
- **API Endpoint Links**: Easy access to test the API endpoints

Visit the root URL of your deployed service to see the animated frontend in action.

## Client Usage

The TypeScript client provides a simple way to interact with the API:

```typescript
import Crawl4AIClient from './crawl4ai-client';

// Create a client instance
const client = new Crawl4AIClient('http://localhost:3000');

// Get stock data
client.getStockData('AAPL').then(data => {
  console.log(data.basicInfo);
  console.log(data.news);
});

// Get congressional trading data
client.getAllPoliticalTrades().then(data => {
  console.log(`Found ${data.combinedTrades.length} trades`);
  console.log(`House: ${data.houseTrades.length}, Senate: ${data.senateTrades.length}`);
});

// Get trades for a specific politician
client.getPoliticianTrades('Pelosi').then(trades => {
  console.log(`Found ${trades.length} trades for Pelosi`);
});

// Get trades for a specific stock
client.getTickerTrades('MSFT').then(trades => {
  console.log(`Found ${trades.length} congressional trades for MSFT`);
});
```

## Technical Details

The service uses:
- **Express.js** - Web server framework
- **JSDOM** - DOM parsing for web scraping
- **Node-fetch** - For making HTTP requests
- **TypeScript** - For the client library with type safety
- **CSS Animation** - For the animated spider logo

## Legal Considerations

This service is for educational and research purposes only. It accesses publicly available data but users should ensure compliance with the terms of service of the source websites. Always include appropriate delays and caching to avoid excessive requests to the source websites.

## License

MIT