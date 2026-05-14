FROM node:22-slim AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the Vite configuration and source files
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY vite.config.ts ./
COPY index.html ./
COPY src/ ./src/

# Run the build script to compile the TypeScript code and bundle the application
RUN npm run build

# Stage 2: Runtime
FROM node:22-slim
WORKDIR /app

# Only copy the compiled output from stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 5173
CMD ["npx", "vite", "preview", "--port", "5173", "--host"]