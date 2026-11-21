# Épico V: Diário de farm

**Status:** implementado em 2026-11-20 (branch `feat/diario-farm`).

**Base:**
- Pedido do usuário (2026-11-20): trazer para o Empty Variable o artefato "Diário de Instâncias", que controla o farm diário, semanal e mensal de instâncias, integrado ao login do Discord e sem perder o artefato.
- Decisões D48 a D54 em `docs/DECISOES.md`.

---

## 1. O que é

Cada membro vinculado registra as instâncias que faz, os itens que dropam e por quanto vende (opcional). Todo dia ele faz o check-in do que fez por personagem; a instância fica verde até a recarga liberar. Os totais mostram o que foi farmado no dia, na semana e no mês.

É uma ferramenta pessoal (D48): não gera pontos, não mexe na loja nem no estoque do grupo, e ninguém além do próprio membro vê os dados.

## 2. Dados (migration `20261122000000_diario_farm`)

Tabelas novas, sem alterar as existentes. Tudo pertence a um `usuario` (a conta do Discord).

| Tabela | Conteúdo |
|---|---|
| `farm_instancia` | Instância da lista pessoal: nome, recarga (`DIARIA`, `TRES_DIAS`, `SEMANAL`, `MENSAL`), ligação opcional com a `instancia` do catálogo (D50) e `ativa` |
| `farm_instancia_personagem` | Quais personagens do vínculo fazem a instância (D49) |
| `farm_item` | Item do membro: nome, ID do jogo (imagem e nome pela Divine Pride) e preço em zeny (D52) |
| `farm_instancia_drop` | Itens que a instância costuma dropar, em ordem |
| `farm_checkin` | Uma run: personagem, instância, quando, e `id_externo` (id do check-in no artefato, para importar sem duplicar) |
| `farm_checkin_drop` | Quantidade de cada item na run (> 0) |
| `nome_item_divine_pride` | Cache dos nomes buscados na Divine Pride por ID (D53) |

Regras em SQL: nomes únicos por usuário sem diferenciar maiúsculas, preço ≥ 0, ID do jogo > 0 e quantidade > 0. Instância com check-ins não é apagada, só desativada; item com check-ins não pode ser excluído.

## 3. Recarga (`packages/farm`, D51)

Pacote puro, usado pela API (para recusar check-in repetido) e pelo site (para pintar os cards), como o `packages/scoring`.

- **Dia do jogo:** horário de Brasília (UTC-3), virando às 04:00. 03:59 de quinta ainda é quarta.
- **Diária:** libera no dia seguinte.
- **A cada 3 dias:** libera no dia do check-in + 3. Feita na quinta, libera no domingo às 04:00.
- **Semanal:** libera na segunda-feira seguinte às 04:00.
- **Mensal:** libera no dia 1 do mês seguinte às 04:00.
- **Totais:** dia, semana (segunda a domingo) e mês, pelos mesmos dias do jogo.

## 4. API (`/api/farm`, exige sessão)

| Rota | O que faz |
|---|---|
| `GET estado` | Personagens do vínculo, instâncias ativas, itens e os check-ins que ainda podem bloquear uma recarga |
| `GET checkins?de&ate` | Check-ins de um período (até 400 dias) para os totais |
| `GET catalogo-instancias` | Instâncias do catálogo do grupo, com a recarga sugerida |
| `GET itens/busca?q` | Itens do membro, do catálogo e da Divine Pride (D53) |
| `POST/PATCH/DELETE instancias` | Cadastro das instâncias e de quem faz |
| `POST/DELETE instancias/:id/drops` | Itens que a instância costuma dropar (cria o item pelo nome) |
| `POST/PATCH/DELETE itens` | Itens, ID do jogo e preço |
| `POST checkins` | Check-in com drops; 409 se a instância já foi feita no ciclo |
| `PATCH/DELETE checkins/:id` | Editar os drops e desfazer |
| `POST importar` | Importação do backup do artefato (D54) |

Todo id recebido é conferido contra o usuário da sessão; o que é de outra pessoa responde 404 ou 400. Sem vínculo aprovado, o estado vem vazio e as escritas respondem 403.

**Divine Pride (D53).** Com `DIVINE_PRIDE_API_KEY`, digitar um ID na busca consulta `GET /api/database/Item/{id}?apiKey=...` (servidor no cabeçalho `x-server`, padrão `LATAM`, configurável em `DIVINE_PRIDE_SERVER`). Cada ID é buscado uma vez e guardado; ID desconhecido é revisto depois de uma semana; falha de rede não é guardada. A chave nunca aparece em log. Sem a chave, nada sai para a internet e a busca usa só os itens conhecidos. Os ícones continuam vindo pelo ID, sem chave (D41).

## 5. Migração do artefato (D54)

1. O artefato Diário de Instâncias continua no ar, com os dados de cada pessoa. Uma cópia do código está em `docs/legado/diario-instancias.html`.
2. No artefato, **Cadastro › Backup completo** baixa (ou copia) um JSON com personagens, instâncias, itens, preços e todos os check-ins.
3. No Empty Variable, **Diário de farm › Importar**: o membro envia o arquivo, escolhe o personagem do vínculo de cada personagem do artefato (o de mesmo nome já vem marcado) e importa.
4. Instâncias e itens são casados pelo nome; os que faltam são criados. Check-ins de personagens marcados como "Não importar" ficam de fora. Repetir a importação não duplica nada.
5. O site manda os check-ins em pedaços de 250, para caber no limite do corpo da API.

## 6. Telas (`/farm`)

- **Hoje:** chips por personagem com o progresso; visão geral de todos; cards por recarga, verdes quando feitos. O check-in abre um painel com a quantidade de cada drop (botões − e +) e um campo para itens que não estavam na lista ("lembrar nesta instância" vem marcado).
- **Totais:** dia, semana ou mês, navegando para trás; conta inteira ou um personagem; itens, por instância, por personagem e a lista de check-ins (com remover).
- **Cadastro:** personagens do vínculo (só leitura), instâncias (partindo do catálogo, se quiser), drops com busca na Divine Pride, e a tabela de itens com ID do jogo e preço.
- **Importar:** o passo 3 acima.

## 7. Testes

- `packages/farm/test`: viradas às 04:00, 3 dias, semana, mês, períodos, leitura de zeny, totais e leitura do backup.
- `backend/test/farm.test.ts`: vínculo, cadastro, check-in e recarga, isolamento entre usuários, totais, busca (com o dublê da Divine Pride) e importação idempotente.
- `tests/e2e/testes/farm.spec.ts`: cadastro, check-in com o card verde, totais e importação pela interface.
