# Production Dockerfile for Presales Monitoring Backend

FROM node:18-alpine

WORKDIR /usr/src/app

# Copy package descriptors first to cache layer
COPY package.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy all source files
COPY . .

# Expose port
EXPOSE 5000

# Set production environment
ENV NODE_ENV=production
ENV PORT=5000

# Run backend service
CMD ["node", "server.js"]
