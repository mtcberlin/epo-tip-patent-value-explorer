# Stage 1: Install all dependencies and build
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
# /data needed during build: SvelteKit postbuild analysis imports the DB client
RUN mkdir -p /data && pnpm build

# Stage 2: Production dependencies only
FROM node:22-alpine AS prod-deps
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Stage 3: Production runtime
FROM node:22-alpine
WORKDIR /app
RUN mkdir -p /data && chown node:node /data

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY package.json ./

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1

USER node
CMD ["node", "build/index.js"]
