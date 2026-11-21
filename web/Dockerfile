# Build a partir da raiz do monorepo: docker build -f web/Dockerfile .
FROM node:22-alpine AS build
RUN corepack enable
ENV NG_CLI_ANALYTICS=false
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc tsconfig.base.json ./
COPY packages/scoring/package.json packages/scoring/
COPY packages/farm/package.json packages/farm/
COPY packages/simulador/package.json packages/simulador/
COPY web/package.json web/
RUN pnpm install --frozen-lockfile --filter @betel/web...
COPY packages/scoring packages/scoring
COPY packages/farm packages/farm
COPY packages/simulador packages/simulador
COPY web web
# Sub-rota (ex.: /emptyvariable/) quando o sistema divide o domínio com outro. Padrão: raiz.
ARG BASE_HREF=/
RUN pnpm --filter @betel/scoring build && pnpm --filter @betel/farm build && pnpm --filter @betel/simulador build && pnpm --filter @betel/web build --base-href "$BASE_HREF"

FROM nginx:1.27-alpine
COPY infra/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /repo/web/dist/web/browser /usr/share/nginx/html
EXPOSE 80
