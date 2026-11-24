# Implantação na VPS (T-24)

Guia para colocar o Betel no ar numa VPS própria com Docker. Arquivos envolvidos:

| Arquivo | Papel |
|---|---|
| `docker-compose.prod.yml` | Serviços de produção: `caddy`, `web`, `api`, `postgres` e `backup` |
| `infra/caddy/Caddyfile` | HTTPS automático, cabeçalhos de segurança e roteamento (`/api/*` → API, o resto → frontend) |
| `database/backup/*.sh` | Backup diário, teste de restauração e restauração |
| `database/backup/verificar-integridade.sql` | Verificações feitas depois de restaurar |
| `.env.producao.example` | Modelo das variáveis de produção |

## 1. Pré-requisitos

- VPS Linux com Docker Engine e o plugin Compose (`docker compose version`).
- Portas 80 e 443 liberadas no firewall. A porta do Postgres **não** é publicada.
- Um domínio (ou subdomínio) com registro DNS `A`/`AAAA` apontando para a VPS. O Caddy pede o certificado ao Let's Encrypt na primeira subida, e isso só funciona com o DNS já propagado.
- Uma aplicação no portal do Discord (https://discord.com/developers/applications). Passo a passo completo em [`sso-discord.md`](sso-discord.md):
  - Em OAuth2, cadastre o redirect `https://<DOMINIO>/api/auth/discord/callback`.
  - Anote o Client ID e o Client Secret.
  - Anote o ID do servidor do grupo (modo desenvolvedor do Discord → clique direito no servidor → Copiar ID).

## 2. Primeira subida

```bash
git clone <repositório> betel && cd betel
```

```bash
cp .env.producao.example .env.producao
```

Preencha o `.env.producao`:

- `DOMINIO`: o domínio, sem `https://`.
- `POSTGRES_PASSWORD`: gere com `openssl rand -hex 24`. Use só letras e números, porque a senha entra na URL do banco.
- `SESSION_SECRET`: gere com `openssl rand -base64 48`.
- `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET` e `DISCORD_GUILD_ID`.
- `ADMIN_DISCORD_IDS`: o seu ID do Discord (e o de outros admins, separados por vírgula). Quem estiver aqui vira admin ao entrar.
- `DIVINE_PRIDE_API_KEY` (opcional): chave da API da Divine Pride. Com ela, o Diário de farm mostra o nome do item ao digitar o ID (D53). Sem ela, a busca usa só os itens já conhecidos.

Suba tudo:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.producao up -d --build
```

Ao subir, a API aplica as migrations pendentes e insere os dados iniciais (parâmetros v1, classes e itens), só se as tabelas estiverem vazias.

Confira:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.producao ps
```

```bash
curl -fsS https://<DOMINIO>/api/saude
```

Depois, entre em `https://<DOMINIO>` com o Discord. O primeiro acesso de quem está em `ADMIN_DISCORD_IDS` já tem papel de admin.

## 3. Backup

- O serviço `backup` roda `pg_dump` todo dia, no horário de `BACKUP_CRON` (em UTC; o padrão `0 7 * * *` corresponde a 04:00 em Brasília).
- Os arquivos ficam em `BACKUP_DIR` (padrão `./backups`), com nomes como `betel-AAAAMMDD-HHMMSS.dump`.
- Os `BACKUP_RETENCAO` mais recentes são mantidos (padrão 14).
- Um dump que o `pg_restore` não consegue ler é descartado e não entra na rotação.

Backup manual:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.producao exec backup sh /scripts/backup.sh
```

Ver os logs dos backups:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.producao logs backup
```

**Recomendação:** copie a pasta de backups para fora da VPS (outro servidor ou armazenamento em nuvem). Um backup que fica só na VPS se perde junto com ela. Isso não foi automatizado, porque depende de onde o grupo quer guardar as cópias.

## 4. Teste de restauração

O teste restaura um backup num banco **temporário**, roda as verificações de integridade e apaga o banco temporário. A produção não é tocada. Recomenda-se rodar uma vez por mês e depois de cada atualização.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.producao exec backup sh /scripts/testar-restauracao.sh
```

Sem argumento, usa o backup mais recente. Para testar outro, passe o caminho (`/backups/betel-....dump`).

As verificações são:

1. Todas as migrations estão completas.
2. Os triggers que impedem alterar o ledger e os parâmetros estão presentes.
3. O saldo da view é igual à soma dos lançamentos.
4. Em cada run válida, os lançamentos somam os pontos gerados.
5. Cada run estornada tem saldo líquido zero.

## 5. Restaurar a produção

Só em caso de perda de dados. Os passos são estes:

1. Teste o arquivo (seção 4).
2. Pare a API:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.producao stop api
   ```

3. Restaure. O script faz antes um backup do estado atual e recusa rodar sem a confirmação:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.producao exec backup sh /scripts/restaurar.sh /backups/betel-AAAAMMDD-HHMMSS.dump --substituir-producao
   ```

4. Suba a API:

   ```bash
   docker compose -f docker-compose.prod.yml --env-file .env.producao start api
   ```

## 6. Atualizar a versão

```bash
git pull
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.producao exec backup sh /scripts/backup.sh
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.producao up -d --build
```

As migrations novas são aplicadas quando a API sobe.

## 7. Segurança

- Só o Caddy expõe portas (80 e 443). API, frontend e banco ficam na rede interna do Compose.
- O Caddy envia HSTS, CSP, `X-Frame-Options: DENY`, `nosniff` e `Referrer-Policy`.
- A sessão usa cookie `HttpOnly`, `Secure` e `SameSite=Lax`, e o banco guarda só o HMAC do token. Requisições que alteram dados precisam vir do próprio domínio.
- O login simulado fica desligado em produção, em duas camadas: `AUTH_DEV_LOGIN=false` no Compose, e a API o recusa com `NODE_ENV=production`.
- Para trocar o `SESSION_SECRET`, edite o `.env.producao` e suba de novo. Todas as sessões são invalidadas e cada pessoa precisa entrar outra vez.

## 8. VPS compartilhada: sub-rota, Postgres existente e deploy pelo GitHub Actions

As seções acima descrevem uma VPS só para o sistema, com o Caddy nas portas 80 e 443. Esta seção cobre o outro caso: uma VPS que já tem nginx, outros sistemas e um Postgres rodando. Nela o sistema fica numa sub-rota de um domínio que já existe (por exemplo `https://eyes.exemplo.com/emptyvariable/`).

| Arquivo | Papel |
|---|---|
| `docker-compose.vps.yml` | `web` (só em `127.0.0.1`), `emptyvariable-api` e `emptyvariable-backup`. Sem Caddy e sem Postgres próprio |
| `.env.vps.example` | Modelo do `.env` dessa stack |
| `deploy/vps-deploy.sh` | Atualiza o código, faz backup, reconstrói e sobe a stack |
| `deploy/nginx/emptyvariable.conf` e `deploy/vps-nginx.sh` | Sub-rota no nginx do host |
| `.github/workflows/ci.yml` e `deploy.yml` | CI e deploy no runner self-hosted da VPS |

### 8.1 Banco

O sistema usa um banco e um usuário só dele dentro do Postgres que já roda na VPS. Crie os dois uma vez (troque `<contêiner>`, `<superusuário>` e a senha):

```bash
docker exec -i <contêiner> psql -U <superusuário> -d postgres -v ON_ERROR_STOP=1 <<'SQL'
CREATE ROLE emptyvariable LOGIN CREATEDB PASSWORD '<senha>';
CREATE DATABASE emptyvariable OWNER emptyvariable;
SQL
```

O `CREATEDB` existe para o teste de restauração, que cria e apaga um banco temporário. No `.env`:

- `DB_HOST`: o nome do contêiner do Postgres.
- `DB_NETWORK`: a rede Docker dele (`docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' <contêiner>`).
- `POSTGRES_DB`, `POSTGRES_USER` e `POSTGRES_PASSWORD`: os que você acabou de criar.

O banco passa a depender da stack dona desse Postgres: se ela apagar o volume, os dados do sistema vão junto. Por isso o serviço `emptyvariable-backup` continua fazendo o `pg_dump` diário em `BACKUP_DIR`.

### 8.2 Sub-rota

- `APP_ORIGIN`: só a origem do domínio compartilhado (`https://eyes.exemplo.com`).
- `APP_BASE_PATH`: a sub-rota (`/emptyvariable`). A API usa esse valor no redirect pós-login e no caminho dos cookies, e o frontend é compilado com `<base href="/emptyvariable/">`.
- No portal do Discord, cadastre o redirect `<APP_ORIGIN><APP_BASE_PATH>/api/auth/discord/callback`.
- `WEB_PORT`: uma porta livre em `127.0.0.1`.

Depois do primeiro deploy, publique a sub-rota no nginx do host, apontando para o arquivo do site que já atende o domínio:

```bash
deploy/vps-nginx.sh /etc/nginx/sites-enabled/<site>
```

O script instala `/etc/nginx/snippets/emptyvariable.conf`, acrescenta um `include` no bloco `server` do site e recarrega o nginx. Se o `nginx -t` falhar, ele desfaz as duas alterações. Se o dono do site reinstalar o arquivo dele, o `include` some e o script precisa rodar de novo.

O snippet não envia HSTS: essa política vale para o domínio inteiro e cabe ao sistema dono dele.

O snippet também responde 404 para `/api/integracao` vindo de fora. Essa API (seção do `INTEGRACAO_TOKEN`) é usada só por outros sistemas da mesma VPS, pela rede interna do Docker, e não precisa ficar exposta na internet.

### 8.3 Deploy

Na VPS, de dentro do clone (que guarda o `.env` e os backups):

```bash
deploy/vps-deploy.sh deploy
```

O script exige o clone sem alterações locais, busca a `origin/main` (ou `DEPLOY_REF`), faz um backup se a stack já estiver no ar, reconstrói as imagens e espera a API ficar saudável. `deploy/vps-deploy.sh status` mostra os contêineres e a saúde da API.

Pelo GitHub, o workflow **Deploy na VPS** roda esse mesmo script quando uma release é publicada ou quando alguém o dispara pela aba Actions (com uma tag ou um commit da `main`, se quiser). Um merge na `main` não implanta sozinho.

Os comandos de backup e restauração das seções 3 a 5 valem aqui trocando `-f docker-compose.prod.yml --env-file .env.producao` por `-f docker-compose.vps.yml`, e o serviço `backup` por `emptyvariable-backup`.

### 8.4 Runner self-hosted

O CI e o deploy rodam num runner do GitHub Actions instalado na própria VPS, com os rótulos `self-hosted`, `linux` e `empty-variable`. Para registrar (precisa ser admin do repositório para gerar o token em **Settings → Actions → Runners → New self-hosted runner**):

```bash
cd /dev-home/actions-runner/empty-variable
./config.sh --url https://github.com/<dono>/<repositório> --token <token> --name "$(hostname)-empty-variable" --labels empty-variable --unattended
sudo ./svc.sh install "$USER" && sudo ./svc.sh start
```

O usuário do runner precisa estar no grupo `docker`. A VPS não precisa de Node nem de Chrome: o CI baixa o Node com o `setup-node` e usa o Chromium do Playwright.

**Repositório público:** o workflow de um PR vindo de um fork é o do próprio fork, então a condição `if` do `ci.yml` não basta para impedir que código de terceiros rode na VPS. Em **Settings → Actions → General → Fork pull request workflows**, marque **Require approval for all external contributors** antes de registrar o runner.

O CI sobe as stacks com nome de projeto e portas próprios de cada execução e as derruba no fim, para não encostar na stack de produção que divide o mesmo Docker.

### 8.5 Datamine dos patches (D63)

Os relatórios dos patches do cliente publicados pelo `rolatam-dm` ficam em `DATAMINE_DIR` (`.env`; padrão `./datamine` no clone, melhor uma pasta fora dele, como os backups), montada em `/dados/datamine` na API. Cada patch é um subdiretório com `report.html` e `report.json` (uns 3 MB). O banco guarda só a identificação e o resumo (`patch_cliente`), então a pasta entra no plano de backup junto com o `BACKUP_DIR`.

A publicação usa `POST /api/integracao/datamine/patches` com o `INTEGRACAO_TOKEN`. Como o snippet do nginx responde 404 para `/api/integracao` vindo de fora, a máquina que minera abre um túnel até o contêiner web e publica por ele:

```bash
ssh -N -L 4200:127.0.0.1:4200 <vps>      # em outro terminal
BETEL_URL=http://127.0.0.1:4200 BETEL_TOKEN=<INTEGRACAO_TOKEN> python publish.py out/<stamp>
```

O snippet (`deploy/nginx/emptyvariable.conf`) ganhou uma `location` para `/api/datamine/`, sem os cabeçalhos gerais: o relatório abre num iframe da tela `/datamine/:id` e a própria API manda a política dele (`frame-ancestors 'self'`, `sandbox`). Depois de atualizar o clone, rode `deploy/vps-nginx.sh <site>` de novo para reinstalar o snippet. O contrato do endpoint está em `docs/integracao-datamine.md`.

