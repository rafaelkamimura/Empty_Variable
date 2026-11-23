// Registro do catálogo vivo (docs/frontend/diretrizes.md §8.2).
//
// Todo componente de shared/ui tem uma entrada aqui, apontando para o arquivo
// shared/ui/<nome>/<nome>.catalogo.ts, que exporta um componente standalone com os exemplos.
// Componente sem entrada no catálogo não é aprovado (§9).
import type { EntradaCatalogo } from "./catalogo.modelos";

export const ENTRADAS_CATALOGO: readonly EntradaCatalogo[] = [
  {
    id: "tokens",
    nome: "Tokens",
    nivel: "tokens",
    descricao: "Cores, espaçamentos, raios e tipografia de styles/_tokens.scss.",
    carregar: () => import("./tokens.catalogo").then((m) => m.TokensCatalogoComponent),
  },
  {
    id: "botao",
    nome: "button[uiBotao]",
    nivel: "atomo",
    descricao: "Botão nas variantes principal, secundário, fantasma e perigo, com estado carregando.",
    carregar: () => import("../../shared/ui/botao/botao.catalogo").then((m) => m.BotaoCatalogoComponent),
  },
  {
    id: "skeleton",
    nome: "ui-skeleton",
    nivel: "atomo",
    descricao: "Placeholder animado em linhas, cartões ou tabela.",
    carregar: () =>
      import("../../shared/ui/skeleton/skeleton.catalogo").then((m) => m.SkeletonCatalogoComponent),
  },
  {
    id: "aviso",
    nome: "ui-aviso",
    nivel: "molecula",
    descricao: "Mensagem inline com tom, ícone e papel ARIA corretos.",
    carregar: () => import("../../shared/ui/aviso/aviso.catalogo").then((m) => m.AvisoCatalogoComponent),
  },
  {
    id: "vazio",
    nome: "ui-vazio",
    nivel: "molecula",
    descricao: "Estado vazio com a marca {∅_}, uma frase e a ação opcional.",
    carregar: () => import("../../shared/ui/vazio/vazio.catalogo").then((m) => m.VazioCatalogoComponent),
  },
  {
    id: "resumo",
    nome: "ui-resumo",
    nivel: "molecula",
    descricao: "Bloco de indicador: rótulo, número e contexto.",
    carregar: () => import("../../shared/ui/resumo/resumo.catalogo").then((m) => m.ResumoCatalogoComponent),
  },
  {
    id: "chips-filtro",
    nome: "ui-chips-filtro",
    nivel: "molecula",
    descricao: "Filtros em chip com contagem, seleção única ou múltipla.",
    carregar: () =>
      import("../../shared/ui/chips-filtro/chips-filtro.catalogo").then(
        (m) => m.ChipsFiltroCatalogoComponent,
      ),
  },
  {
    id: "cartao",
    nome: "ui-cartao",
    nivel: "organismo",
    descricao: "Superfície de conteúdo; clicável em a[uiCartao] e button[uiCartao].",
    carregar: () => import("../../shared/ui/cartao/cartao.catalogo").then((m) => m.CartaoCatalogoComponent),
  },
  {
    id: "estado",
    nome: "ui-estado",
    nivel: "organismo",
    descricao: "Renderiza um Carregavel: skeleton, erro, vazio ou os dados.",
    carregar: () => import("../../shared/ui/estado/estado.catalogo").then((m) => m.EstadoCatalogoComponent),
  },
  {
    id: "pagina",
    nome: "ui-pagina",
    nivel: "template",
    descricao: "Esqueleto de página: título, frase, ação principal, abas e conteúdo.",
    carregar: () => import("../../shared/ui/pagina/pagina.catalogo").then((m) => m.PaginaCatalogoComponent),
  },
  {
    id: "como-funciona",
    nome: "ui-como-funciona",
    nivel: "molecula",
    descricao: "Explicação longa recolhida num details.",
    carregar: () =>
      import("../../shared/ui/como-funciona/como-funciona.catalogo").then(
        (m) => m.ComoFuncionaCatalogoComponent,
      ),
  },
  {
    id: "painel-lateral",
    nome: "ui-painel-lateral",
    nivel: "organismo",
    descricao: "Formulário de criar e editar à direita, com foco preso e devolvido.",
    carregar: () =>
      import("../../shared/ui/painel-lateral/painel-lateral.catalogo").then(
        (m) => m.PainelLateralCatalogoComponent,
      ),
  },
  {
    id: "tabela",
    nome: "table[uiTabela]",
    nivel: "organismo",
    descricao: "Tabela sem rolagem; vira cartões em espaço estreito.",
    carregar: () => import("../../shared/ui/tabela/tabela.catalogo").then((m) => m.TabelaCatalogoComponent),
  },
  {
    id: "marca",
    nome: "ui-marca",
    nivel: "atomo",
    descricao: "A marca {∅_}: em texto, com o cursor piscando, ou a imagem animada do topo e do login.",
    carregar: () => import("../../shared/ui/marca/marca.catalogo").then((m) => m.MarcaCatalogoComponent),
  },
  {
    id: "badge",
    nome: "ui-badge",
    nivel: "atomo",
    descricao: "Rótulo de status com tom semântico.",
    carregar: () => import("../../shared/ui/badge/badge.catalogo").then((m) => m.BadgeCatalogoComponent),
  },
  {
    id: "campo",
    nome: "ui-campo",
    nivel: "molecula",
    descricao: "Rótulo, controle, dica e erro ligados por aria-describedby.",
    carregar: () => import("../../shared/ui/campo/campo.catalogo").then((m) => m.CampoCatalogoComponent),
  },
  {
    id: "grupo-campos",
    nome: "ui-grupo-campos",
    nivel: "molecula",
    descricao: "Fieldset com legenda que junta os campos de um item numa grade fluida, com ações abaixo.",
    carregar: () =>
      import("../../shared/ui/grupo-campos/grupo-campos.catalogo").then(
        (m) => m.GrupoCamposCatalogoComponent,
      ),
  },
  {
    id: "confirmacao",
    nome: "ui-confirmacao",
    nivel: "organismo",
    descricao: "Diálogo de confirmação para ações destrutivas, com o efeito e o verbo.",
    carregar: () =>
      import("../../shared/ui/confirmacao/confirmacao.catalogo").then((m) => m.ConfirmacaoCatalogoComponent),
  },
];
