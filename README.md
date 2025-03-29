# Crawl4AI Service

A Node.js service that provides financial data crawling capabilities for the Stock Advisor AI application, including congressional stock trading data.

## Features

- Financial data crawling from Finviz
- Congressional stock trading data from House Stock Watcher and Senate Stock Watcher APIs
- REST API for easy integration with mobile and web apps
- Customizable crawling options
- Mock data generation for development and testing

## Directory Structure

```
├── server/             # Server-side Node.js code
│   ├── crawl-server.js # Express server implementation
│   ├── political-api.js# Congressional trading data API
│   ├── package.json    # Node.js dependencies
│   └── .gitignore      # Git ignore file
├── Dockerfile          # Docker configuration for deployment
├── render.yaml         # Render deployment config
├── .dockerignore       # Docker build exclusions
├── crawl4ai-client.ts  # TypeScript client for app integration
└── README.md           # This file
```

## Server API Endpoints

### Web Crawling Endpoints
- `POST /api/crawl/finviz` - Crawl Finviz for stock data
- `POST /api/crawl` - General crawling with custom seed URLs
- `GET /api/crawl/status` - Check the status of the crawler

### Political Trading Data Endpoints
- `GET /api/political/trades` - Get combined House and Senate trades
- `GET /api/political/house/trades` - Get House representative trades
- `GET /api/political/senate/trades` - Get Senate trades
- `GET /api/political/politicians` - Get information about politicians

### Utility Endpoints
- `GET /health` - Health check endpoint

## Data Sources

- **Finviz**: Financial visualization and stock screening website
- **[House Stock Watcher API](https://housestockwatcher.com/api)**: Provides data on House representatives' stock trading
- **[Senate Stock Watcher API](https://senatestockwatcher.com/api)**: Provides data on Senators' stock trading

## Deployment on Render

1. Sign up or log in to [Render](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repository
4. Use the following settings:
   - Environment: Docker
   - Docker Compose File: Leave empty, uses the Dockerfile
   - Auto Deploy: Yes (optional)

## Client Usage

```typescript
import { Crawl4AIClient } from './crawl4ai-client';

// Financial data example
const finvizResults = await Crawl4AIClient.crawlFinviz();

// Political trading data examples
const allPoliticalTrades = await Crawl4AIClient.getPoliticalTrades();
const houseTrades = await Crawl4AIClient.getHouseTrades();
const senateTrades = await Crawl4AIClient.getSenateTrades();
const politicians = await Crawl4AIClient.getPoliticians();

// Check crawler status
const status = await Crawl4AIClient.getStatus();
```

## Local Development

### Using Node directly

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start
```

### Using Docker

```bash
# Build the Docker image
docker build -t crawl4ai-service .

# Run the container
docker run -p 10000:10000 crawl4ai-service
```