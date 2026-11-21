# Etapa 2: plano de tarefas do Épico I (PO, com dependências definidas pelo orquestrador)

**Status:** Épico I implementado (M0 a M6) em 2026-11-14. Falta a implantação real na VPS (ver "Progresso" e `docs/qualidade/relatorio-final.md`).

**Responsáveis:**
- BE = Agent 04 (Backend)
- FE = Agent 05 (Frontend)
- QA = Agent 06
- ARQ = Agent 03 (Arquiteto)

**Regra de coordenação:** cada tarefa tem um único responsável. O QA revisa todas as tarefas antes de marcá-las como concluídas.

## Marcos

| Marco | Entrega verificável |
|---|---|
| M0 Fundação | O repositório sobe com `docker compose up`, a CI passa e o banco é migrado |
| M1 Motor de cálculo | `packages/scoring` passa em 100% dos casos CT do plano de testes |
| M2 Identidade | Login com Discord funcionando, papéis e jogadores/personagens |
| M3 Cadastros | Classes e funções, parâmetros versionados e catálogo de itens, com seeds |
| M4 Runs e ledger | Registrar uma run gera os lançamentos corretos. Saldo e estorno funcionam |
| M5 Interfaces | Assistente de run e área do membro completos, com e2e |
| M6 Implantação | Sistema rodando na VPS com HTTPS e backup testado |

## Tarefas

| ID | Tarefa | Dono | Depende de | História |
|---|---|---|---|---|
| T-01 | Monorepo pnpm (`backend`, `web`, `packages/scoring`), lint, formatação e TS strict | ARQ | — | — |
| T-02 | Docker Compose para desenvolvimento (Postgres) e `.env.example` | BE | T-01 | — |
| T-03 | Pipeline de CI: lint, testes unitários e de integração (Postgres em contêiner), build | BE | T-01 | — |
| T-04 | Motor `calcularParticipacao` com aritmética inteira | BE | T-01 | US-03 |
| T-05 | Motor `dividirEmprestimos`: categorias, override, teto, redução proporcional e rejeição quando há override (D15) | BE | T-04 | US-05 |
| T-06 | Testes unitários e de propriedade do motor, conforme o plano de testes | QA | T-04, T-05 | US-03, US-05 |
| T-07 | Schema Prisma e migrations SQL: CHECKs e trigger que impede alterar `lancamento_pontos` | BE | T-02 | Todas |
| T-08 | Módulo `auth`: OAuth2 do Discord, verificação de membro do servidor (D13), sessão no Postgres, guards de papel, bootstrap do primeiro admin | BE | T-07 | — |
| T-09 | Módulo `jogadores`: CRUD, solicitação de vínculo e fluxo de aprovação (D12) | BE | T-07 | US-08 |
| T-10 | Módulo `classes`: CRUD, função padrão única, rank 1–5. Seed das classes aprovadas | BE | T-07 | US-01 |
| T-11 | Módulo `config-pontuacao`: versões imutáveis, consulta da versão vigente, seed v1 | BE | T-07 | US-02 |
| T-12 | Módulo `itens`: catálogo e seed dos itens da Torre | BE | T-07 | US-04 |
| T-13 | Módulo `ledger`: lançar, consultar saldo (view) e histórico. Estorno | BE | T-07 | US-06, US-07 |
| T-14 | Módulo `runs`: registro transacional (run, participações, empréstimos, drops, snapshot, lançamentos) | BE | T-05, T-09, T-10, T-11, T-12, T-13 | US-03, US-04, US-05 |
| T-15 | Corrigir run: estorna os lançamentos, marca a run como `ESTORNADA` e registra a nova run com `corrige_run_id` | BE | T-14 | US-07 |
| T-16 | Módulo `auditoria` (interceptor) | BE | T-08 | — |
| T-17 | Testes de integração da API: regras de domínio e autorização (403 para membro) | QA | T-14, T-15 | Todas |
| T-18 | Estrutura do Angular: layout, autenticação (guard e interceptor), Angular Material, PT-BR | FE | T-01, T-08 | — |
| T-19 | Telas de admin: classes, parâmetros, itens, jogadores e fila de vínculos | FE | T-18, T-09–T-12 | US-01, US-02, US-04, US-08 |
| T-19b | Tela `/vinculo`: reivindicação e status da solicitação | FE | T-18, T-09 | US-08 |
| T-20 | Assistente de run em 5 passos, com prévia dos pontos via `packages/scoring` | FE | T-18, T-14 | US-03, US-04, US-05 |
| T-21 | Lista e detalhe de runs, com ação Corrigir | FE | T-20, T-15 | US-07 |
| T-22 | Área do membro: somente o próprio saldo e histórico (D14), e os personagens | FE | T-18, T-13 | US-06 |
| T-23 | Testes e2e: login simulado, registro de run, consulta de saldo, correção | QA | T-20, T-21, T-22 | Todas |
| T-24 | Compose de produção (Caddy com HTTPS), backup diário e teste de restauração | BE | T-23 | — |
| T-25 | Validar os critérios de aceite de US-01 a US-07 e fazer o relatório final | QA | T-24 | Todas |

## Caminho crítico e paralelismo

- **Caminho crítico:** T-01 → T-07 → T-13 → T-14 → T-20 → T-23 → T-24 → T-25.
- **Paralelo depois do T-01:** a trilha do motor (T-04 → T-05 → T-06) avança independente do banco. É o item de maior risco de negócio, então convém validá-lo primeiro.
- **Paralelo depois do T-07:** T-10, T-11, T-12 e T-13 não dependem uns dos outros.
- **Bloqueios de negócio:** nenhum. D12 a D15 foram aprovadas.

## Fora do escopo desta etapa

- Loja e estoque (Épico II)
- Nebula (Épico III)
- Bot do Discord
- Ranking público
- Bônus pela pontuação de dificuldade do Betelgeuse: o campo é registrado, mas não é usado no cálculo

## Progresso

| Tarefa | Status | Evidência |
|---|---|---|
| T-01 Monorepo | ✅ Concluída | pnpm workspace com TS strict, ESLint e Prettier. `pnpm lint` e `format:check` passam |
| T-02 Compose dev | ⚠️ Concluída, mas não executada | `docker compose config` é válido. O `docker compose up` **não foi testado** porque o Docker Desktop não estava rodando |
| T-03 CI | ⚠️ Escrita, mas não executada | `.github/workflows/ci.yml` roda lint, formatação, build, typecheck, testes e `docker compose build`. Ainda não rodou: não há remoto Git |
| T-04 `calcularParticipacao` | ✅ Concluída | `packages/scoring/src/participacao.ts` |
| T-05 `dividirEmprestimos` | ✅ Concluída | `packages/scoring/src/emprestimos.ts` (inclui D9a e D15) |
| T-06 Testes do motor | ✅ Concluída | 84 testes passam: CT-01 a CT-51, CT-56, CT-59, CT-60, CT-64, CT-74, CT-75 e as propriedades P1–P11 e P13 |

**Marco M0, entregas adiantadas:** a API NestJS mínima (`GET /api/saude`, com teste de integração) e o Angular 19 mínimo (página que usa `@betel/scoring`, com teste) já existem. Os dois consomem o motor compartilhado.

### M2 Identidade (2026-11-14, branch `feat/m2-identidade`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-07 Schema e migrations | ✅ Concluída | `database/prisma/schema.prisma` e a migration inicial, com o schema completo do Épico I. O SQL manual tem os CHECKs, os índices únicos parciais, a FK composta do empréstimo (C3), os triggers que bloqueiam UPDATE/DELETE/TRUNCATE no ledger e UPDATE/DELETE em `config_pontuacao`, e a view `saldo_jogador`. `test/banco.test.ts`: CT-52, CT-56, CT-61, CT-68 e C5 |
| T-08 Auth | ✅ Concluída | OAuth2 com `state`, checagem de membro (D13), sessão no Postgres guardando só o HMAC do token, cookie httpOnly/Secure/Lax, expiração após 7 dias sem uso, checagem de `Origin`, guards de papel, bootstrap via `ADMIN_DISCORD_IDS`, promoção/rebaixamento com auditoria. `test/auth.test.ts`: CT-79, 401/403 |
| T-09 Jogadores e vínculo | ✅ Concluída | CRUD de jogadores e personagens (sem exclusão; personagem é desativado) e fluxo da D12. `test/vinculo.test.ts`: CT-76, CT-77 (também no índice do banco) e CT-78 (inclusive duas aprovações concorrentes) |
| T-18 Estrutura do Angular | ✅ Concluída | Angular Material, rotas com guards, interceptor de 401, PT-BR. `core/guardas.spec.ts` |
| T-19b Tela `/vinculo` | ✅ Concluída | Formulário, status pendente e motivo da rejeição. `paginas/paginas.spec.ts` |
| T-19 (parte) Fila de vínculos | ✅ Adiantada | `/admin/jogadores`: fila (aprovar/rejeitar com motivo) e cadastro de jogadores/personagens. Telas de classes, parâmetros e itens ficam no M3 |
| T-16 Auditoria | 🟡 Parcial | Tabela `auditoria` e serviço usados nas ações sensíveis (papéis, jogadores, vínculo). O interceptor genérico fica para depois |

**Verificação:** 43 testes de integração da API contra Postgres 16 real, 13 testes do Angular, lint, typecheck e build de produção. O fluxo completo foi testado no navegador com login simulado: membro solicita → admin aprova na fila → membro vê a área dele.

**Não verificado:** login com o Discord de verdade (precisa de uma aplicação OAuth cadastrada), `docker compose up` (Docker Desktop parado) e a CI (sem remoto Git).

**Decisões técnicas (não alteram regra de negócio):**
- Não é possível rebaixar ou desativar o último admin ativo, para o sistema não ficar sem administração.
- O apelido do jogador e o nome do personagem são únicos sem diferenciar maiúsculas. O nome do personagem tem até 23 caracteres (limite do jogo) e o apelido, de 2 a 32.
- Login simulado (`AUTH_DEV_LOGIN`) só para desenvolvimento e e2e (T-23); fica desligado com `NODE_ENV=production`.

### M3 Cadastros (2026-11-14, branch `feat/m3-cadastros`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-10 Classes | ✅ Concluída | CRUD de classes e funções, rank 1–5 (CT-56), no máximo uma função padrão (marcar outra desmarca a anterior), remoção só de função nunca usada em run. Seed com as classes aprovadas; o Magus fica sem padrão (D16). `test/cadastros.test.ts` |
| T-11 Parâmetros | ✅ Concluída | Versões imutáveis: alterar cria a próxima versão, a vigente é a maior, e o histórico é consultável. Validação pelo próprio motor (`validarConfig`). Seed v1 gerado a partir de `CONFIG_V1`. CT-59 e CT-60 |
| T-12 Itens | ✅ Concluída | Catálogo com tipo, ID no jogo e negociabilidade/vínculo em três estados (sim, não, desconhecido). Seed com os itens do Anexo A |
| T-19 Telas de admin | ✅ Concluída | `/admin/classes`, `/admin/parametros` (com prévia dos pontos pelo motor, antes de salvar) e `/admin/itens`. `paginas/cadastros.spec.ts` |

**Seeds:** rodam ao subir a API. Cada grupo (parâmetros, classes, itens) só é inserido se a tabela estiver vazia, então nunca duplica nem sobrescreve o que o admin mudou.

**Migration nova:** `20261114010000_cadastros_unicidade` torna únicos, sem diferenciar maiúsculas, o nome da classe, o nome da função dentro da classe e o nome do item.

**Verificação:** 59 testes de integração da API, 18 testes do Angular, 84 do motor, lint, typecheck e build. As três telas foram conferidas no navegador com os seeds reais.

**Dados que ficaram para o admin completar (não foram inventados):**
- O nome da classe Asceta no bRO não foi confirmado. O seed usa o nome internacional, "Soul Ascetic", e o admin pode renomear.
- O levantamento não traz os IDs dos 6 Pós de Talento nem do Fragmento de Talento. Os nomes desses itens são descritivos e devem ser conferidos no jogo.
- Visuais e cartas não entraram no seed, porque o levantamento não traz os nomes exatos.
- Negociável e vinculado à conta começam como "desconhecido" em todos os itens.

### M4 Runs e ledger (2026-11-14, branch `feat/m4-runs-ledger`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-13 Ledger | ✅ Concluída | `LedgerService`: lançar (sem valor zero, C5), estornar run, saldo pela view `saldo_jogador` e extrato com a origem detalhada. Rotas `GET /api/extrato/me`, `GET /api/extrato/:jogadorId` (o membro só vê o próprio, D14) e `GET /api/saldos` (admin) |
| T-14 Registro de run | ✅ Concluída | `POST /api/runs` numa única transação: run, participações com snapshot, empréstimos (com `pct_efetivo` para exibição, C2), drops e lançamentos. Os pontos vêm do motor. Aviso de redução proporcional na resposta (D9a, C11). Erros de regra do motor viram 422 com o código |
| T-15 Correção | ✅ Concluída | `POST /api/runs/:id/corrigir` com motivo: estorna os lançamentos (um ESTORNO por lançamento, apontando para o original), marca a run como `ESTORNADA` e registra a nova com `corrige_run_id`. Usa os parâmetros da run original (D17). Uma correção inválida não estorna nada |
| T-17 Testes de integração | ✅ Concluída | `test/runs.test.ts` (34 testes): CT-28, CT-29, CT-31, CT-35, CT-43, CT-47, CT-52 a CT-55, CT-57 a CT-59, CT-61 a CT-67, CT-69 a CT-75, CT-80, C3, C4, C5, C6 e C8. `test/banco.test.ts` cobre a CT-68 |

**Lançamentos de um empréstimo:** quem pegou emprestado recebe +P (participação) e −parcela (débito), e o credor recebe +parcela (crédito). O saldo é o mesmo da CT-63 (GX 160, X 40); o histórico mostra o P original e cada parcela, como a arquitetura (§3) define.

**Verificação:** 93 testes de integração da API contra Postgres real, 84 do motor e 18 do frontend, além de lint, typecheck e build.

**Fica para o M5:** as telas que usam estas rotas (assistente de run, lista e detalhe de runs, saldo e histórico na área do membro).

### M5 Interfaces (2026-11-14, branch `feat/m5-interfaces`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-20 Assistente de run | ✅ Concluída | `/admin/runs/nova`, em 5 passos (dados → participantes → empréstimos → drops → revisão). Mostra as pendências de cada passo (CT-52, D16, CT-61). Na revisão, a prévia por participante e por jogador é calculada pelo mesmo motor da API, e os erros do motor (D15) aparecem antes do envio. `core/runs.ts` e `core/runs.spec.ts` |
| T-21 Lista e detalhe | ✅ Concluída | `/admin/runs` (filtros por período, chefe e status) e `/admin/runs/:id` (participações, empréstimos, drops, lançamentos e soma). A ação Corrigir abre o assistente em `/admin/runs/:id/corrigir`, pré-preenchido com a run e usando os parâmetros dela (D17), com motivo obrigatório |
| T-22 Área do membro | ✅ Concluída | `/me` com saldo, histórico (a origem de cada lançamento: classe, função, rank, peso, multiplicadores, fração e parcelas) e personagens. Admins têm `/admin/saldos`, com o histórico de qualquer jogador (D14) |
| T-23 Testes e2e | ✅ Concluída | `tests/e2e` com Playwright e o Chrome instalado. `servidor.mjs` sobe Postgres, API (login simulado) e frontend. O fluxo testado: vínculo aprovado → run registrada pelo assistente (Ana 300, Beto 160, Xavi 40) → membro vê o saldo de 300 e não acessa runs (CT-E4) → correção para Cardeal → saldo de 200, com o estorno no histórico |

**Comando:** `pnpm build` e depois `pnpm e2e`. A CI ganhou o job `e2e`, com Postgres de serviço.

**Verificação:** 4 testes e2e, 24 testes do Angular, 93 da API e 84 do motor, além de lint, typecheck e build.

**Ajuste de build:** o aviso de tamanho do bundle inicial subiu de 500 kB para 600 kB, por causa do menu do Angular Material na barra superior (o build passava de 504 kB). O limite de erro continua em 1 MB.

### M6 Implantação (2026-11-14, branch `feat/m6-implantacao`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-24 Produção, backup e restauração | ⚠️ Pronta, mas não executada | `docker-compose.prod.yml`: Caddy com HTTPS automático e cabeçalhos de segurança (HSTS, CSP, frame-ancestors); só as portas 80 e 443 ficam expostas. Serviço `backup`: `pg_dump` diário validado, com retenção de 14. `testar-restauracao.sh` restaura num banco temporário e roda `verificar-integridade.sql`; `restaurar.sh` faz um backup do estado atual antes e exige confirmação explícita. Guia em `docs/implantacao.md`. Validação: `docker compose config`, `sh -n` e as consultas de integridade testadas contra Postgres real (`integridade-backup.test.ts`, 3 testes). A execução real fica com o novo job `producao` da CI |
| T-25 Validação e relatório | ✅ Concluída | `docs/qualidade/relatorio-final.md`: todos os critérios de US-01 a US-08 mapeados para testes que passam; desvios e itens não verificados listados |

**Ajuste no frontend:** o build de produção não embute mais o CSS crítico (`inlineCritical: false`). O carregamento assíncrono que o Angular usa depende de um `onload` inline, que a CSP sem `'unsafe-inline'` em scripts bloquearia.

**Não verificado neste ambiente:** o Docker Desktop não iniciou, então a stack de produção, o Caddy e os scripts de backup não rodaram de fato. A CI (sem remoto) e o login com Discord real também ficaram de fora.

### Épico II, M7 Estoque e preços (2026-11-14, branch `feat/m7-estoque`)

Planejamento em `docs/planejamento/epico2.md`.

| Tarefa | Status | Evidência |
|---|---|---|
| T-26 Migration | ✅ Concluída | `20261114020000_epico2_loja_estoque`: tabelas de preço, config da loja, lotes, movimentos, compras, linhas de compra e ofertas; CHECKs de coerência; imutabilidade de preços, config e movimentos; trigger "lote nunca negativo"; índice único "um drop entra uma vez"; view `saldo_lote` |
| T-27 Estoque | ✅ Concluída | `EstoqueService`: entrada manual (lote novo por entrada, D27), drops da run (D18, só itens elegíveis, run estornada recusada), ajustes com motivo, resumo com reserva (D26), lotes e movimentos com filtros. `test/estoque.test.ts`: CT-87, CT-88, CT-95, CT-98, CT-104 e CT-105 |
| T-28 Preços e parâmetros | ✅ Concluída | Preço versionado por item (D21), `config_loja` versionada com seed v1 de taxa 0% (D22), reserva e limite no item (D24, D26) com validação na API e no banco |
| T-29 Telas | ✅ Concluída | `/admin/estoque` (resumo, entrada, ajuste e movimentos); colunas Loja, Preço, Reserva e Limite em `/admin/itens`; taxa da loja em `/admin/parametros`; botão "Lançar drops no estoque" no detalhe da run. Conferidas no navegador |

**Verificação:** 113 testes da API (17 novos), 26 do frontend (2 novos), 84 do motor e 4 e2e, além de lint, typecheck e build. A verificação de integridade do backup ganhou as checagens do estoque.

### Épico II, M8 Loja e compras (2026-11-14, branch `feat/m8-loja`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-30 Compra | ✅ Concluída | `LojaService.comprar` numa transação: trava o comprador e os lotes, confere elegibilidade e preço vigente, consome os lotes por ordem de chegada pulando os do comprador (D27), preserva a reserva do grupo (D26), aplica o limite do período e o saldo (D24), grava a compra, as linhas, a baixa no estoque e o `COMPRA`. A vitrine mostra o disponível por membro e o limite restante |
| T-31 Entrega e cancelamento | ✅ Concluída | Entrega só pelo admin; **o vendedor consignado recebe na entrega (D28)**, com o valor e a taxa gravados na compra. Cancelamento antes da entrega pelo membro (as próprias compras) ou pelo admin (com motivo): estorno, devolução ao lote e reabertura da oferta esgotada |
| T-32 Extrato | ✅ Concluída | Os lançamentos `COMPRA` e `VENDA` trazem a compra (item, quantidade, preço e comprador) e aparecem descritos em `/me` |
| T-33 Telas | ✅ Concluída | `/loja` no layout do design (menu de categorias, grade de cartões, detalhes ao passar o mouse ou focar, painel de compra com o saldo previsto), `/loja/compras` com cancelamento e `/admin/compras` (fila das mais antigas, entrega, cancelamento com motivo, alerta de pendência há 2 ou mais dias). Conferidas no navegador |
| Tema | ✅ Concluído | Paleta #ccfbda, #b4e2c2, #9cc9aa, #83af91 e #6b9679 no sistema inteiro (tokens do Material em `styles.scss`). Texto e ações usam tons mais escuros do mesmo verde (#10261a, #2d4a38, #2f5a3e) para atingir o contraste AA, porque #6b9679 sobre #ccfbda dá só ~3:1 |

**Testes:** `test/loja.test.ts` (20): CT-81 a CT-86, CT-89, CT-90, CT-94, CT-96 a CT-101, CT-103, CT-106 a CT-108, D28 e o cancelamento pelo admin com motivo. Inclui as concorrências reais (duas compras simultâneas do mesmo membro e duas pessoas disputando a última unidade).

### Épico II, M9 Ofertas e consignação (2026-11-14, branch `feat/m9-ofertas`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-34 Ofertas | ✅ Concluída | `OfertasService`: criar (só item elegível, sem preço: C12), aprovar ao receber o item (vira lote consignado), rejeitar com motivo, retirar (uma pendente sai na hora; uma aprovada para de vender) e concluir a retirada (baixa o restante; só sem compras pendentes do lote). `test/ofertas.test.ts` (9 testes) |
| T-35 Consignação | ✅ Concluída | Crédito ao vendedor na entrega (D28), feito no M8. Validado de ponta a ponta |
| T-36 Telas | ✅ Concluída | `/loja/ofertas` (nova oferta, situação, motivo e retirada) e `/admin/ofertas` (fila com aprovar, rejeitar e concluir retirada). "Minhas ofertas" no menu da loja |
| T-37 e2e | ✅ Concluída | `tests/e2e/testes/loja.spec.ts`: o admin libera e precifica um item; o membro compra pela vitrine, com o detalhe ao passar o mouse; outro membro oferece; o admin aprova; a compra consignada é entregue; o vendedor recebe; um cancelamento devolve os pontos |
| T-38 Relatório | ✅ Concluída | `docs/qualidade/relatorio-epico2.md` |
| Tema | ✅ Concluído | Tema escuro e frio (preto e cinzas azulados com acento verde-acinzentado), com tokens semânticos em `styles.scss`. Conferido no navegador na loja, nas ofertas e no estoque |

**Verificação:** 142 testes da API, 32 do frontend, 84 do motor e 8 e2e passando.

### Épico III, M10 Receitas e disponibilidade (2026-11-15, branch `feat/m10-receitas`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-39 Migration e seeds | ✅ Concluída | `20261115000000_epico3_nebula`: tabelas `receita`, `receita_componente`, `receita_peca`, `preco_receita` e `solicitacao_nebula`, enum `NEBULA`, CHECKs à prova de nulo, uma peça-base por receita, preço imutável (trigger) e o CHECK do `movimento_estoque` refeito. O seed renomeia os pós para os nomes oficiais, cadastra as 3 Astrais e as 6 Nebulosas e semeia as 9 receitas da browiki **inativas** ("a validar"). Se algum item da fonte faltar no catálogo, o seed só avisa e tenta de novo no próximo boot, sem derrubar a API |
| T-40 Módulo `receitas` | ✅ Concluída | `ReceitasService` e `ReceitasController` (só admin): listar, detalhe, criar, alterar (nome, ativa, solicitável e limite D35), substituir componentes (bloqueado com solicitação pendente; a receita da peça precisa produzir o item da peça-base) e preços versionados com os dois valores (D32). Ativar uma receita solicitável exige preço |
| T-41 Disponibilidade | ✅ Concluída | `calcularDisponibilidade` (função pura): trazendo a peça e com a peça do estoque, usando primeiro as peças prontas e fabricando o resto, com os Fragmentos disputados entre a Nebulosa e a Astral. Considera só o estoque do grupo, incluindo a reserva (D33), e devolve as faltas por item |
| T-42 Tela | ✅ Concluída | `/admin/receitas` (menu Cadastros): selo ativa, "a validar" ou sem preço, fonte, componentes com o estoque do grupo, editor de componentes com peça-base e receita da peça, disponibilidade nas duas modalidades, nova versão de preço, limite e "Validei, ativar". Conferida no navegador |

**Testes:** `test/disponibilidade.test.ts` (7, CT-109, CT-121 a CT-123), `test/receitas.test.ts` (CT-109 a CT-111, CT-123 e CT-125) e o seed em `test/cadastros.test.ts`, incluindo o item da fonte fora do catálogo; `features/nebula/data/receitas.modelos.spec.ts` no frontend.

**Verificação:** 162 testes da API (20 novos), 34 do frontend (2 novos), 84 do motor e 8 e2e passando, além de lint, typecheck, build e Prettier. Na conferência no navegador apareceu um defeito, já corrigido: as pendências do editor de componentes não se atualizavam ao editar.

### Layout do design no sistema inteiro (2026-11-15, branch `feat/m11-nebula`)

Pedido do usuário durante o M11: aplicar o layout da imagem da loja a todo o sistema, com cartões também nos personagens da party, e cores frias puxando para o cinza e o preto.

| Item | Evidência |
|---|---|
| Shell | Barra superior com o logo, a busca da loja, "Seu saldo" (`GET /api/saldo/me`) e o avatar; menu lateral com ícones. Na loja, o menu abre as categorias; na Nebula, "Minhas solicitações". Em telas estreitas, o menu vira uma faixa rolável |
| Cartões | Classes globais (`.cartao-b`, `.grade-cartoes`, `.chips`) e o componente `app-icone`. Usados na loja (com os chips Todos, Disponíveis e Consignados), na Nebula, nos personagens da party e nos drops da run, e em "Meus personagens" |
| Cores | Paleta Empty Variable (fundo `#040017`, acento orquídea, auroras azul, violeta e magenta; ver `docs/frontend/diretrizes.md` §2); tons de identidade por item e por classe (`shared/dominio/visual.ts`, tokens `--tom-*`) |

### Épico III, M11 Solicitação de Nebula (2026-11-15, branch `feat/m11-nebula`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-43 Solicitar | ✅ Concluída | `NebulaService.solicitar` numa transação: trava o jogador e os lotes do grupo em ordem de item; confere a receita ativa e o preço vigente (D32) e o limite (D35); escolhe a peça trazida, pronta ou fabricada (D31); baixa por ordem de chegada (D27), incluindo a reserva (D33); confere o saldo; grava a solicitação, os movimentos e o lançamento `NEBULA` |
| T-44 Entregar, cancelar, rejeitar | ✅ Concluída | Entrega pelo admin. Cancelamento pelo membro (as próprias) e rejeição pelo admin com motivo (D36), com estorno e devolução ao lote de origem. Fila do admin e histórico do membro; o extrato descreve a Nebula |
| T-45 Telas | ✅ Concluída | `/nebula` (cartões, detalhes ao passar o mouse, painel com tenho/preciso, "Trago minha peça Astral", preço e saldo), `/nebula/solicitacoes` e `/admin/nebula` (fila com os materiais por lote, filtros, entregar e rejeitar). Conferidas no navegador |
| T-46 Testes | ✅ Concluída | `test/nebula.test.ts` (17): CT-109 a CT-128, com as concorrências reais. E2e `tests/e2e/testes/nebula.spec.ts` (3) |
| T-47 Relatório e integridade | ✅ Concluída | `docs/qualidade/relatorio-epico3.md`. A verificação de integridade do backup ganhou as checagens 8 a 10 (pontos e estoque da Nebula, trigger dos preços das receitas), com teste |

**Verificação:** 180 testes da API, 40 do frontend, 84 do motor e 11 e2e passando, além de lint, typecheck, build e Prettier.

### Painéis, M12 Papéis (2026-11-15, branch `feat/m12-papeis`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-48 Papel de gestor | ✅ Concluída | Migration `20261116000000_papel_gestor` (enum `Papel` ganha `GESTOR`, aditiva). `GuardaPapeis`: o ADMIN passa em tudo (D37). Runs, saldos, jogadores e vínculos, classes, parâmetros de pontuação, receitas e a leitura do catálogo de itens passam para `@Papeis("GESTOR")`. Estoque, itens (alterações), preços e taxa da loja, compras, ofertas, entregas da Nebula, "lançar drops no estoque" e usuários continuam só do admin |
| T-49 Usuários e papéis | ✅ Concluída | `PATCH /api/usuarios/:id` aceita `GESTOR`. O papel de quem está em `ADMIN_DISCORD_IDS` não muda pela tela, e ninguém rebaixa ou desativa a si mesmo (409). `GET /api/usuarios` informa `papelFixo`. Tudo auditado (D38) |
| T-50 Pendências por painel | ✅ Concluída | `GET /api/painel/gestao` (vínculos pendentes, receitas a validar, runs da semana, maiores saldos) e `GET /api/painel/admin` (compras e Nebulas a entregar, ofertas a analisar, itens sem conferência), com a pendência mais antiga de cada fila |
| Frontend mínimo | ✅ Concluída | Menu com as seções Gestão (gestor e admin) e Administração (admin); `gestorGuard` nas telas de gestão; tela `/admin/usuarios` para definir papéis; a taxa da loja e "Lançar drops no estoque" só aparecem para o admin; depois do login, o admin vai para o Estoque e o gestor para as Runs. Conferido no navegador: o admin promove pela tela e a gestora só vê a Gestão |

**Testes:** `test/papeis.test.ts` (9): CT-129 a CT-135 e CT-138, com a matriz de rotas completa por papel. Frontend: guardas por papel e as travas da tela de usuários.

**Verificação:** 193 testes da API, 46 do frontend e 11 e2e passando, além de lint, typecheck, build e Prettier. O modo cartão das tabelas passou a aceitar células com mais de um elemento (rótulo à esquerda e o conteúdo fluindo).

### Painéis, M13 Painéis e páginas (2026-11-15, branch `feat/m13-paineis`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-51 Shell e rotas | ✅ Concluída | Seletor de painel na barra (**Cliente · Gestão · Administração**, só os do papel; o membro comum não vê). Menu lateral só com o painel ativo, que vem da URL (`painelDaUrl`). Telas de gestão em `/gestao/…`; as URLs antigas `/admin/runs…`, `/admin/saldos`, `/admin/jogadores`, `/admin/classes`, `/admin/parametros` e `/admin/receitas` redirecionam, mantendo o id (CT-136). Depois do login: admin → `/admin`, gestor → `/gestao`, membro → `/me`. No celular, o seletor desce para uma segunda linha |
| T-52 Telas iniciais | ✅ Concluída | `/gestao`: vínculos a aprovar, receitas a validar, runs da semana e maiores saldos. `/admin`: compras e Nebulas a entregar, ofertas a analisar e itens a conferir, com "esperando há N dias" e destaque a partir de 2 dias. Cada cartão leva à fila. A taxa da loja virou a tela `/admin/taxa` |
| T-53 Padrão das páginas | ✅ Concluída | Componentes `app-como-funciona` (explicação recolhida) e `app-painel-lateral` (formulário à direita; fecha no X, no fundo ou com Esc). Cabeçalho com a ação principal à direita. Abas: Estoque (Resumo · Movimentos), Jogadores (Solicitações · Jogadores), Parâmetros (Vigente · Histórico). Formulários no painel lateral: entrada e ajuste de estoque, novo item, novo jogador, nova classe, nova versão de parâmetros e nova oferta. Filtros em chips: Compras e Ofertas (situação), Itens (Catálogo · Loja · A conferir), Receitas (Nebulosas · Peças Astrais · Só a validar) |
| T-54 Testes e docs | ✅ Concluída | E2e `paineis.spec.ts` (3): o admin abre na Administração com os três painéis, promove o Gil a gestor pela tela, e o gestor abre na Gestão sem acesso à Administração. E2e da run entra por uma URL antiga e confere o redirecionamento. Specs: painel pela URL, espera e atraso das pendências, taxa em pontos-base, item a conferir e guardas por papel |

**Desvios do plano (§5), por boa razão:**
- Itens e Receitas usam **chips**, não abas: a mesma tabela troca de colunas (Catálogo · Loja) ou de filtro, sem duplicar a página.
- Na Minha área, a tabela de pontos por rank foi para o bloco recolhido "Quantos pontos vale cada rank", em vez de uma aba: é material de consulta, e a página fica com o extrato e os personagens.

**Verificação:** 193 testes da API, 50 do frontend e 14 e2e passando, além de lint, build e Prettier. No navegador: as 17 rotas de gestão e administração e as 6 do cliente, em 375 px, sem nenhuma barra de rolagem; entrada de estoque pelo painel lateral (o menu suspenso abre por cima do painel, que fecha ao salvar); troca de painel pelo seletor; o membro cai em `/me`, sem seletor, e `/gestao` o devolve.

### Épico IV, M14 Imagens do jogo (2026-11-16, branch `feat/m14-imagens`)

| Tarefa | Status | Evidência |
|---|---|---|
| T-55 Cache de imagens | ✅ Concluída | Migration `20261117000000_imagem_cache` (tabela `imagem_cache`, CHECK de coerência). `GET /api/imagens/item/:idJogo?tipo=icone\|ilustracao` (exige sessão): busca uma vez na Divine Pride (timeout de 5 s, até 512 KB, só `image/*`), guarda os bytes e serve do cache com `Cache-Control` de 7 dias. "Não existe" (404 deles) fica guardado e é revisto após 7 dias; falha de rede não entra no cache. Pedidos simultâneos do mesmo ID viram uma busca só. ID e tipo validados antes de qualquer chamada externa. Nos testes, a Divine Pride é um dublê: nenhum teste sai para a internet |
| T-56 Imagens nas telas | ✅ Concluída | Componente `app-imagem-item`: ícone ou ilustração do jogo quando o item tem ID; senão, ou se a imagem falhar, o ícone desenhado. Na loja e na Nebula (ilustração no cartão), nos drops da run e nas tabelas de estoque e itens (ícone). A API passou a devolver o `idJogo` nessas respostas. Prévia do ID no cadastro de item, buscada só 600 ms depois de parar de digitar (não varre IDs, como a Divine Pride pede). Crédito no rodapé: "Imagens: Divine Pride · Ragnarok Online © Gravity" |

**Testes:** `test/imagens.test.ts` (8): CT-139 a CT-141, a ilustração com cache próprio, o "não existe" revisto após 7 dias, a busca única para pedidos simultâneos e o 401 sem sessão. Frontend: endereço da imagem e a volta ao ícone desenhado quando a imagem falha.

**Verificação:** 201 testes da API, 52 do frontend e 14 e2e passando, além de lint, build e Prettier. No navegador, com a Divine Pride de verdade: ilustrações das Almas e do Fragmento na loja, ícones nas tabelas, prévia do ID 501 no cadastro, e digitar "607" gerou uma busca só.

### Épico IV, M15 Instâncias (2026-11-18)

| Tarefa | Status | Evidência |
|---|---|---|
| T-57 Dados e migração | Concluída | `20261118000000_instancias`: Torre v1, encontros, funções e vínculo das runs com a versão da instância. |
| T-58 Motor | Concluída | O motor recebe o multiplicador do encontro em centésimos e preserva a aritmética da pontuação. |
| T-59 API | Concluída | Cadastro, ativação e versões protegidos por papel. Registro e correção identificam a instância e a versão. |
| T-60 Web | Concluída | Gestão de instâncias, encontros e funções. O assistente da run carrega os encontros e funções da instância escolhida. |
| T-61 QA | Concluída | `backend/test/instancias.test.ts`, `tests/e2e/testes/instancias.spec.ts` e verificações de integridade. |

O cenário de navegador confirma que uma instância sem funções não pode ser ativada, que instâncias inativas não aparecem no assistente, que a run da v2 gera 300 pontos e preserva seu histórico, e que a correção usa a v3 da mesma instância, gera 185 pontos e estorna a v2.
