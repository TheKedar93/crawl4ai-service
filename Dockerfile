FROM node:18-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY server/package*.json ./
RUN npm install

# Copy server files
COPY server/ ./

# Ensure public directory exists
RUN mkdir -p ./public

# Copy static files
COPY server/public/ ./public/

# Add global undici polyfill (for Node.js <18)
RUN echo "global.ReadableStream = require('stream/web').ReadableStream;" > ./polyfill.js

# Expose the port
EXPOSE 3000

# Start the server with polyfill
CMD ["node", "--require", "./polyfill.js", "crawl-server.js"]