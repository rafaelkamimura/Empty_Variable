# Diretrizes do frontend

**Status:** proposta, aguardando validação.
**Vale para:** todo código em `web/`, seja escrito por pessoas ou por agentes.

Este documento define três coisas:

- a identidade visual (tokens);
- a arquitetura de pastas e componentes;
- os padrões de UX que toda tela nova ou alterada deve seguir.

Se uma regra daqui conflitar com código existente, a regra vale para o código **novo**. O código antigo migra aos poucos (ver §10).

**Regra de ouro:** antes de escrever HTML ou CSS numa página, procure um componente em `shared/ui`. Se nenhum servir, crie o componente lá, e não na página.

---

## 1. Princípios

1. **Componente antes de página.** A página só compõe peças. Ela não estiliza botões, cartões ou estados.
2. **Token antes de valor.** Nenhuma cor, espaçamento, raio ou sombra fica escrito direto num componente. Tudo vem de variáveis CSS (§2).
3. **Separar dados de apresentação.** Componentes visuais não falam com a API. Só serviços de dados falam (§4).
4. **Um jeito de fazer cada coisa.** Há um só botão principal, um só estado de carregamento e um só padrão de formulário.
5. **Acessível por padrão.** O mínimo é o WCAG 2.1 AA, e isso não é opcional (§7).
6. **Calma visual.** O fundo é o espaço e a aurora é a moldura. O conteúdo fica limpo, e o brilho é reservado ao que é importante ou interativo.
7. **Um propósito por componente.** Se a descrição do componente precisa de um "e", ele provavelmente são dois.
8. **Composição em vez de configuração.** Um componente cresce por slots (`<ng-content select="…">`) e por variantes tipadas, não por uma pilha de inputs booleanos. A partir de 3 inputs `boolean` que mudam o layout, divida o componente ou use slots.
9. **O estilo desce por um só caminho.** Tokens alimentam átomos, átomos alimentam moléculas, e assim por diante (§3.3). Um nível nunca reestiliza o interior de outro.

### 1.1 Quando não componentizar

Componentizar tem custo. Abstração cedo demais gera componentes cheios de opções que ninguém entende. Por isso:

- **Regra de três:** a primeira vez, a peça fica na página. Na segunda, ela vira um componente da feature. Na terceira, ou quando outra feature precisar dela, ela sobe para `shared/`.
- **Não generalize pelo futuro imaginado.** Um componente nasce com as variantes que existem hoje.
- **Componente compartilhado é contrato.** Mudar a API de um componente de `shared/ui` obriga a atualizar todos os usos no mesmo PR. Se a mudança for grande, crie uma variante nova e migre os usos depois.
- **Prefira copiar duas linhas a importar uma dependência entre features.**

---

## 2. Identidade visual

### 2.1 Paleta da marca (primitivos)

Os primitivos só aparecem em `styles/_tokens.scss`. Componentes **nunca** usam os primitivos direto: usam os tokens semânticos da §2.2.

| Primitivo           | Hex       | Papel                           |
| ------------------- | --------- | ------------------------------- |
| `--ev-espaco`       | `#040017` | Fundo do espaço (quase preto)   |
| `--ev-aurora-azul`  | `#2720B9` | Aurora azul                     |
| `--ev-aurora-violeta` | `#991FDB` | Aurora violeta                |
| `--ev-aurora-magenta` | `#CA24ED` | Aurora magenta                |
| `--ev-chave-inicio` | `#9155F6` | Chaves `{ }`, início do degradê |
| `--ev-chave-fim`    | `#C65BFB` | Chaves `{ }`, fim do degradê (orquídea) |
| `--ev-cursor`       | `#9D52FB` | Cursor `_`                      |
| `--ev-lavanda`      | `#E0C9F8` | `∅` lavanda                     |
| `--ev-estrela`      | `#EED7FF` | Brilho das estrelas             |

### 2.2 Tokens semânticos

Estes são os tokens que os componentes usam. Os contrastes foram medidos contra `--fundo` (#040017).

**Superfícies.** São derivadas do fundo: mesmo matiz, mais luz em cada nível.

| Token          | Valor     | Uso                                  |
| -------------- | --------- | ------------------------------------ |
| `--fundo`      | `#040017` | Fundo da aplicação                   |
| `--superficie` | `#0C0628` | Barra lateral, topo, blocos recolhidos |
| `--cartao`     | `#140B36` | Cartões, tabelas, painéis            |
| `--elevado`    | `#1D1247` | Hover, menus, diálogos, painel lateral |
| `--borda`      | `#2A1D5C` | Divisórias, contorno de cartão (decorativo) |
| `--borda-forte` | `#3A2A78` | Separação de seções                 |
| `--borda-campo` | `#6E5DB5` | Contorno de campo de formulário (3,8:1, exigido para controles) |

**Texto.**

| Token            | Valor     | Contraste no fundo | Uso                                  |
| ---------------- | --------- | ------------------ | ------------------------------------ |
| `--texto-forte`  | `#EED7FF` | 15,5:1             | Títulos e números de destaque        |
| `--texto`        | `#E0C9F8` | 13,6:1             | Texto corrido                        |
| `--texto-suave`  | `#A99BC4` | 8,0:1              | Legendas e rótulos                   |
| `--texto-apagado` | `#8E80AD` | 5,7:1             | Metadados e placeholders (no máximo até o `--elevado`) |

**Acento e interação.**

| Token                | Valor                                    | Uso                                                      |
| -------------------- | ---------------------------------------- | -------------------------------------------------------- |
| `--acento`           | `#C65BFB` (6,2:1)                        | Links, ícones ativos, foco, aba e chip selecionados      |
| `--acento-suave`     | `#9D52FB`                                | Indicador de "ativo" e cursor. Não serve para texto pequeno sobre `--elevado` (4,1:1) |
| `--acento-degrade`   | `linear-gradient(135deg, #9155F6, #C65BFB)` | Botão principal e destaques pontuais                  |
| `--sobre-acento`     | `#040017`                                | Texto sobre o degradê (4,75:1 no pior ponto)              |
| `--acento-fundo`     | `color-mix(in srgb, #9D52FB 16%, transparent)` | Fundo de item selecionado ou hover de chip          |
| `--foco`             | `#C65BFB`                                | Anel de foco (`outline: 2px solid`, `offset: 2px`)       |
| `--destaque`         | `#CA24ED`                                | Selos de novidade e badges. Usar com moderação           |

**Aurora (decoração).** É usada **só** em fundos, brilhos e ilustrações. Nunca serve para texto ou ícone com significado.

| Token             | Valor                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| `--aurora`        | `linear-gradient(120deg, #2720B9 0%, #991FDB 55%, #CA24ED 100%)`      |
| `--aurora-brilho` | `radial-gradient(60% 40% at 20% 0%, rgb(39 32 185 / 35%), transparent), radial-gradient(50% 35% at 85% 10%, rgb(202 36 237 / 25%), transparent)` |
| `--brilho-acento` | `0 0 0 1px rgb(198 91 251 / 40%), 0 8px 24px rgb(153 31 219 / 25%)`  |

> **Atenção:** `#2720B9` (1,96:1) e `#991FDB` (3,5:1) **reprovam** como texto sobre o fundo. Eles servem só como decoração.

**Estados.** Não fazem parte da paleta, mas foram harmonizados com ela. Todos têm contraste acima de 7:1.

| Token       | Valor     | Fundo do estado                             |
| ----------- | --------- | ------------------------------------------- |
| `--sucesso` | `#7EE0C3` | `--sucesso-fundo: rgb(126 224 195 / 12%)`   |
| `--alerta`  | `#F2C97D` | `--alerta-fundo: rgb(242 201 125 / 12%)`    |
| `--erro`    | `#FF8FAB` | `--erro-fundo: rgb(255 143 171 / 12%)`      |
| `--info`    | `#8FB8FF` | `--info-fundo: rgb(143 184 255 / 12%)`      |

Um estado nunca é indicado só pela cor. Sempre há ícone e texto junto.

**Tons de identidade.** Dão a cor estável do ícone de item e do emblema de classe (`tomDe()` em `core/visual.ts`). São decorativos: o nome do item ou da classe sempre aparece junto. Contraste medido contra `--superficie`, o fundo da arte do cartão.

| Token            | Valor                         | Contraste |
| ---------------- | ----------------------------- | --------- |
| `--tom-orquidea` | `--ev-chave-fim` (#C65BFB)    | 5,9:1     |
| `--tom-violeta`  | `--ev-chave-inicio` (#9155F6) | 4,5:1     |
| `--tom-lavanda`  | `--ev-lavanda` (#E0C9F8)      | 12,9:1    |
| `--tom-azul`     | `--info` (#8FB8FF)            | 9,8:1     |
| `--tom-menta`    | `--sucesso` (#7EE0C3)         | 12,4:1    |
| `--tom-nevoa`    | `--texto-suave` (#A99BC4)     | 7,6:1     |

### 2.3 Demais escalas

| Escala     | Tokens                                                                                     |
| ---------- | ------------------------------------------------------------------------------------------ |
| Espaçamento | `--esp-1: 4px` · `--esp-2: 8px` · `--esp-3: 12px` · `--esp-4: 16px` · `--esp-5: 24px` · `--esp-6: 32px` · `--esp-7: 48px` |
| Raio       | `--raio-p: 6px` (chips, campos) · `--raio-m: 10px` (botões) · `--raio-g: 14px` (cartões, painéis) · `--raio-total: 999px` |
| Tipografia | Família `--fonte: "Inter", Roboto, system-ui, sans-serif` e `--fonte-mono: "JetBrains Mono", ui-monospace, monospace` (números de pontos, IDs, códigos) |
| Tamanhos   | `--fs-xs: 12px` · `--fs-s: 13px` · `--fs-m: 14px` (padrão) · `--fs-l: 16px` · `--fs-xl: 20px` · `--fs-2xl: 28px` (título de página) |
| Peso       | 400 no texto, 600 em rótulos e botões, 700 em títulos e números de destaque                |
| Sombra     | `--sombra-1: 0 1px 2px rgb(0 0 0 / 40%)` · `--sombra-2: 0 8px 24px rgb(0 0 0 / 45%)` · `--brilho-acento` só em foco ou destaque |
| Movimento  | `--duracao: 160ms` e `--curva: cubic-bezier(.2,.8,.2,1)`. Tudo é desligado com `prefers-reduced-motion: reduce` |
| Camadas    | `--z-topo: 10` · `--z-painel: 100` · `--z-dialogo: 200` · `--z-aviso: 300`                 |

Números (pontos, zeny, quantidades) usam `font-variant-numeric: tabular-nums` para alinhar em colunas.

### 2.4 Uso da identidade

- **A aurora aparece em poucos lugares:**
  - no fundo do login;
  - no topo da aplicação, como uma faixa fina;
  - em estados vazios ilustrados;
  - no brilho atrás do número de saldo.

  Ela nunca aparece atrás de tabelas ou formulários.
- **A marca `{∅_}`** (chaves em degradê, `∅` lavanda, cursor `_` piscando) é usada no logotipo e nos estados vazios. O cursor pisca a 1 Hz e para com `prefers-reduced-motion`.
- **Há um único botão principal por tela,** em `--acento-degrade`. As demais ações usam a variante secundária (contorno) ou a fantasma (texto).
- **Cartões** usam `--cartao`, borda `--borda` e `--raio-g`, sem sombra. No hover, a borda passa a `--borda-forte`. Um cartão clicável também ganha `--brilho-acento` no foco.

### 2.5 Integração com o Angular Material

- O Material entra pelo **comportamento** e pela acessibilidade (CDK, overlay, abas, snackbar, diálogo). O **visual** vem dos tokens.
- As variáveis `--mat-sys-*` são mapeadas para os tokens semânticos **num único lugar**, `styles/_material.scss`, da mesma forma que hoje ficam em `styles.scss`.
- O tema `azure-blue.css` pré-compilado deve sair do `angular.json` quando o mapeamento estiver completo.
- `::ng-deep` é proibido em código novo. Se um componente do Material precisa de outro visual, o ajuste é feito por token `--mat-*` no componente `shared/ui` que o envolve.

---

## 3. Arquitetura de pastas

```
web/src/
├── styles/
│   ├── _tokens.scss        # primitivos + tokens semânticos (§2) — ÚNICO lugar com hex
│   ├── _material.scss      # mapeamento --mat-sys-* → tokens
│   ├── _base.scss          # reset, html/body, tipografia, foco global, reduced-motion
│   ├── _utilitarios.scss   # poucas classes utilitárias (ex.: .sr-only, .tabular)
│   └── _legado*.scss       # classes globais antigas, só até a migração (§10); nada novo aqui
├── styles.scss             # só @use dos arquivos acima
└── app/
    ├── core/               # singletons da aplicação, sem UI
    │   ├── auth/           # AuthService, guardas, interceptors
    │   ├── http/           # interceptors, tratamento de erro (mensagemDeErro)
    │   └── feedback/       # Acao (snackbar), confirmação
    ├── shared/
    │   ├── ui/             # componentes de apresentação genéricos (§5) — sem domínio
    │   ├── pipes/          # pontos, zeny, datas relativas
    │   └── utils/          # funções puras sem Angular
    ├── layout/             # casca: app-shell, menu lateral, topo, troca de painel
    └── features/           # um diretório por domínio
        ├── loja/
        │   ├── data/       # loja.api.ts (HTTP), loja.store.ts (estado), loja.modelos.ts
        │   ├── componentes/# peças do domínio (ex.: cartao-item-loja)
        │   ├── paginas/    # telas roteadas (catalogo.page.ts, compras.page.ts)
        │   └── loja.routes.ts
        ├── carteira/  ├── farm/  ├── nebula/  ├── instancias/
        ├── runs/      ├── estoque/  ├── simulador/  └── admin/
```

### 3.1 Regras de dependência

| Camada                      | Pode importar                                       | Não pode importar                        |
| --------------------------- | --------------------------------------------------- | ---------------------------------------- |
| `shared/ui`                 | Angular, CDK e Material, `shared/pipes`, `shared/utils` | `core`, `features`, `HttpClient`, modelos de domínio |
| `features/x/componentes`    | `shared/*` e os modelos de `features/x/data`        | `HttpClient` e outras features           |
| `features/x/paginas`        | tudo de `features/x`, `shared/*` e `core/*`         | páginas e componentes de **outra** feature |
| `features/x/data`           | `HttpClient`, `core/http`, `shared/utils`, pacotes `@betel/*` | componentes                       |
| `core`                      | Angular, `shared/utils`                             | `features`                               |

- Se duas features precisam da mesma peça, ela sobe para `shared/ui`, se for genérica, ou para `shared/dominio/`, se for de RO, como o ícone de classe ou a imagem de item.
- As regras de negócio puras continuam nos pacotes `@betel/scoring`, `@betel/farm` e `@betel/simulador`. O front não recalcula regras: exibe o que esses pacotes ou a API entregam.
- Rotas usam `loadComponent` ou `loadChildren` por feature (lazy). Cada feature exporta o seu `*.routes.ts`.

### 3.2 Nomes

| O quê               | Arquivo                      | Classe ou seletor                             |
| ------------------- | ---------------------------- | --------------------------------------------- |
| Componente UI       | `shared/ui/botao/botao.component.ts` | `BotaoComponent`, seletor `ui-botao` ou atributo `button[uiBotao]` |
| Componente de domínio | `features/loja/componentes/cartao-item.component.ts` | `CartaoItemComponent`, seletor `app-cartao-item` |
| Página              | `features/loja/paginas/catalogo.page.ts` | `CatalogoPage`, seletor `app-catalogo-page` |
| Serviço de API      | `features/loja/data/loja.api.ts` | `LojaApi`                                 |
| Estado da feature   | `features/loja/data/loja.store.ts` | `LojaStore`                             |
| Modelos             | `features/loja/data/loja.modelos.ts` | interfaces + rótulos (`ROTULO_*`)     |

Os nomes ficam em **português**, como no restante do projeto. Arquivos usam kebab-case. O prefixo `ui-` é exclusivo de `shared/ui`, e `app-` vale para o resto.

### 3.3 Níveis dos componentes (Atomic Design)

O projeto usa o vocabulário do Atomic Design para decidir **o que um componente pode conter**. As pastas não são separadas por nível: o nível aparece no catálogo (§5) e no JSDoc do componente (`@nivel atomo`).

| Nível        | O que é                                                  | Exemplos                                   | Onde fica                     |
| ------------ | -------------------------------------------------------- | ------------------------------------------ | ----------------------------- |
| Tokens       | Valores de cor, espaço, tipo e movimento                 | `--acento`, `--esp-4`                      | `styles/_tokens.scss`         |
| Átomo        | Elemento indivisível                                     | botão, badge, skeleton, marca              | `shared/ui`                   |
| Molécula     | Poucos átomos com uma função só                          | campo, resumo, chips de filtro, aviso      | `shared/ui`                   |
| Organismo    | Seção completa e independente                            | cartão de item da loja, tabela de extrato, painel lateral | `shared/ui` (genérico) ou `features/x/componentes` (de domínio) |
| Template     | Esqueleto de layout, sem dados                           | `ui-pagina`, casca do `layout/`            | `shared/ui` e `layout/`       |
| Página       | Template com dados reais e rotas                         | `CatalogoPage`                             | `features/x/paginas`          |

**Regra:** um componente só importa componentes do **mesmo nível ou de níveis abaixo**. Um átomo nunca importa uma molécula.

### 3.4 Configuração e arquivos estáticos

- **Nenhuma URL ou caminho fica fixo no código.**
  - As chamadas usam caminhos relativos (`api/...`).
  - O `caminhoBaseInterceptor` aplica o `APP_BASE_PATH`.
  - O que muda por ambiente entra por `environment.ts` ou por configuração servida pela API, e nunca por `if (location.host…)`.
- **`public/`** guarda só arquivos estáticos, agrupados por tipo (`icones-classes/`, `imagens/`, `fontes/`). Imagens são otimizadas antes de entrar (PNG/WebP comprimido, no tamanho em que aparecem), e ícones de interface são SVG em `app-icone`.
- **As fontes** (Inter e JetBrains Mono) são servidas pelo próprio projeto, com `font-display: swap` e só os pesos usados (400, 600 e 700). Elas vêm dos pacotes `@fontsource/*` (subconjunto `latin`), declarados em `styles` no `angular.json`, e não são carregadas de CDN.

---

## 4. Tipos de componente

### 4.1 Página (container)

- É roteada e fica em `features/x/paginas`.
- Injeta o **store** ou a **API** da feature, guarda o estado da tela em signals e passa dados para os filhos via `input()`.
- Não tem CSS de componente visual. Só pode ter layout da própria página (grid e áreas).
- Sempre usa o esqueleto `<ui-pagina>` (§6.1).

### 4.2 Componente de domínio

- Conhece um modelo do domínio (ex.: `ItemVitrine`) e o apresenta usando peças de `shared/ui`.
- Recebe tudo por `input()` e avisa ações por `output()`. **Não** injeta `HttpClient` nem store.

### 4.3 Componente UI (apresentação pura)

- Não conhece o domínio: recebe texto, números, variantes e conteúdo projetado (`<ng-content>`).
- Tem uma API pequena e estável, documentada no próprio arquivo com JSDoc nos inputs.
- Toda variante é um input tipado (`variante = input<'principal' | 'secundario' | 'fantasma'>('secundario')`), e nunca uma classe CSS passada de fora.
- **É autocontido no que é dele:** estilo, comportamento e acessibilidade. Os dados vêm de fora. Funciona igual em qualquer tela e não depende de CSS da página que o usa.
- **Estende por slots:** o conteúdo variável (ícone, ações, rodapé) entra por `<ng-content select="[slot=acoes]">`, para atender casos novos sem novos inputs.

### 4.4 Regras comuns (todo componente novo)

- `standalone` (padrão do Angular 19), com `changeDetection: ChangeDetectionStrategy.OnPush`.
- **Signals:** `input()`, `input.required()`, `output()`, `model()`, `computed()`. Não usar `@Input`/`@Output` com decorador.
- **Fluxo de controle novo:** `@if`, `@for (… ; track id)`, `@switch`. `*ngIf`/`*ngFor` não são permitidos.
- `inject()` em vez de injeção pelo construtor.
- **Tamanho:**
  - template de até ~60 linhas e estilo de até ~60 linhas podem ficar inline;
  - acima disso, use `templateUrl` e `styleUrl` em arquivos separados;
  - um arquivo acima de **300 linhas** é sinal de que o componente deve ser quebrado. Hoje, `simulador`, `vinculo` e `admin-run-assistente` passam de 800 linhas.
- **Estilos** ficam encapsulados no componente e usam **só tokens**. Classes globais novas em `styles.scss` são proibidas.
- **Sem lógica no template** além de exibição. Cálculos vão para `computed()` ou para funções puras testáveis em `data/` ou `shared/utils`.
- `data-testid` em elementos que os testes e2e usam, com nome kebab-case no padrão `<feature>-<elemento>`.

### 4.5 Dados e estado

- **A chamada HTTP fica só em `data/*.api.ts`.** Cada método devolve `Promise<T>` (via `firstValueFrom`) ou `Observable<T>`, e a feature escolhe um dos dois e mantém. Hoje, 30 páginas injetam `HttpClient` direto; isso deve migrar.
- **A API não transforma dados.** O `*.api.ts` devolve o que o servidor enviou, tipado. Ordenar, agrupar e calcular rótulos fica em funções puras (`mapear*`, `agrupar*`) em `data/`, usadas pelo store ou por `computed()`. Assim a lógica é testável sem HTTP.
- **O estado compartilhado de uma feature** (ex.: o saldo, que aparece no topo e na loja) fica num `*.store.ts` `providedIn: 'root'`, com signals privados e leitura pública por `asReadonly()` ou `computed()`.
- **Estado de carregamento padronizado:** use o tipo `Carregavel<T> = { estado: 'carregando' } | { estado: 'erro'; mensagem: string } | { estado: 'pronto'; dados: T }`, renderizado por `<ui-estado>` (§5).
- **Escritas** passam por `Acao.executar()` (que já existe), com sucesso e erro num aviso padronizado.

---

## 5. Catálogo de componentes UI (`shared/ui`)

O catálogo abaixo é o ponto de partida. Cada linha indica o que substitui no código atual.

| Componente                | Nível | Responsabilidade                                                                  | Substitui hoje                                       |
| ------------------------- | --------- | --------------------------------------------------------------------------------- | ---------------------------------------------------- |
| `ui-pagina`               | Template | Esqueleto de página: título, subtítulo, slot de ação principal, slot de abas e conteúdo | `.pagina`, `.cabecalho`, `.cabecalho-acoes`     |
| `button[uiBotao]`         | Átomo | Variantes `principal`, `secundario`, `fantasma` e `perigo`; tamanhos `p` e `m`; estado `carregando` | `.botao`, `.botao-acao`                 |
| `ui-botao-icone`          | Átomo | Botão só com ícone, com `aria-label` obrigatório                                  | botões soltos com `app-icone`                        |
| `ui-cartao`               | Organismo | Superfície com cabeçalho, conteúdo e rodapé opcionais; variante `clicavel`        | cartões de loja, nebula e farm                       |
| `ui-resumo`               | Molécula | Bloco de KPI: rótulo, número (tabular) e meta opcional                            | `.resumo`, `.resumo-rotulo`, `.resumo-numero`, `.resumo-meta` |
| `ui-chips-filtro`         | Molécula | Grupo de filtros em chip com contagem e seleção única ou múltipla (`model()`)     | `.chips`, `.chip`                                    |
| `ui-estado`               | Organismo | Renderiza `Carregavel<T>`: skeleton, vazio (com ilustração `{∅_}`) e erro (com "Tentar novamente") | os `@if (erro) … @else if (!dados)` repetidos |
| `ui-vazio`                | Molécula | Estado vazio: ilustração, frase e ação opcional                                   | parágrafos "Nenhum…" soltos                          |
| `ui-skeleton`             | Átomo | Placeholder animado de linha, cartão ou tabela                                    | "Carregando…"                                        |
| `ui-aviso`                | Molécula | Mensagem inline com tom `info`, `sucesso`, `alerta` ou `erro`, ícone e `role` correto | `.dica` e `<p role="alert">`                     |
| `ui-campo`                | Molécula | Rótulo, controle projetado, dica e erro, ligados por `aria-describedby`           | `.campo`, `.campo-largo`                             |
| `ui-painel-lateral`       | Organismo | Formulário de criar e editar à direita (mover de `core/layout.ts`)                | `app-painel-lateral`                                 |
| `ui-como-funciona`        | Molécula | Explicação recolhida (mover de `core/layout.ts`)                                  | `app-como-funciona`                                  |
| `ui-confirmacao`          | Organismo | Diálogo de confirmação para ações destrutivas, com descrição do efeito            | `confirm()` e confirmações ad hoc                    |
| `table[uiTabela]`         | Organismo | Tabela responsiva (evolução da diretiva `appResponsiva`), com cabeçalho fixo e linha vazia | `.tabela`, `.tabela-responsiva`             |
| `ui-badge`                | Átomo | Rótulo de status com tom semântico                                                | chips de status de compra e run                      |
| `ui-marca`                | Átomo | Logotipo `{∅_}` com o cursor animado                                              | (novo)                                               |
| Pipes `pontos` e `zeny`   | — | Formatação pt-BR com sufixo e `tabular-nums`                                      | `number` + " pts" repetido                           |

Os componentes de RO, usados por mais de uma feature, vão para `shared/dominio/`: `app-icone`, `app-imagem-item`, `app-icone-classe`, `app-equipamento-select` e `app-busca-item`.

**Para criar um componente UI novo:**

1. confirme que nenhum componente existente resolve com uma variante;
2. crie em `shared/ui/<nome>/` o componente e o `.spec.ts`;
3. documente os inputs com JSDoc;
4. acrescente uma linha na tabela acima, no mesmo PR.

---

## 6. Padrões de UX

### 6.1 Esqueleto de página

Este esqueleto continua o `docs/planejamento/paineis.md` §5:

```html
<ui-pagina titulo="Estoque" subtitulo="Itens do grupo e de onde vieram.">
  <button uiBotao variante="principal" acao (click)="novo()">Nova entrada</button>
  <ui-como-funciona> … </ui-como-funciona>
  <ui-chips-filtro … />
  <ui-estado [valor]="estoque()"> <ng-template let-dados> … </ng-template> </ui-estado>
</ui-pagina>
```

1. **Cabeçalho:** título, **uma** frase e **uma** ação principal à direita.
2. **Explicações longas** ficam em `ui-como-funciona`, recolhidas.
3. **Criar e editar** abre num `ui-painel-lateral` ou diálogo. A página mostra a lista.
4. **Mais de uma seção** vira abas. Filtros viram chips com contagem.

### 6.2 Estados obrigatórios

Toda área que carrega dados trata os quatro estados abaixo. Um PR sem eles não é aprovado.

| Estado      | Como                                                                               |
| ----------- | ---------------------------------------------------------------------------------- |
| Carregando  | `ui-skeleton` no formato do conteúdo. Nada de texto "Carregando…" nem spinner de página inteira |
| Vazio       | `ui-vazio`, com uma frase que explique e, se houver, a ação para preencher         |
| Erro        | `ui-aviso tom="erro"`, com a mensagem da API (`mensagemDeErro`) e "Tentar novamente" |
| Sem permissão ou sem vínculo | `ui-aviso tom="info"`, com o próximo passo (ex.: "Vincule sua conta…") |

### 6.3 Ações e feedback

- **Durante o envio,** o botão fica em `carregando` (desabilitado e com indicador), para impedir duplo envio.
- **Sucesso e erro de escrita** são avisados por `Acao.executar()` (snackbar de 4 s). A mensagem diz o que aconteceu: "Compra registrada", e não "Sucesso".
- **Ações destrutivas ou irreversíveis** (cancelar compra, estornar pontos, excluir) pedem `ui-confirmacao`. O texto diz o efeito e o botão repete o verbo ("Cancelar compra").
- **Atualização otimista** só é usada quando a API é idempotente. Nos outros casos, a tela recarrega depois da confirmação.

### 6.4 Formulários

- **Todo campo** fica dentro de `ui-campo`, com rótulo visível (o placeholder não substitui o rótulo).
- **A validação aparece** ao sair do campo ou ao tentar enviar. A mensagem diz como corrigir.
- **O teclado certo:** campos numéricos usam `inputmode="numeric"`, e Enter envia formulários curtos.
- **O foco vai ao primeiro campo** quando o painel abre e volta ao botão de origem quando ele fecha.

### 6.5 Conteúdo e formatação

- O texto é em português do Brasil, em frases curtas, na voz ativa e sem jargão técnico. Os termos do jogo ficam como no jogo (Nebula, Run, Peça Astral).
- **Números:**
  - formato pt-BR (`1.234`);
  - pontos com o pipe `pontos`;
  - zeny com o pipe `zeny`;
  - números sempre alinhados à direita em tabelas.
- **Datas:** relativas até 7 dias ("há 2 dias"), absolutas depois (`21/11/2026 10:31`), com a data completa num `title`.

### 6.6 Responsividade

- O layout é pensado primeiro para o celular e para as **container queries** (`@container conteudo`). As media queries ficam só para a casca.
- **Pontos de quebra:** 600 px (celular), 760 px (tabela vira cartão, como hoje) e 1100 px (largura máxima do conteúdo).
- **Alvos de toque** têm no mínimo 40×40 px, e não há rolagem horizontal na página.

---

## 7. Acessibilidade (mínimo AA)

- **Contraste:**
  - texto ≥ 4,5:1 e texto grande ≥ 3:1;
  - contornos de controles e ícones com significado ≥ 3:1;
  - os tokens da §2 já cumprem isso, e misturas novas precisam ser medidas.
- **Foco visível** em tudo que é interativo: `outline: 2px solid var(--foco)`. Nunca use `outline: none` sem substituto.
- **Teclado:** tudo funciona sem mouse. Esc fecha painéis e diálogos, e o foco fica preso dentro deles enquanto estão abertos (CDK `cdkTrapFocus`).
- **Semântica:**
  - `button` para ações e `a` para navegação;
  - um `h1` por página e hierarquia de títulos sem pular níveis.
- **Mensagens dinâmicas:** `role="status"` para informação e `role="alert"` para erro. O `ui-aviso` já aplica o certo.
- **Botões só com ícone** têm `aria-label`, e imagens de item têm `alt` com o nome.
- **Movimento:** `prefers-reduced-motion` desliga animações, o cursor piscando e os brilhos que se movem.

---

## 8. Testes, documentação e verificação automática

### 8.1 Testes

| O quê                | Como                                                                                |
| -------------------- | ----------------------------------------------------------------------------------- |
| `shared/ui`          | `.spec.ts` obrigatório, cobrindo variantes, estados (desabilitado e carregando) e atributos ARIA |
| `features/x/data`    | Teste das funções puras e dos stores (sem DOM)                                      |
| Páginas              | Teste dos fluxos principais com `HttpTestingController`                              |
| Fluxos críticos      | Playwright em `tests/e2e`, usando `data-testid` (nunca classe CSS ou texto)         |

Uma mudança visual não pode quebrar um e2e. Se quebrar, o seletor estava errado.

As ferramentas de teste continuam as que o projeto já usa: Karma/Jasmine para specs e Playwright para e2e. Não há troca de ferramenta.

### 8.2 Desenvolvimento isolado e catálogo vivo

Os componentes de `shared/ui` são desenvolvidos e revisados **fora das telas**, para que cada um funcione sozinho.

- **Storybook** (com suporte a Angular) é proposto como o catálogo vivo:
  - cada componente de `shared/ui` tem um `*.stories.ts` ao lado, com uma história por variante e por estado (padrão, desabilitado, carregando, erro, texto longo);
  - o catálogo serve de documentação: a tabela da §5 aponta para ele, e o JSDoc dos inputs aparece como descrição;
  - na revisão de PR, componentes visuais novos ou alterados são conferidos no Storybook antes da tela.
- **A decidir na validação:** se o Storybook parecer pesado para o tamanho do projeto, a alternativa é uma rota `/dev/catalogo`, disponível só fora de produção, que mostra todos os componentes de `shared/ui` com as suas variantes. A regra é a mesma nos dois casos: componente sem exemplo no catálogo não é aprovado.

### 8.3 Regras verificadas pelo linter

O que pode ser checado por máquina não depende de revisão humana. As regras abaixo entram no `eslint.config.mjs` (com `angular-eslint`) e no CI:

| Regra                                          | Como                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Prefixo de seletor (`ui-` em `shared/ui`, `app-` no resto) | `@angular-eslint/component-selector` e `directive-selector`, por pasta |
| `OnPush` em componentes                        | `@angular-eslint/prefer-on-push-component-change-detection`          |
| Signals em vez de decoradores                  | `@angular-eslint/prefer-signals` e `no-input-rename`/`no-output-rename` |
| Sem `HttpClient` fora de `data/` e `core/`     | `no-restricted-imports` em `shared/**`, `features/*/componentes/**` e `features/*/paginas/**` |
| Fronteiras entre camadas (§3.1)                | `no-restricted-imports` com padrões (`features/*` não importa outra feature) |
| Sem hex e sem `::ng-deep` em componentes       | Stylelint (`color-no-hex` fora de `styles/_tokens.scss` e `selector-pseudo-element-disallowed-list`) |
| Acessibilidade de template                     | `@angular-eslint/template/accessibility` (alt, label, foco, papéis)  |

Enquanto o código antigo não migrar, essas regras rodam como **erro** para arquivos novos e para `shared/` e `features/`, e como **aviso** para `paginas/` e `core/` antigos.

---

## 9. Checklist de PR (frontend)

- [ ] Nenhum hex, px solto de espaçamento ou sombra fora de `styles/_tokens.scss`.
- [ ] A página usa `ui-pagina` e reaproveita componentes de `shared/ui`. Nenhum HTML ou CSS de botão, cartão ou estado foi reinventado.
- [ ] Componentes novos são `OnPush`, usam signals (`input`/`output`) e o fluxo de controle novo.
- [ ] Nenhuma página ou componente injeta `HttpClient`. As chamadas estão em `data/*.api.ts`.
- [ ] Estados de carregando, vazio, erro e sem permissão estão tratados.
- [ ] Ações destrutivas pedem confirmação. Botões ficam em `carregando` durante o envio.
- [ ] Funciona só no teclado, com foco visível, e o contraste foi conferido.
- [ ] Funciona a 360 px de largura sem rolagem horizontal.
- [ ] Os specs foram atualizados e os `data-testid` estão nos elementos que o e2e usa.
- [ ] Componente UI novo está registrado na tabela da §5, com o seu nível, e tem exemplo no catálogo (§8.2).
- [ ] O componente tem um propósito só e respeita os níveis (§3.3). Ele só foi para `shared/` se a regra de três (§1.1) se aplica.
- [ ] Mudança de API de componente compartilhado atualizou todos os usos.
- [ ] `pnpm lint` passa sem novos avisos.

---

## 10. Migração do código atual

A migração é incremental, sem reescrita geral. Vale a **regra do escoteiro**: quem mexer numa tela migra essa tela.

1. **Fundação.** *(feita)* Criar `styles/` com os tokens desta paleta e mapear `--mat-sys-*`. Para não quebrar as telas, os tokens antigos (`--fundo`, `--cartao`, `--acento`, `--texto-suave`…) passam a ser **apelidos** dos novos. Depois, `TONS` de `core/visual.ts` é refeito com tons da paleta.
2. **Ferramentas.** Ligar as regras de lint da §8.3 (aviso no código antigo) e montar o catálogo da §8.2, para que cada peça base já nasça com exemplo.
3. **Peças base.** Criar `uiBotao`, `ui-pagina`, `ui-estado`, `ui-aviso`, `ui-cartao`, `ui-resumo` e `ui-chips-filtro`. Mover `ui-painel-lateral`, `ui-como-funciona` e `uiTabela` de `core/`.
3. **Casca.** Fazer o `layout/` (app-shell, menu e topo) com a nova identidade e a marca `{∅_}`, e o login com fundo de aurora.
4. **Features, uma por vez.** A ordem sugerida é pelo uso e pela dor:
   - loja e carteira;
   - farm;
   - Nebula;
   - instâncias e gestão;
   - admin;
   - simulador.

   Em cada feature: criar `data/*.api.ts`, trocar o HTML e o CSS locais por componentes e quebrar os arquivos com mais de 300 linhas.
5. **Limpeza.**
   - Remover as classes globais (`.botao-acao`, `.chip`, `.resumo-*`, `.dica`…) quando nenhuma tela usar mais.
   - Remover os apelidos de tokens antigos.
   - Remover o tema `azure-blue.css`.

---

## 11. Exemplo de referência

```ts
// shared/ui/resumo/resumo.component.ts
import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/** Bloco de indicador: rótulo, número em destaque e uma linha de contexto opcional. */
@Component({
  selector: "ui-resumo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="rotulo">{{ rotulo() }}</span>
    <strong class="numero">{{ valor() }}</strong>
    @if (meta()) {
      <span class="meta">{{ meta() }}</span>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-1);
      padding: var(--esp-4);
      background: var(--cartao);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
    }
    .rotulo { font-size: var(--fs-s); color: var(--texto-suave); font-weight: 600; }
    .numero { font-size: var(--fs-2xl); color: var(--texto-forte); font-variant-numeric: tabular-nums; }
    .meta   { font-size: var(--fs-xs); color: var(--texto-apagado); }
  `,
})
export class ResumoComponent {
  /** Texto curto acima do número (ex.: "Saldo disponível"). */
  readonly rotulo = input.required<string>();
  /** Valor já formatado (use os pipes `pontos`/`zeny` na página). */
  readonly valor = input.required<string>();
  /** Linha de contexto abaixo do número. */
  readonly meta = input<string>();
}
```

```ts
// features/carteira/paginas/carteira.page.ts (trecho)
@Component({
  selector: "app-carteira-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaginaComponent, BotaoDirective, EstadoComponent, ResumoComponent, PontosPipe, ExtratoComponent],
  template: `
    <ui-pagina titulo="Carteira" subtitulo="Seus pontos, créditos e compras.">
      <button uiBotao variante="principal" acao [disabled]="!podeTransferir()" (click)="transferir()">
        Transferir pontos
      </button>
      <ui-estado [valor]="carteira.extrato()">
        <ng-template let-extrato>
          <ui-resumo rotulo="Saldo disponível" [valor]="extrato.saldo | pontos" />
          <app-extrato [extrato]="extrato" />
        </ng-template>
      </ui-estado>
    </ui-pagina>
  `,
})
export class CarteiraPage {
  protected readonly carteira = inject(CarteiraStore);
  protected readonly podeTransferir = computed(() => (this.carteira.saldo() ?? 0) > 0);
  constructor() { void this.carteira.carregar(); }
  protected transferir(): void { /* abre ui-painel-lateral */ }
}
```
