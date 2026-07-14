# Stage 1: Build the Vite frontend
FROM node:22-alpine AS builder
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml* ./

# Install dev & prod dependencies for build
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Run build (vite build & type check)
RUN pnpm build

# Stage 2: Final runner image
FROM node:22-alpine AS runner
RUN npm install -g pnpm

WORKDIR /app

# Copy dependency files
COPY package.json pnpm-lock.yaml ./
COPY pnpm-workspace.yaml* ./

# Install all dependencies (tsx, typescript, drizzle-kit are devDependencies but needed for runtime/migration)
RUN pnpm install --frozen-lockfile

# Copy build artifacts and server source
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/tsconfig.json /app/tsconfig.server.json ./
COPY --from=builder /app/drizzle.config.ts ./

# Copy entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

ENTRYPOINT ["/bin/sh", "docker-entrypoint.sh"]
