FROM node:20-alpine

WORKDIR /app

# Install wget for health checks
RUN apk add --no-cache wget

# Install pnpm
RUN npm install -g pnpm@10.18.3

# Copy package files
COPY package.json ./
COPY tsconfig.json ./

# Install dependencies
RUN pnpm install

# Copy source code
COPY src ./src

# Build TypeScript
RUN pnpm run build

# Expose port
EXPOSE 3000

# Run the server
CMD ["node", "dist/server.js"]

