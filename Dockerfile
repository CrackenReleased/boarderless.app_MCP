# Multi-stage build for a very small production image
FROM node:20-slim AS builder
WORKDIR /app
COPY functions.json ./
WORKDIR /app/remote-adapter
COPY remote-adapter/package*.json ./
RUN npm ci
COPY remote-adapter/tsconfig.json ./
COPY remote-adapter/src/ ./src/
RUN npx esbuild src/server.ts --bundle --outfile=dist/server.cjs --platform=node --format=cjs

FROM node:20-slim AS runner
WORKDIR /app
COPY functions.json ./
WORKDIR /app/remote-adapter
COPY remote-adapter/package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/remote-adapter/dist/server.cjs ./dist/
COPY remote-adapter/public/ ./public/
EXPOSE 8080
CMD ["node", "dist/server.cjs"]

