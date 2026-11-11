FROM node:22-alpine AS build
RUN npm install -g pnpm@12.9.1
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=acme-magazine-pnpm,target=/pnpm/store,sharing=locked pnpm install --store-dir=/pnpm/store --frozen-lockfile --ignore-scripts
COPY . .
RUN pnpm build && pnpm typecheck

FROM node:22-alpine
RUN npm install -g pnpm@12.9.1
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=acme-magazine-pnpm,target=/pnpm/store,sharing=locked pnpm install --store-dir=/pnpm/store --prod --frozen-lockfile --ignore-scripts
COPY --from=build /app/dist ./dist
COPY --from=build /app/server ./server
COPY --from=build /app/tsconfig.json ./
ENV NODE_ENV=production PORT=8790
USER node
EXPOSE 8790
CMD ["sh", "-c", "node --import tsx server/db/setup-magazine-db.ts && exec node --import tsx server/index.ts"]
