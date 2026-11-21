# Build a partir da raiz do monorepo: docker build -f backend/Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/scoring/package.json packages/scoring/
COPY packages/farm/package.json packages/farm/
COPY backend/package.json backend/
COPY bot/package.json bot/
RUN pnpm install --frozen-lockfile --filter @betel/api...
COPY packages/scoring packages/scoring
COPY packages/farm packages/farm
COPY backend backend
COPY bot bot
COPY database/prisma database/prisma
RUN pnpm --filter @betel/api prisma:generate && pnpm --filter @betel/scoring build && pnpm --filter @betel/farm build && pnpm --filter @emptyvariable/discord build && pnpm --filter @betel/api build

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build /repo/node_modules node_modules
COPY --from=build /repo/packages/scoring/package.json packages/scoring/
COPY --from=build /repo/packages/scoring/dist packages/scoring/dist
COPY --from=build /repo/packages/farm/package.json packages/farm/
COPY --from=build /repo/packages/farm/dist packages/farm/dist
COPY --from=build /repo/backend/package.json backend/
COPY --from=build /repo/backend/dist backend/dist
COPY --from=build /repo/backend/node_modules backend/node_modules
COPY --from=build /repo/database/prisma database/prisma
COPY --from=build /repo/bot/package.json bot/
COPY --from=build /repo/bot/dist bot/dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:3000/api/saude || exit 1
# Aplica as migrations pendentes (não destrutivo) e sobe a API.
WORKDIR /repo/backend
CMD ["sh", "-c", "node ../node_modules/prisma/build/index.js migrate deploy --schema ../database/prisma/schema.prisma && node dist/main.js"]
