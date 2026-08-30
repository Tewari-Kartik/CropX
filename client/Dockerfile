# Stage 1: Build the Vite app
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package files first for layer caching
COPY package.json package-lock.json ./
RUN npm ci --silent

# Accept build-time API URL
ARG VITE_API_BASE_URL=http://localhost:3000/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Copy source and build
COPY . .
RUN npm run build

# Stage 2: Serve the built output with nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html

# SPA routing: redirect all 404s to index.html (React Router handles them)
RUN echo 'server { \
  listen 80; \
  root /usr/share/nginx/html; \
  index index.html; \
  location / { \
    try_files $uri $uri/ /index.html; \
  } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
