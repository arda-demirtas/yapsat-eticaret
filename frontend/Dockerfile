# Stage 1: Build static assets
FROM node:20-alpine AS builder

WORKDIR /app

# Install package dependencies using package-lock.json if available
COPY package*.json ./
RUN npm ci

# Copy code files and build
COPY . .
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:1.25-alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration for routing
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
