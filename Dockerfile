# Build stage: Bun compiles the SvelteKit app for the standalone Bun target.
# The build needs the dev dependencies (Vite, SvelteKit, Tailwind), so it is kept
# separate from the runtime image.
FROM oven/bun:1.4 AS build
WORKDIR /app

# Copy the lockfile first: this layer only rebuilds when dependencies change.
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
ENV BUILD_TARGET=node
RUN bun run build

# Runtime stage: only the adapter-node bundle. Bun ships `node:sqlite`, which the
# database layer needs (Bun >= 1.4 or Node >= 24).
FROM oven/bun:1.4-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOST=0.0.0.0 \
    DATABASE_PATH=/app/data/astrolife.db \
    BODY_SIZE_LIMIT=4M

COPY --from=build /app/build ./build

# Mount a volume (or the host's ./data) here to keep the crew between restarts.
# The directory is owned by the image's `bun` user (uid 1000) so both a named
# volume and a bind mount from a typical desktop user stay writable.
RUN mkdir -p /app/data && chown -R bun:bun /app/data
VOLUME ["/app/data"]

EXPOSE 3000

# `bun -e` is used instead of curl/wget: the slim image does not ship them.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["bun", "-e", "fetch('http://127.0.0.1:3000/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]

USER bun

CMD ["bun", "build/index.js"]
