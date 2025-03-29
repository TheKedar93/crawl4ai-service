FROM node:16-alpine

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

# Start the server
CMD ["npm", "start"]