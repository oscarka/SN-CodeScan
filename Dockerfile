# Build stage
FROM node:20-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Accept build arguments for baking into the static site
ARG ARK_API_KEY
ARG ARK_API_BASE
ARG ARK_MODEL

# Set environment variables for the build process
ENV ARK_API_KEY=${ARK_API_KEY}
ENV ARK_API_BASE=${ARK_API_BASE}
ENV ARK_MODEL=${ARK_MODEL}

# Build the application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Default Nginx config usually handles static files well, 
# but for SPA we usually need to redirect 404s to index.html.
# Since this is a simple single-page app without client-side routing, default is likely fine.
# But to be safe for future routing:
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
