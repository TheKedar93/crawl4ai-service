FROM node:18-slim

WORKDIR /app

# Copy package files first for better caching
COPY server/package*.json ./server/

# Install dependencies
RUN cd server && npm install

# Copy the rest of the application
COPY . .

# Environment variables
ENV NODE_ENV=production
ENV PORT=10000

# Expose the port
EXPOSE 10000

# Start the server
CMD ["npm", "--prefix", "server", "start"]