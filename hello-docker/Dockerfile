# Two-stage build: TypeScript must be compiled to JavaScript before running.
# Stage 1 compiles the source. Stage 2 copies only the compiled output,
# Final image only has compiled JS.
# Keeps image lean by excluding the TypeScript compiler and source files.

# Stage 1: Build
FROM node:24-slim AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and compile
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Stage 2: Runtime
FROM node:24-slim
WORKDIR app

# Only copy the compiled output from stage 1
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080
CMD ["node", "dist/index.js"]