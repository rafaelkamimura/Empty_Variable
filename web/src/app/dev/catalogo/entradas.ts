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
];
