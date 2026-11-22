# Regras para alterações no frontend (`web/`)

**Leitura obrigatória:** antes de criar, alterar ou revisar qualquer arquivo em `web/`, leia por completo
[`docs/frontend/diretrizes.md`](../docs/frontend/diretrizes.md). Isso vale para templates, estilos,
componentes, rotas, serviços e testes. As regras de lá valem para todo código novo ou alterado.

Ao terminar uma alteração:

1. confira a alteração contra o checklist da §9 das diretrizes;
2. diga no resumo o que você seguiu e o que deixou de seguir, e por quê.

Resumo do que não pode ser esquecido (o texto completo está nas diretrizes):

- Procure primeiro um componente em `shared/ui`. Crie um novo só se nenhum servir (§1.1, regra de três).
- Use só tokens de `styles/_tokens.scss`. Não escreva hex, espaçamento ou sombra direto no componente, nem use `::ng-deep`.
- Componente novo é `OnPush`, com `input()`/`output()` e `@if`/`@for`.
- `HttpClient` só aparece em `features/*/data/*.api.ts` e em `core/`.
- Toda área com dados trata os estados de carregando, vazio, erro e sem permissão (§6.2).
- O mínimo é o WCAG 2.2 AA: foco visível e não encoberto, teclado, contraste e nada que dependa só de hover ou de cor (§7).
- A tela funciona a 320 px sem rolagem horizontal e com zoom de 200%. Componentes respondem ao contêiner (`@container conteudo`), não à janela (§6.6).
- Nada de `white`, `black` ou `rgb(0 0 0 / …)` em componente: só tokens semânticos, para o tema claro funcionar sem mexer em componente (§2.6).
- Se uma regra conflitar com o pedido, pergunte antes de descumprir. Não decida sozinho.
