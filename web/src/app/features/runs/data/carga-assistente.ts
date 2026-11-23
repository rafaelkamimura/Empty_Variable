// Carga do assistente de run: catálogos, parâmetros e o rascunho inicial (novo, do nag4eyes ou de
// correção), num só objeto. Erros de HTTP sobem; os de regra voltam como mensagem.
import type { Classe, ItemCatalogo, VersaoParametros } from "../../../shared/dominio/cadastros";
import { type Instancia, recebeRun } from "../../../shared/dominio/instancias";
import { instanciaInicial } from "./assistente-run.modelos";
import { rascunhoDeRun } from "./detalhe-run.modelos";
import { type RascunhoNag4eyes, rascunhoDeNag4eyes } from "./nag4eyes.modelos";
import type { RunsApi } from "./runs.api";
import {
  ajustarAVersaoVigente,
  type Catalogos,
  type JogadorCadastro,
  novoRascunho,
  type RascunhoRun,
} from "./runs.modelos";

/** Tudo que o assistente carrega antes de mostrar os passos. */
export interface ContextoAssistente {
  readonly jogadores: readonly JogadorCadastro[];
  readonly instancias: readonly Instancia[];
  readonly itens: readonly ItemCatalogo[];
  /** Classes com as funções da versão vigente da instância escolhida (D45). */
  readonly classes: readonly Classe[];
  /** Parâmetros da pontuação: os vigentes, ou os da run original na correção (D17). */
  readonly config: VersaoParametros;
  /** Id da run que está sendo corrigida (US-07), ou null. */
  readonly correcaoDe: string | null;
  /** Rascunho do nag4eyes que pré-preencheu a run, ou null. */
  readonly origem: RascunhoNag4eyes | null;
}

export type CargaAssistente =
  | { readonly ok: true; readonly contexto: ContextoAssistente; readonly run: RascunhoRun }
  | { readonly ok: false; readonly mensagem: string };

/** Catálogos no formato das regras puras (pendências, prévia e corpo). */
export function catalogosDe(c: ContextoAssistente): Catalogos {
  return { jogadores: c.jogadores, classes: c.classes, instancias: c.instancias, itens: c.itens };
}

export async function carregarAssistente(
  api: RunsApi,
  opcoes: { readonly correcaoDe?: string; readonly rascunhoId?: string },
): Promise<CargaAssistente> {
  const [jogadores, instancias, itens, versoes] = await Promise.all([
    api.jogadores(),
    api.instancias(),
    api.itens(),
    api.versoesParametros(),
  ]);
  const base = { jogadores, instancias, itens };
  return opcoes.correcaoDe === undefined
    ? carregarNova(api, base, versoes, opcoes.rascunhoId)
    : carregarCorrecao(api, base, versoes, opcoes.correcaoDe);
}

type Base = Pick<ContextoAssistente, "jogadores" | "instancias" | "itens">;
const semParametros: CargaAssistente = { ok: false, mensagem: "Nenhuma versão de parâmetros encontrada." };

/** Run nova, talvez a partir de um rascunho do nag4eyes. */
async function carregarNova(
  api: RunsApi,
  base: Base,
  versoes: readonly VersaoParametros[],
  rascunhoId: string | undefined,
): Promise<CargaAssistente> {
  const config = versoes[0];
  if (config === undefined) return semParametros;
  let origem: RascunhoNag4eyes | null = null;
  if (rascunhoId) {
    origem = await api.rascunho(rascunhoId);
    if (origem.status !== "PENDENTE")
      return { ok: false, mensagem: "Este rascunho já foi confirmado ou descartado." };
  }
  // CT-146: só instâncias ativas e com funções recebem run.
  const inicial = instanciaInicial(base.instancias.filter(recebeRun), origem);
  if (inicial === undefined)
    return {
      ok: false,
      mensagem: "Nenhuma instância ativa com funções. Cadastre uma em Gestão → Instâncias.",
    };
  const vazio = novoRascunho(inicial.id, inicial.vigente?.encontros[0]?.id ?? null);
  const classes = await api.classes(inicial.id);
  return {
    ok: true,
    contexto: { ...base, classes, config, correcaoDe: null, origem },
    run: origem === null ? vazio : rascunhoDeNag4eyes(origem, vazio),
  };
}

/** Correção (US-07): a run como foi registrada, na versão vigente da instância (D46). */
async function carregarCorrecao(
  api: RunsApi,
  base: Base,
  versoes: readonly VersaoParametros[],
  id: string,
): Promise<CargaAssistente> {
  const run = await api.detalhe(id);
  if (run.status === "ESTORNADA") return { ok: false, mensagem: "Esta run já foi corrigida." };
  // D17: a correção usa os parâmetros da run original.
  const config = versoes.find((v) => v.id === run.config.id);
  if (config === undefined) return semParametros;
  const classes = await api.classes(run.versaoInstancia.instancia.id);
  const contexto: ContextoAssistente = { ...base, classes, config, correcaoDe: id, origem: null };
  return {
    ok: true,
    contexto,
    run: ajustarAVersaoVigente(rascunhoDeRun(run), catalogosDe(contexto), {
      encontro: run.encontro.nome,
      funcoes: new Map(run.participacoes.map((p) => [p.funcao.id, p.funcao.nome])),
    }),
  };
}
