# Datamine dos patches do cliente (D63)

O `rolatam-dm` (ferramenta à parte, na máquina do dono do sistema) compara os arquivos do cliente RO LATAM
antes e depois de cada patch e publica o resultado aqui. O Betel guarda e mostra; ele não minera nada.

## Publicar um patch

`POST /api/integracao/datamine/patches`, com `Authorization: Bearer <INTEGRACAO_TOKEN>` (o mesmo segredo
das rotas do nag4eyes). Pela internet a rota não existe (o nginx do host responde 404 para `/api/integracao`);
a máquina que minera chega ao contêiner web por um túnel SSH (`docs/implantacao.md`, seção 8.5).

Corpo JSON (até 24 MB; o parser padrão da API continua em 100 kB para as outras rotas):

| Campo           | Tipo       | Regra                                                                                   |
| --------------- | ---------- | --------------------------------------------------------------------------------------- |
| `chave`         | string     | Nome do último arquivo do `patch.txt` coberto (ex.: `2026-11-24_live_client_2170_2171_1795480754.rgz`). `[A-Za-z0-9._-]`, 8 a 160 caracteres. Identifica o patch |
| `titulo`        | string     | 3 a 120 caracteres (ex.: `Patch LATAM 2026-11-24`)                                      |
| `dataPatch`     | string     | `AAAA-MM-DD`                                                                            |
| `patches`       | string[]   | Linhas do `patch.txt` aplicadas entre os dois snapshots, até 500                        |
| `resumo`        | objeto     | Contagens e destaques (abaixo). A tela só lê o que conhece; campos novos são ignorados |
| `relatorioHtml` | string     | O `report.html` inteiro, até 16 MB                                                      |
| `relatorioJson` | string     | O `report.json` inteiro (um objeto JSON), até 16 MB                                     |

Resposta `200`: `{ "id": "<uuid>", "criado": true | false, "url": "<APP_ORIGIN><APP_BASE_PATH>/datamine/<id>" }`.
Publicar de novo a mesma `chave` substitui os arquivos e o resumo (`criado: false`); nunca duplica.
`400` para corpo inválido, `401` sem o token.

### Formato do `resumo`

```json
{
  "contagens": {
    "itensNovos": 230, "itensAlterados": 122, "itensRemovidos": 0,
    "monstros": 24, "skillsNovas": 0, "skillsAlteradas": 8,
    "mapas": 3, "quests": 78, "caixas": 31,
    "grfNovos": 956, "grfAlterados": 150, "tabelasLua": 40, "textos": 7
  },
  "destaques": {
    "mapas": [{ "map": "1@vrcas.rsw", "nome": "Livro de Ilusões - Palácio Lilium" }],
    "monstros": [{ "id": 21633, "sprite": "VR_AGNES" }],
    "caixas": [{ "id": 108642, "nome": "Artefato Oval Invernal" }]
  },
  "ragexe": true,
  "grfReempacotado": true
}
```

`ragexe` diz se o Ragexe.exe mudou (sha1 diferente entre os dois snapshots) e `grfReempacotado` se a tabela do
`data.grf` trocou de lugar (o patcher reescreveu o arquivo). A tela usa os dois nos selos do cabeçalho, antes de o
`report.json` chegar; o `report.json` repete a informação em `meta.ragexe` e `meta.grf`.

## Ler

Com sessão, como o resto do sistema:

- `GET /api/datamine/patches`: todos, do mais recente para o mais antigo (`id`, `chave`, `titulo`, `dataPatch`, `patches`, `resumo`, `bytesHtml`, `bytesJson`, `publicadoEm`, `atualizadoEm`).
- `GET /api/datamine/patches/:id`: um patch.
- `GET /api/datamine/patches/:id/dados`: o `report.json`. É o que a tela `/datamine/:id` usa: ela pede o
  arquivo quando a página do patch abre e monta as abas (itens, caixas, monstros, skills, mapas, quests,
  GRF, tabelas Lua e textos) com os componentes do sistema. O formato que a tela lê está em
  `web/src/app/features/datamine/data/relatorio.mapear.ts`; campo ausente ou de tipo errado vira o valor
  neutro, e campo novo é ignorado.
- `GET /api/datamine/patches/:id/relatorio`: o `report.html`. A tela não usa mais (até a UI nativa, ela o
  emoldurava num iframe); a rota continua para quem quiser abrir o relatório original. Vem com
  `Content-Security-Policy: … frame-ancestors 'self'; sandbox allow-scripts` e `X-Frame-Options: SAMEORIGIN`:
  só páginas deste domínio o emolduram, e ele roda numa origem opaca, sem a sessão nem o storage do sistema.

## Onde fica

Tabela `patch_cliente` (identificação e resumo) e `DATAMINE_DIR/<id>/report.html` + `report.json` em disco,
escritos em `.tmp` e renomeados, para uma leitura nunca pegar um arquivo pela metade. Se o arquivo sumir do
disco, a API responde `404` no relatório e avisa no log; o registro continua na lista.
