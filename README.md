# Betel: pontuação da Torre da Constelação

Sistema de pontuação por participação na instância Torre da Constelação ("Betel") do Ragnarok Online.

- **Regras de negócio e decisões aprovadas:** [`docs/DECISOES.md`](docs/DECISOES.md)
- **Análise da pontuação:** [`docs/analise/etapa1-pesos.md`](docs/analise/etapa1-pesos.md)
- **Arquitetura, tarefas e plano de testes:** [`docs/planejamento/`](docs/planejamento/)
- **Épico II (loja e estoque):** análise em [`docs/analise/epico2-loja.md`](docs/analise/epico2-loja.md) e planejamento em [`docs/planejamento/epico2.md`](docs/planejamento/epico2.md)
- **Épico III (Nebula):** análise em [`docs/analise/epico3-nebula.md`](docs/analise/epico3-nebula.md) e planejamento em [`docs/planejamento/epico3.md`](docs/planejamento/epico3.md)
- **Diretrizes do frontend (leitura obrigatória antes de mexer em `web/`):** [`docs/frontend/diretrizes.md`](docs/frontend/diretrizes.md)
- **Login com o Discord (SSO):** [`docs/sso-discord.md`](docs/sso-discord.md)
- **Implantação na VPS (HTTPS, backup, restauração, sub-rota e deploy pelo GitHub Actions):** [`docs/implantacao.md`](docs/implantacao.md)
- **Relatórios de QA:** Épico I em [`docs/qualidade/relatorio-final.md`](docs/qualidade/relatorio-final.md) , Épico II em [`docs/qualidade/relatorio-epico2.md`](docs/qualidade/relatorio-epico2.md) e Épico III em [`docs/qualidade/relatorio-epico3.md`](docs/qualidade/relatorio-epico3.md)

## Estrutura

O Angular inicia o login pelo backend. A camada `bot` fala com o Discord por OAuth2, e o backend valida o v?nculo com o servidor, cria a sess?o e aplica as permiss?es.

| Pasta              | Conteúdo                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------- |
| `packages/scoring` | Motor de cálculo puro (TypeScript, aritmética inteira). É a fonte da verdade da pontuação |
| `backend`          | API NestJS + Prisma: login com Discord, sessões, papéis, jogadores e vínculo (M2)         |
| `web`              | Frontend Angular + Material: login, vínculo, área do membro e fila de vínculos            |
| `tests/e2e`        | Testes ponta a ponta (Playwright) do fluxo completo                                       |
| `bot`              | Cliente OAuth2 do Discord consumido pelo backend, sem processo pr?prio.                   |
| `database`         | Schema Prisma, migra??es SQL, backup e verifica??o de integridade.                        |
| `infra/`           | Configuração do nginx                                                                     |

## Pré-requisitos

- Node.js 22 ou mais recente
- pnpm 9, via `corepack enable`
- Docker, opcional, para subir o ambiente completo

## Comandos

Instalar as dependências:

```bash
pnpm install --frozen-lockfile
```

Gerar o cliente do Prisma e compilar as depend?ncias do workspace:

```bash
pnpm --filter @betel/api prisma:generate
```

```bash
pnpm build
```

Rodar todos os testes:

```bash
pnpm test
```

Os testes da API usam Postgres de verdade. Sem a variável `TEST_DATABASE_URL`, eles sobem sozinhos um Postgres 16 local (pacote `embedded-postgres`), sem Docker. Com `TEST_DATABASE_URL`, usam esse banco, que precisa estar vazio.

Rodar só os testes do motor:

```bash
pnpm --filter @betel/scoring test
```

Rodar os testes ponta a ponta (precisam do build e do Google Chrome instalado):

```bash
pnpm build && pnpm e2e
```

Rodar lint e checagem de tipos:

```bash
pnpm lint && pnpm typecheck
```

Subir o ambiente com Docker (copie `.env.example` para `.env` antes):

```bash
docker compose up --build
```

Com o ambiente no ar, o frontend fica em http://localhost:4200 e a API em http://localhost:4200/api/saude. O cont?iner da API aplica as migra??es pendentes e inicializa os cat?logos. Veja tamb?m o [guia do banco](database/README.md).

## Login com Discord

1. Crie uma aplicação em https://discord.com/developers/applications.
2. Em OAuth2, cadastre o redirect `${APP_ORIGIN}/api/auth/discord/callback`.
3. Preencha no `.env`: `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_GUILD_ID` (servidor do grupo), `SESSION_SECRET` e `ADMIN_DISCORD_IDS` (quem vira admin ao entrar).

Escopos pedidos: `identify` e `guilds.members.read`. Não pedimos e-mail. Quem não é membro do servidor é recusado (D13).

Para desenvolver sem Discord, ligue `AUTH_DEV_LOGIN=true` (só funciona fora de `NODE_ENV=production`) e entre com `POST /api/auth/dev-login` enviando `{ "discordId": "...", "username": "..." }`.

## Desenvolvimento do frontend

`pnpm --filter @betel/web start` sobe o Angular em http://localhost:4200, com `/api` redirecionado para http://localhost:3000. Nesse caso, use `APP_ORIGIN=http://localhost:4200` na API.

> **Observação (Windows):** o repositório usa `node-linker=hoisted` (no `.npmrc`). Isso evita o limite de 260 caracteres de caminho do Windows, que impedia o esbuild de iniciar.

# Empty_Variable
