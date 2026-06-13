FROM node:24-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build
RUN npm run build

# Production stage
FROM node:24-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --omit=dev

# Copy built files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/scripts ./scripts

# Expose port (default: 3372, configured via PORT env var)
EXPOSE ${PORT:-3372}

# Start application
CMD ["node", "dist/main.js"]
