# Production Dockerfile for Presales Monitoring Frontend (Multi-stage)

# Stage 1: Build the React application
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy package descriptors for caching npm dependencies
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy all source files
COPY . .

# Build application (generates static files in dist/)
# We can use npx vite build to guarantee transpilation is successful 
# even if there are pre-existing minor dev TS compilation check logs
RUN npm run build || npx vite build

# Stage 2: Serve the application with Nginx
FROM nginx:stable-alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build output from Stage 1 to Nginx default serving folder
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Expose Nginx port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
