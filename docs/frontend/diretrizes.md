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
5. **Acessível por padrão.** O mínimo é o WCAG 2.2 AA, e isso não é opcional (§7).
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

Estes são os tokens que os componentes usam. Os valores abaixo são os do **tema escuro**, o padrão, e os contrastes foram medidos contra `--fundo` (#040017). O tema claro troca os valores, nunca os nomes (§2.6). Por isso componente nenhum sabe em que tema está.

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

**Céu estrelado (decoração).** A camada de estrelas atrás do conteúdo (`layout/ceu`). Nunca serve para texto ou ícone.

| Token                                   | Valor                                                              |
| --------------------------------------- | ------------------------------------------------------------------ |
| `--estrela`                             | `--ev-estrela` (#EED7FF)                                           |
| `--ceu-distante` e `--ceu-distante-tamanho` | Ladrilho de 290 × 270 px com 7 estrelas de 1 px                |
| `--ceu-proximo` e `--ceu-proximo-tamanho`   | Ladrilho de 510 × 490 px com 6 estrelas de 1,5 a 2 px, que cintilam |

> **Atenção:** `#2720B9` (1,96:1) e `#991FDB` (3,5:1) **reprovam** como texto sobre o fundo. Eles servem só como decoração.

**Estados.** Não fazem parte da paleta, mas foram harmonizados com ela. Todos têm contraste acima de 7:1.

| Token       | Valor     | Fundo do estado                             |
| ----------- | --------- | ------------------------------------------- |
| `--sucesso` | `#7EE0C3` | `--sucesso-fundo: rgb(126 224 195 / 12%)`   |
| `--alerta`  | `#F2C97D` | `--alerta-fundo: rgb(242 201 125 / 12%)`    |
| `--erro`    | `#FF8FAB` | `--erro-fundo: rgb(255 143 171 / 12%)`      |
| `--info`    | `#8FB8FF` | `--info-fundo: rgb(143 184 255 / 12%)`      |

Um estado nunca é indicado só pela cor. Sempre há ícone e texto junto.

**Tons de identidade.** Dão a cor estável do ícone de item e do emblema de classe (`tomDe()` em `shared/dominio/visual.ts`). São decorativos: o nome do item ou da classe sempre aparece junto. Contraste medido contra `--superficie`, o fundo da arte do cartão.

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
| Camadas    | `--z-topo: 20` · `--z-painel: 100` · `--z-dialogo: 200` · `--z-aviso: 300`                 |

Números (pontos, zeny, quantidades) usam `font-variant-numeric: tabular-nums` para alinhar em colunas.

### 2.4 Uso da identidade

- **A aurora aparece em poucos lugares:**
  - no fundo do login;
  - no topo da aplicação, como uma faixa fina;
  - em estados vazios ilustrados;
  - no brilho atrás do número de saldo.

  Ela nunca aparece atrás de tabelas ou formulários.
- **O céu estrelado** (`app-ceu`, em `layout/`) fica atrás de toda a aplicação, na casca. São estrelas pequenas e esparsas nos tons da marca: as distantes ficam paradas, as próximas cintilam devagar e uma estrela cadente passa de vez em quando. Ele aparece só onde não há superfície (`--superficie`, `--cartao`) por cima, e para com `prefers-reduced-motion`.
- **A marca `{∅_}`** (chaves em degradê, `∅` lavanda, cursor `_` piscando) é usada no logotipo e nos estados vazios. O cursor pisca a 1 Hz e para com `prefers-reduced-motion`.
  - No topo e no login, ela entra na variante `animada`: a imagem `public/imagens/empty-variable-header.gif`, com a marca entre as nebulosas. Com `prefers-reduced-motion`, entra o quadro parado (`.png`).
  - Nos estados vazios e no meio de texto, ela continua em caracteres.
- **Há um único botão principal por tela,** em `--acento-degrade`. As demais ações usam a variante secundária (contorno) ou a fantasma (texto).
- **Cartões** usam `--cartao`, borda `--borda` e `--raio-g`, sem sombra. No hover, a borda passa a `--borda-forte`. Um cartão clicável também ganha `--brilho-acento` no foco.

### 2.5 Integração com o Angular Material

- O Material entra pelo **comportamento** e pela acessibilidade (CDK, overlay, abas, snackbar, diálogo). O **visual** vem dos tokens.
- As variáveis `--mat-sys-*` são mapeadas para os tokens semânticos **num único lugar**, `styles/_material.scss`, da mesma forma que hoje ficam em `styles.scss`.
- O tema `azure-blue.css` pré-compilado deve sair do `angular.json` quando o mapeamento estiver completo.
- `::ng-deep` é proibido em código novo. Se um componente do Material precisa de outro visual, o ajuste é feito por token `--mat-*` no componente `shared/ui` que o envolve.
- Quando um componente de `shared/ui` precisa estilizar conteúdo projetado (ex.: os parágrafos do `ui-como-funciona`), ele usa `ViewEncapsulation.None` com **todas** as regras escopadas na classe do próprio host (`.ui-como-funciona …`), em vez de `::ng-deep`.

### 2.6 Tema claro ("Alvorada")

O tema escuro é a identidade e continua o padrão. O tema claro está **decidido** e entra na etapa 7 da §10. Até lá, o código novo já nasce pronto para ele. A ideia é **o mesmo céu ao amanhecer**: lavanda clara no lugar do espaço, os mesmos violetas mais fundos para manter o contraste e a aurora como névoa de alvorada. Não é um tema neutro (cinza e branco), e não usa cores fora da paleta.

**Como funciona**

- **Os mesmos tokens, com outros valores.** Os valores do tema claro ficam num bloco `:root[data-tema="claro"]` em `styles/_tokens.scss`, com `color-scheme: light`. Nenhum componente troca de estilo por tema.
- **Escolha da pessoa.** No menu do perfil há três opções: Escuro (padrão), Claro e Automático (segue `prefers-color-scheme`). A escolha fica no navegador (`localStorage`) e é aplicada no `index.html` antes do Angular subir, para a tela não piscar.
- **O topo continua noturno.** A faixa do topo é sempre uma janela para o espaço: ela fixa os tokens escuros só nela, e a marca animada (`empty-variable-header.gif`) e a navegação ficam como são. É o elo visual entre os dois temas.
- **Céu e aurora.** No tema claro, o céu estrelado (`app-ceu`) não aparece. A aurora vira uma névoa suave no alto da página (`--aurora-brilho` com os mesmos três tons, em opacidade baixa). O login continua noturno, como o topo.
- **Marca.** No meio do conteúdo, a marca `{∅_}` usa o degradê fundo (`--acento-degrade`) e o `∅` em `--texto-forte`, porque o lavanda some no fundo claro.

**Valores propostos** (o contraste é o pior caso entre o `--fundo` claro, #F5F1FC, e as superfícies):

| Token             | Escuro    | Claro     | Contraste no claro                |
| ----------------- | --------- | --------- | --------------------------------- |
| `--fundo`         | `#040017` | `#F5F1FC` | —                                 |
| `--superficie`    | `#0C0628` | `#EDE6FA` | —                                 |
| `--cartao`        | `#140B36` | `#FCFAFF` | —                                 |
| `--elevado`       | `#1D1247` | `#FFFFFF` | — (no claro, mais alto é mais claro, com `--sombra-1`) |
| `--borda`         | `#2A1D5C` | `#DCD1F1` | decorativa                        |
| `--borda-forte`   | `#3A2A78` | `#BFAEE3` | decorativa                        |
| `--borda-campo`   | `#6E5DB5` | `#7A68B4` | 3,9:1 (mínimo 3:1)                |
| `--texto-forte`   | `#EED7FF` | `#170B3B` | 15,1:1                            |
| `--texto`         | `#E0C9F8` | `#2B1E5A` | 12,1:1                            |
| `--texto-suave`   | `#A99BC4` | `#544878` | 6,7:1                             |
| `--texto-apagado` | `#8E80AD` | `#675C8A` | 5,0:1                             |
| `--acento` e `--foco` | `#C65BFB` | `#7A2DD4` | 5,5:1                         |
| `--acento-suave`  | `#9D52FB` | `#9155F6` | 3,6:1 (só indicador, nunca texto) |
| `--acento-degrade` | `#9155F6 → #C65BFB` | `#6A2BD9 → #8F2FD8` | —            |
| `--sobre-acento`  | `#040017` | `#FFFFFF` | 5,9:1 no pior ponto do degradê    |
| `--destaque`      | `#CA24ED` | `#A11FC0` | 5,0:1                             |
| `--sucesso`       | `#7EE0C3` | `#0A6E52` | 5,1:1                             |
| `--alerta`        | `#F2C97D` | `#7C5200` | 5,7:1                             |
| `--erro`          | `#FF8FAB` | `#B0244A` | 5,4:1                             |
| `--info`          | `#8FB8FF` | `#2251B0` | 6,0:1                             |

Os fundos de estado (`--sucesso-fundo` e afins) e o `--acento-fundo` continuam como mistura do tom com transparente (`color-mix`), em 10% a 12%. Os tons de identidade (`--tom-*`) usam os tons fundos da mesma família (orquídea `#9A2FD0`, violeta `#6A3FE0`, lavanda `#7E5BB8`, azul, menta e névoa iguais aos estados e ao `--texto-suave` claros), todos acima de 4,2:1 contra a `--superficie` clara. As sombras passam a ser violeta e mais leves (`rgb(23 11 59 / 8%)` a `/ 14%`), não pretas.

**O que o código precisa respeitar desde já** (vale para todo código novo, mesmo antes de o tema existir):

- **Só tokens semânticos.** Nada de `white`, `black`, `#fff` ou `rgb(0 0 0 / …)` em componente: sombra é `--sombra-*` e texto sobre o acento é `--sobre-acento`. O Stylelint já barra o hex; os nomes de cor e o `rgb()` solto ficam na revisão.
- **Nada de "mais claro = mais alto" escrito à mão.** A ordem `--fundo` → `--superficie` → `--cartao` → `--elevado` é semântica, não de luminosidade.
- **Misturas com `color-mix`** usam um token e `transparent`, nunca um primitivo.
- **Imagens e ícones** de item ficam em fundo transparente, e ilustrações decorativas usam `currentColor` ou tokens.
- **Contraste conferido nos dois temas** quando o tema claro existir (§9).

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
    │   │   └── formulario/ # comportamento de formulário com Angular: validação em passos, foco em listas
    │   ├── pipes/          # pontos, zeny, datas relativas
    │   └── utils/          # funções puras sem Angular (ex.: Carregavel, pendencias, evento)
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
| `features/x/componentes`    | `shared/*` e os modelos de `features/x/data`        | `HttpClient`, `core`, `layout` e outras features |
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

**Já existem** (etapa 3, com exemplo em `/dev/catalogo`): `ui-pagina`, `button[uiBotao]`, `ui-cartao`, `ui-resumo`, `ui-chips-filtro`, `ui-estado`, `ui-vazio`, `ui-skeleton`, `ui-aviso`, `ui-painel-lateral`, `ui-como-funciona` e `table[uiTabela]`, além do tipo `Carregavel<T>` em `shared/utils/carregavel.ts`. Na etapa 4 entraram `ui-marca` e o pipe `pontos` (`shared/pipes/pontos.pipe.ts`). Com a loja: `ui-badge`, `ui-campo` (com a diretiva `uiCampo` no controle; `rotuloOculto` entrou com o farm, só para célula de tabela) e `ui-confirmacao` (aberto pelo serviço `Confirmacao`, em `core/confirmacao.ts`). Com as runs: `ui-grupo-campos`. Com os grupos: `ui-acoes-passo` e `ui-pendencias` (vieram do assistente de run), e a validação em passos e o foco em listas em `shared/ui/formulario/` (`validacao-passos.ts` e `foco.ts`: usam signals e `afterNextRender`, por isso não ficam em `shared/utils`). Os tipos puros das pendências (`Pendencia`, `textoPendencia`) ficam em `shared/utils/pendencias.ts`, para as regras em `features/x/data` os usarem. `app-icone`, `app-imagem-item` e `visual.ts` já estão em `shared/dominio/`. Os demais da tabela nascem quando a primeira tela precisar deles (§1.1).

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
| `ui-acoes-passo`          | Molécula | Rodapé de um passo do `mat-stepper`: Voltar, principal sempre clicável e Cancelar opcional                     | Rodapés repetidos dos assistentes |
| `ui-pendencias`           | Molécula | Resumo do que falta num passo, anunciado ao leitor de tela; recebe o foco quando a pendência não tem campo      | Listas soltas de pendências |
| `ui-grupo-campos`         | Molécula | Fieldset com legenda: os `ui-campo` de um item (participante, empréstimo, drop) numa grade fluida, com slot de ações | `fieldset.linha` repetido no assistente de run |
| `ui-painel-lateral`       | Organismo | Formulário de criar e editar à direita, com o foco preso e devolvido ao fechar     | `app-painel-lateral` (de `core/layout.ts`)           |
| `ui-como-funciona`        | Molécula | Explicação recolhida                                                              | `app-como-funciona` (de `core/layout.ts`)            |
| `ui-confirmacao`          | Organismo | Diálogo de confirmação para ações destrutivas, com descrição do efeito            | `confirm()` e confirmações ad hoc                    |
| `table[uiTabela]`         | Organismo | Tabela responsiva. É **diretiva**, porque também vai em `<table mat-table>`; o estilo fica em `tabela/tabela.scss`, escopado em `table.ui-tabela` e carregado por `styles.scss`. Com `padrao` (`<table uiTabela padrao>`), dá a aparência das células, e `class="numero"` alinha números à direita; sem ele, nada muda nas tabelas antigas | `appResponsiva`, `.tabela-responsiva` |
| `ui-badge`                | Átomo | Rótulo de status com tom semântico                                                | chips de status de compra e run                      |
| `ui-marca`                | Átomo | Logotipo `{∅_}`: em texto, com o cursor animado, ou a imagem animada (`variante="animada"`) | (novo)                                    |
| Pipes `pontos` e `zeny`   | — | Formatação pt-BR com sufixo e `tabular-nums`                                      | `number` + " pts" repetido                           |

Os componentes de RO, usados por mais de uma feature, vão para `shared/dominio/`: `app-icone`, `app-imagem-item`, `app-icone-classe`, `app-equipamento-select` e `app-busca-item`.

**Para criar um componente UI novo:**

1. confirme que nenhum componente existente resolve com uma variante;
2. crie em `shared/ui/<nome>/` o componente e o `.spec.ts`;
3. documente os inputs com JSDoc;
4. crie o `<nome>.catalogo.ts` e registre a entrada no catálogo (§8.2);
5. acrescente uma linha na tabela acima, no mesmo PR.

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
  - **Exceção:** campo editável dentro de célula de tabela. O cabeçalho da coluna é o rótulo visível, e o `ui-campo` usa `rotuloOculto` com o rótulo completo para o leitor de tela (ex.: coluna "Preço de venda", rótulo "Preço de Oridecon").
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

O mesmo app serve o celular de quem confere o farm no meio do jogo e o monitor largo de quem lança uma run. Nenhuma tela é "só desktop".

**Faixas e onde elas valem**

| Faixa         | Largura do contêiner | O que muda                                                      |
| ------------- | -------------------- | --------------------------------------------------------------- |
| Celular       | até 600 px           | Uma coluna; ações quebram linha; painel lateral e diálogo em tela cheia |
| Celular largo | 601 a 760 px         | Grades com 2 colunas; tabelas ainda em modo cartão              |
| Tablet e notebook | 761 a 1279 px    | Tabelas viram tabela; menu em trilho ao lado                    |
| Desktop       | 1280 px ou mais      | Grades com mais colunas; o conteúdo cresce até `--largura-conteudo` (1600 px) |

- **Componentes respondem ao contêiner, não à janela.** Use `@container conteudo (…)`: o contêiner `conteudo` é a área principal da casca. Media query (`@media`) só aparece em `layout/` e nos estilos globais.
- **Mobile first.** O estilo base é o do celular; as faixas maiores acrescentam (`min-width`). Exceção: o `uiTabela`, que já nasce tabela e vira cartão abaixo de 761 px.
- **Grades fluidas** com `repeat(auto-fill, minmax(min(100%, <mínimo>), 1fr))`, em vez de número fixo de colunas. O `min(100%, …)` evita estourar a 320 px.
- **Larguras fixas de coluna** (ex.: a coluna de ações com `width: 1%`) só dentro de `@container conteudo (min-width: 761px)`. No modo cartão, cada célula ocupa a linha (lição do farm).
- **Texto longo** (nomes de item, de instância, apelidos) quebra com `overflow-wrap: anywhere`. Nada de `white-space: nowrap` em nome, só em datas e números curtos. Texto corrido fica limitado a 80 caracteres por linha.
- **Alturas:** nada de altura fixa em bloco com texto (quebra com zoom e com o espaçamento de texto do §7). Tela cheia usa `dvh`, e elementos fixos no rodapé respeitam `env(safe-area-inset-bottom)`.
- **Imagens** com `aspect-ratio` e `max-width: 100%`, nunca com largura e altura fixas ao mesmo tempo.
- **Toque:** alvos com no mínimo 40×40 px e 8 px entre alvos vizinhos. Nada depende de hover: informação que só aparece com o mouse em cima não existe no celular (lição da Nebula). `@media (hover: hover)` serve só para enfeite.
- **Orientação:** nenhuma tela trava retrato ou paisagem.
- **Sem rolagem horizontal** da página a **320 px** de largura (WCAG 1.4.10, equivale a 1280 px com zoom de 400%). Só uma tabela muito larga pode rolar dentro do próprio contêiner, e com `tabindex="0"` e `aria-label` para ser rolada pelo teclado.

**Como conferir:** cada PR de tela traz prints a 360 px e a 1280 px, e a tela é aberta a 320 px e com zoom de 200% antes do PR.

---

## 7. Acessibilidade (WCAG 2.2 AA)

O mínimo é o **WCAG 2.2 nível AA**. A acessibilidade é conferida em cada PR, e não numa revisão no fim.

**Estrutura e navegação**

- `lang="pt-BR"` no `index.html` *(já existe)*; marcos `header`, `nav` e `main` na casca *(já existem)*.
- **Um `h1` por página** (o do `ui-pagina`), hierarquia de títulos sem pular nível, e cada seção com título (`aria-labelledby`).
- **Título da aba por rota** (`title` na rota, "Tela · Empty Variable") *(já existe)*.
- **Link "Ir para o conteúdo"**, o primeiro foco da página, visível ao receber foco *(falta: §10, etapa 5)*.
- **Ao trocar de rota, o foco vai para o `h1`** da página nova, e o título é anunciado *(falta: §10, etapa 5)*. Sem isso, quem usa leitor de tela não percebe a navegação.
- **Item ativo do menu** com `aria-current="page"` *(já existe)*.
- `button` para ações e `a` para navegação; nunca `div` ou `span` com `(click)`.

**Teclado e foco**

- **Tudo funciona sem mouse**, na ordem visual de leitura. Nada de `tabindex` maior que 0.
- **Foco visível** em tudo que é interativo: `outline: 2px solid var(--foco)` com `offset: 2px`. Nunca use `outline: none` sem substituto.
- **Foco não encoberto** (WCAG 2.4.11): o topo fixo não pode cobrir o elemento focado. A casca usa `scroll-padding-top` com a altura do topo.
- **Painéis e diálogos:** Esc fecha, o foco fica preso dentro enquanto estão abertos (CDK `cdkTrapFocus`), vai ao primeiro campo ao abrir e volta ao botão de origem ao fechar.
- **Conteúdo que some da tela** (aba trocada, linha removida, formulário fechado) não leva o foco junto: ele vai para o próximo item lógico ou para o título da área.

**Formulários**

- Rótulo visível em todo campo (§6.4), com a exceção da célula de tabela.
- **Erro ligado ao campo** (`aria-describedby` e `aria-invalid`, que o `ui-campo` já aplica), em texto que diz como corrigir.
- **`autocomplete`** nos campos de dado pessoal, e nada de pedir de novo um dado que a pessoa já informou no mesmo fluxo (WCAG 3.3.7).
- O login é pelo Discord: nenhum teste cognitivo nem captcha na tela (WCAG 3.3.8).

**Conteúdo dinâmico**

- **Mensagens:** `role="status"` para informação e `role="alert"` para erro. O `ui-aviso` já aplica o certo.
- **Carregamento:** o esqueleto é escondido do leitor de tela, e um `role="status"` anuncia que está carregando (o `ui-estado` já faz os dois). Resultados de filtro e busca anunciam a contagem ("3 itens").
- **Snackbar** (`Acao.executar`): é anunciado pelo leitor de tela. Erro que exige ação da pessoa não pode depender só do snackbar, que some em 4 s: ele também aparece na tela (ex.: o `ui-aviso` do formulário) até ser resolvido.
- **Conteúdo em hover ou foco** (dica, menu): some com Esc, não some quando o mouse passa por cima dele e não guarda informação que não esteja em outro lugar (WCAG 1.4.13).

**Cor, imagem e movimento**

- **Contraste:** texto ≥ 4,5:1, texto grande ≥ 3:1, contornos de controle e ícones com significado ≥ 3:1. Os tokens da §2 cumprem isso nos dois temas; misturas novas precisam ser medidas.
- **Nunca só a cor:** estado sempre tem ícone ou texto junto (selos, chips, linhas de tabela, barras de progresso com o número ao lado).
- **Botões só com ícone** têm `aria-label`; imagens de item têm `alt` com o nome; ícones e ilustrações decorativos têm `aria-hidden="true"`.
- **Tabelas** com `th scope="col"` e um nome (`caption` ou `aria-label`); no modo cartão, o `uiTabela` repete o cabeçalho em cada célula.
- **Movimento:** `prefers-reduced-motion` desliga animações, o cursor piscando, a estrela cadente e os brilhos que se movem. Nada pisca mais de 3 vezes por segundo.
- **Zoom e texto:** a tela funciona com zoom de 200% e com o espaçamento de texto aumentado (WCAG 1.4.12) sem cortar conteúdo, por isso blocos com texto não têm altura fixa.

**Toque e gestos**

- Alvos de toque com no mínimo 40×40 px (o AA pede 24 px; adotamos mais por causa do uso no celular).
- Toda ação de arrastar tem alternativa por clique (WCAG 2.5.7). Gestos de vários dedos não são exigidos.

**Como conferir**

- O lint de template (`templateAccessibility`) roda no CI (§8.3).
- Os specs de componente conferem papéis, `aria-*` e o uso pelo teclado (Enter, Espaço, Esc, Tab).
- Antes do PR, a tela é percorrida só com o teclado e com zoom de 200%.
- Quando uma feature é liberada, alguém a percorre com um leitor de tela (NVDA no Windows ou VoiceOver no macOS ou iOS).
- **Sem varredura automática com axe:** decidido na validação, para não acrescentar dependência de teste. A conferência fica com o lint, os specs e a revisão manual acima.

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

O catálogo é a rota **`/dev/catalogo`**, que só existe fora de produção (decidido na validação, no lugar do Storybook, para não acrescentar dependências nem um build separado no CI).

- **Rodar:** `pnpm --filter @betel/web start` e abrir `/dev/catalogo`. No build de produção, `dev/dev.routes.ts` é trocado por `dev.routes.producao.ts` (lista vazia, via `fileReplacements` no `angular.json`): a rota não existe e nenhum arquivo do catálogo é publicado.
- **Cada componente de `shared/ui`** tem ao lado um `<nome>.catalogo.ts`, que exporta um componente standalone (`<Nome>CatalogoComponent`) com o componente real em cada variante e estado: padrão, desabilitado, carregando, erro e texto longo.
- **Registro:** uma entrada em `web/src/app/dev/catalogo/entradas.ts`, com `id` (kebab-case, vira a URL), `nome` (o seletor), `nivel` (§3.3), `descricao` (uma frase) e `carregar` (import dinâmico do `*.catalogo.ts`). O spec do catálogo confere que todo exemplo registrado carrega.
- **Revisão de PR:** componentes visuais novos ou alterados são conferidos no catálogo antes da tela.

Componente sem exemplo no catálogo não é aprovado.

### 8.3 Regras verificadas pelo linter

O que pode ser checado por máquina não depende de revisão humana. As regras abaixo entram no `eslint.config.mjs` (com `angular-eslint`) e no CI:

| Regra                                          | Como                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Prefixo de seletor (`ui-` em `shared/ui`, `app-` no resto) | `@angular-eslint/component-selector` e `directive-selector`, por pasta |
| Sufixo de classe (`Page` em páginas, `Component` no resto) | `@angular-eslint/component-class-suffix` |
| `OnPush` em componentes                        | `@angular-eslint/prefer-on-push-component-change-detection`          |
| Signals em vez de decoradores                  | `@angular-eslint/prefer-signals` e `no-input-rename`/`no-output-rename` |
| Sem `HttpClient` fora de `data/` e `core/`     | `no-restricted-imports` em `shared/**`, `features/*/componentes/**` e `features/*/paginas/**` |
| Fronteiras entre camadas (§3.1)                | Regra local `betel/fronteiras` (`tools/eslint/fronteiras-frontend.mjs`), que resolve os imports relativos e aplica a tabela da §3.1 |
| Sem hex e sem `::ng-deep` em componentes       | Stylelint nos `.scss` (`color-no-hex` fora de `styles/_tokens.scss` e `selector-pseudo-element-disallowed-list`); nos estilos inline (`styles:` do `.ts`), `no-restricted-syntax` do ESLint |
| Acessibilidade de template                     | `angular.configs.templateAccessibility` (alt, label, foco, papéis)   |

Enquanto o código antigo não migrar, essas regras rodam como **erro** em `shared/`, `features/`, `layout/` e `dev/`, e como **aviso** em `paginas/`, `core/` e nos arquivos da raiz de `app/` (inclusive as regras gerais de TypeScript, que o `web/` não tinha). Por isso código novo nasce nas pastas novas, e não em `paginas/` ou `core/`.

`pnpm lint` roda o ESLint e o Stylelint (`stylelint.config.mjs`). Os avisos do código antigo aparecem na saída, mas não falham o CI.

---

## 9. Checklist de PR (frontend)

- [ ] Nenhum hex, px solto de espaçamento ou sombra fora de `styles/_tokens.scss`.
- [ ] A página usa `ui-pagina` e reaproveita componentes de `shared/ui`. Nenhum HTML ou CSS de botão, cartão ou estado foi reinventado.
- [ ] Componentes novos são `OnPush`, usam signals (`input`/`output`) e o fluxo de controle novo.
- [ ] Nenhuma página ou componente injeta `HttpClient`. As chamadas estão em `data/*.api.ts`.
- [ ] Estados de carregando, vazio, erro e sem permissão estão tratados.
- [ ] Ações destrutivas pedem confirmação. Botões ficam em `carregando` durante o envio.
- [ ] Funciona só no teclado, com foco visível e não encoberto, e o contraste foi conferido (§7).
- [ ] Funciona a 320 px de largura sem rolagem horizontal e com zoom de 200%; os prints de 360 px e 1280 px estão no PR (§6.6).
- [ ] Nenhuma informação depende só de hover ou só de cor.
- [ ] Só tokens semânticos: nada de `white`, `black` ou `rgb(0 0 0 / …)` em componente, para o tema claro (§2.6). Quando o tema claro existir, a tela foi conferida nos dois temas.
- [ ] Os specs foram atualizados e os `data-testid` estão nos elementos que o e2e usa.
- [ ] Componente UI novo está registrado na tabela da §5, com o seu nível, e tem exemplo no catálogo (§8.2).
- [ ] O componente tem um propósito só e respeita os níveis (§3.3). Ele só foi para `shared/` se a regra de três (§1.1) se aplica.
- [ ] Mudança de API de componente compartilhado atualizou todos os usos.
- [ ] `pnpm lint` passa sem novos avisos.

---

## 10. Migração do código atual

A migração é incremental, sem reescrita geral. Vale a **regra do escoteiro**: quem mexer numa tela migra essa tela.

### 10.1 Estado em 22/11/2026

**Feito**

- **Etapas 1 a 3:** tokens e mapeamento do Material, lint e catálogo, peças base de `shared/ui` e a casca (`layout/`), com o login.
- **Features em `features/`:** acesso (login), loja, carteira (com a Minha área), farm, Nebula (com a fila do admin em `/admin/nebula`), vínculo (com a fila de aprovações), runs (lista, assistente, correção e detalhe) e grupos (gestão dos grupos de instância e a agenda do membro em `/instancias-programadas`).
- **Revisões do TL:** cada feature teve um PR de acertos depois da revisão. As pendências que dependem da API estão em 10.3.

**Falta**

- **17 arquivos em `paginas/`**, com cerca de 6.200 linhas. Os maiores: `simulador.component.ts` (1.390), `simulador-hub.component.ts` (682) e `admin-estoque.component.ts` (621).
- **Domínio ainda em `core/`:** `estoque.ts`, `link-simulador.ts` e `painel.ts`. Ao fim da migração, `core/` fica só com singletons (autenticação, guardas, `Acao`, `Confirmacao`, saldo e telas liberadas).
- **Estilos legados:** `_legado.scss` (cerca de 300 linhas, 29 classes globais), os apelidos dos tokens antigos e o tema `azure-blue.css` no `angular.json`.
- **Lint:** 63 avisos, todos no código antigo (`paginas/` e `core/`).
- **Acessibilidade da casca:** faltam o link "Ir para o conteúdo", o foco no `h1` ao trocar de rota e o `scroll-padding-top` do topo fixo (§7).

### 10.2 Próximas etapas

A ordem é pelo uso: primeiro as telas **liberadas em produção** (`core/telas-liberadas.ts`), que as pessoas usam hoje, e depois as que ainda não foram liberadas. Em cada feature:

- criar `data/*.api.ts`;
- levar o domínio de `core/` para `data/` (ou para `shared/dominio`, se mais de uma feature usa);
- trocar o HTML e o CSS locais por componentes;
- quebrar os arquivos com mais de 300 linhas;
- atualizar o e2e da tela.

4. **Features restantes, uma por vez:**
   - a. **Vínculo e perfil** *(feita: `features/vinculo`, com a fila em `/vinculo/aprovacoes`; a Minha área, `/me`, foi para `features/carteira`, porque mostra o saldo e o extrato. `build.ts`, `grupos-classes.ts` e `icones-classes.ts` foram para `shared/dominio`, e os tipos da build saíram de `core/modelos.ts` para `shared/dominio/build.ts`)*.
   - b. **Runs e grupos** *(feita)*: em dois PRs.
     - **Runs** *(feita: `features/runs`, com `gestao/runs` (lista, nova, corrigir e detalhe). O assistente foi quebrado em um componente por passo, e o rascunho é editado sem mutação (`data/edicao-run.ts`). `runs.ts` foi dividido em `data/` (`runs.modelos.ts`, `previa-run.ts`, `detalhe-run.modelos.ts` e `nag4eyes.modelos.ts`), e `instancias.ts` e `cadastros.ts` foram para `shared/dominio`. O tipo e os rótulos dos lançamentos saíram da carteira para `shared/dominio/lancamento.ts`, porque o detalhe da run também os mostra)*.
     - **Grupos** *(feita: `features/grupos`, com `gestao/grupos` (lista, assistente de grupo novo e escala, com `?grupo=<id>`) e `instancias-programadas`. As rotas e as telas liberadas não mudaram. O assistente usa o mesmo padrão do de run, que foi para `shared`: `ui-acoes-passo`, `ui-pendencias` e `shared/ui/formulario`)*.
   - c. **Estoque e itens** *(o estoque é liberado)*: `admin/estoque` e `admin/itens`, com `estoque.ts`.
   - d. **Simulador** *(liberado)*: `simulador` (hub) e `simulador/estimativa`, com `link-simulador.ts`. Pelo tamanho, deve sair em 2 ou 3 PRs, como o farm.
   - e. **Gestão** *(não liberada)*: início da gestão, `gestao/instancias` (lista e detalhe), saldos, jogadores, classes, parâmetros e receitas da Nebula, com `painel.ts`.
   - f. **Admin** *(não liberado)*: início do admin, compras, ofertas, taxa e usuários.
5. **Acessibilidade e responsividade da casca.** É um PR pequeno, que pode entrar a qualquer momento (não depende da etapa 4):
   - o link "Ir para o conteúdo";
   - o foco no `h1` e o anúncio do título ao trocar de rota;
   - o `scroll-padding-top` com a altura do topo;
   - o menu no celular continua no alto da página por enquanto. Se ele vira uma barra fixa embaixo, ao alcance do polegar, será decidido depois.
6. **Limpeza.**
   - Remover o `_legado.scss` e as classes globais (`.botao-acao`, `.chip`, `.resumo-*`, `.cartao-*`, `.pagina`…) quando nenhuma tela usar mais.
   - Remover os apelidos dos tokens antigos.
   - Remover o tema `azure-blue.css`, conferindo que o `_material.scss` cobre todos os `--mat-sys-*`.
   - Apagar `paginas/` e deixar em `core/` só os singletons.
   - Trocar os avisos do lint por erro em todo o `app/` (§8.3).
7. **Tema claro** (§2.6). Depende da limpeza: sem apelidos e sem o `azure-blue.css`, há um só lugar de cores para trocar.
   - Criar o bloco `:root[data-tema="claro"]` com os valores da §2.6 e as variantes do céu, da aurora e da marca.
   - Criar a escolha de tema no menu do perfil (Escuro, Claro e Automático) e o script no `index.html` que aplica a escolha antes do Angular subir.
   - Conferir o contraste de todas as telas e do catálogo nos dois temas e acrescentar o tema ao catálogo (§8.2).

Pela conta de hoje, são de 10 a 12 PRs até o fim da etapa 7, contando os PRs de acertos depois de cada revisão.

### 10.3 Pendências fora do frontend

- **Nebula:** a solicitação não manda o preço que o membro viu, e a API cobra o preço vigente. Precisa de um `precoEsperado` na API, como na loja, antes de liberar a Nebula.
- **e2e da Nebula:** o `nebula.spec.ts` só passa rodando sozinho. Depois do `estoque.spec.ts`, no mesmo banco, a preparação recebe 409 (lote ativo). Precisa ser ajustado antes de entrar no `testMatch`.

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
