# Crawl4AI Service

A Node.js service that provides financial data crawling capabilities for the Stock Advisor AI application.

## Features

- Financial data crawling from Finviz and CapitolTrades
- REST API for easy integration with mobile and web apps
- Customizable crawling options
- Mock data generation for development and testing

## Directory Structure

```
├── server/             # Server-side Node.js code
│   ├── crawl-server.js # Express server implementation
│   ├── package.json    # Node.js dependencies
│   └── .gitignore      # Git ignore file
├── Dockerfile          # Docker configuration for deployment
├── render.yaml         # Render deployment config
├── .dockerignore       # Docker build exclusions
├── crawl4ai-client.ts  # TypeScript client for app integration
└── README.md           # This file
```

## Server API Endpoints

- `POST /api/crawl/finviz` - Crawl Finviz for stock data
- `POST /api/crawl/capitoltrades` - Crawl CapitolTrades for political trading data
- `POST /api/crawl` - General crawling with custom seed URLs
- `GET /api/crawl/status` - Check the status of the crawler

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

// Crawl Finviz for financial data
const finvizResults = await Crawl4AIClient.crawlFinviz();

// Crawl CapitolTrades for political trading data
const capitolTradesResults = await Crawl4AIClient.crawlCapitolTrades();

// Custom crawl
const customResults = await Crawl4AIClient.crawl([
  'https://example.com/finance',
  'https://example.com/stocks'
]);

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