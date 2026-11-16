# Build stage: Bun compiles the SvelteKit app for the standalone Node/Bun target.
FROM oven/bun:1.4 AS build
WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV BUILD_TARGET=node
RUN bun run build

# Runtime stage: the adapter-node bundle runs on Bun, which provides node:sqlite.
FROM oven/bun:1.4-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/app/data/astrolife.db \
    BODY_SIZE_LIMIT=4M

COPY --from=build /app/build ./build
RUN mkdir -p /app/data
VOLUME ["/app/data"]
EXPOSE 3000

CMD ["bun", "build/index.js"]
