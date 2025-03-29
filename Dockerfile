FROM node:18.19.1-alpine3.18

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

# Expose the port
EXPOSE 3000

# Start the server with polyfill preloaded
CMD ["node", "crawl-server.js"]