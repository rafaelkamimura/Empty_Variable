// Leitura do report.json de um patch (D63), como o rolatam-dm publica.
//
// O arquivo vem de outra ferramenta e pode crescer ou faltar pedaço: `mapearRelatorio` lê cada
// campo com defesa (lista ausente vira lista vazia, tipo errado vira o valor neutro) e entrega o
// modelo completo da tela, já com a categoria de cada item e o texto de busca de cada linha.
import { categoriaDoItem } from "./categorias";
import { normalizarBusca } from "./filtro";
import {
  type ArquivoGrf,
  type CaixaPatch,
  type EstadoArquivo,
  type ItemAlterado,
  type ItemPatch,
  type LinhaCaixa,
  type MapaPatch,
  type MetaPatch,
  type MonstroPatch,
  type MudancaLua,
  type PastaDoCliente,
  type QuestPatch,
  type RelatorioPatch,
  type ResumoGrf,
  type SituacaoArquivo,
  type SituacaoNovaOuAlterada,
  type SituacaoTabela,
  type SkillPatch,
  type Snapshot,
  type TabelaLua,
  type TextoDaQuest,
  type TextoPatch,
  rotuloDoTipoGrf,
} from "./relatorio.modelos";
import { textoPuroRo } from "./texto-ro";

type Objeto = Record<string, unknown>;

const ehObjeto = (v: unknown): v is Objeto => typeof v === "object" && v !== null && !Array.isArray(v);
const objeto = (v: unknown): Objeto => (ehObjeto(v) ? v : {});
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const texto = (v: unknown): string =>
  typeof v === "string" ? v : typeof v === "number" && Number.isFinite(v) ? String(v) : "";
const numero = (v: unknown): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : 0;
};
const verdadeiro = (v: unknown): boolean => v === true || v === 1 || v === "1" || v === "true";
const textos = (v: unknown): string[] =>
  lista(v)
    .map(texto)
    .filter((t) => t !== "");

/** Linhas de texto: aceita lista de strings ou um texto só, com quebras de linha. */
function linhas(v: unknown): string[] {
  if (typeof v === "string") return v === "" ? [] : v.split(/\r?\n/);
  return lista(v).map(texto);
}

/** Um valor qualquer em texto: string como está, tabela em JSON legível, nulo vazio. */
export function emTexto(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v, null, 1) ?? "";
  } catch {
    return "";
  }
}

function mapearItem(bruto: unknown): ItemPatch {
  const o = objeto(bruto);
  const id = numero(o["id"]);
  const nome = texto(o["name"]);
  const descricao = linhas(o["desc"]);
  const traje = verdadeiro(o["costume"]);
  const nomeNaoIdentificado = texto(o["uname"]);
  const recurso = texto(o["res"]);
  const efeito = o["effect"];
  return {
    id,
    nome,
    recurso,
    nomeNaoIdentificado,
    descricao,
    descricaoNaoIdentificada: linhas(o["udesc"]),
    slots: numero(o["slots"]),
    visual: numero(o["cls"]),
    traje,
    efeito: typeof efeito === "number" && Number.isFinite(efeito) ? efeito : null,
    categoria: categoriaDoItem({ id, nome, traje }),
    busca: normalizarBusca([id, nome, recurso, ...descricao.map(textoPuroRo)].join(" ")),
  };
}

function mapearItemAlterado(bruto: unknown): ItemAlterado {
  const o = objeto(bruto);
  const antes = mapearItem(o["old"]);
  const depois = mapearItem(o["new"]);
  return {
    antes,
    depois,
    campos: textos(o["fields"]),
    categoria: depois.categoria,
    busca: `${depois.busca} ${normalizarBusca(antes.nome)}`,
  };
}

function mapearLinhaCaixa(bruto: unknown, somaDosPesos: number): LinhaCaixa {
  const o = objeto(bruto);
  const peso = numero(o["prob"]);
  const pct = o["pct"];
  return {
    id: numero(o["id"]),
    nome: texto(o["name"]),
    grupo: numero(o["group"]),
    peso,
    pct:
      typeof pct === "number" && Number.isFinite(pct)
        ? pct
        : somaDosPesos > 0
          ? (100 * peso) / somaDosPesos
          : 0,
    garantido: peso === 0,
  };
}

function mapearLinhasCaixa(bruto: unknown): LinhaCaixa[] {
  const brutas = lista(bruto);
  const soma = brutas.reduce<number>((s, l) => s + numero(objeto(l)["prob"]), 0);
  return brutas.map((l) => mapearLinhaCaixa(l, soma));
}

function mapearCaixa(bruto: unknown, situacao: SituacaoNovaOuAlterada): CaixaPatch {
  const o = objeto(bruto);
  const id = numero(o["id"]);
  const nome = texto(o["name"]);
  const linhasDaCaixa = mapearLinhasCaixa(o["rows"]);
  return {
    id,
    nome,
    descricao: linhas(o["desc"]),
    linhas: linhasDaCaixa,
    linhasAntes: Array.isArray(o["old_rows"]) ? mapearLinhasCaixa(o["old_rows"]) : null,
    situacao,
    busca: normalizarBusca([id, nome, ...linhasDaCaixa.flatMap((l) => [l.id, l.nome])].join(" ")),
  };
}

/** `{old, new}` vira os dois lados; um registro solto (os novos) vira só o lado de agora. */
function doisLados(bruto: unknown): { antes: Objeto | null; depois: Objeto } {
  const o = objeto(bruto);
  return ehObjeto(o["new"])
    ? { antes: ehObjeto(o["old"]) ? o["old"] : null, depois: o["new"] }
    : { antes: null, depois: o };
}

function mapearMonstro(bruto: unknown, situacao: SituacaoNovaOuAlterada): MonstroPatch {
  const { antes, depois } = doisLados(bruto);
  const id = numero(depois["id"]);
  const constante = texto(depois["const"]);
  const sprite = texto(depois["sprite"]);
  return {
    id,
    constante,
    sprite,
    antes: antes === null ? null : { constante: texto(antes["const"]), sprite: texto(antes["sprite"]) },
    situacao,
    busca: normalizarBusca(`${id} ${constante} ${sprite}`),
  };
}

/** As mudanças de uma skill fora da descrição (ela tem a comparação própria), uma linha por campo. */
function mudancasDaSkill(diff: unknown): string[] {
  return lista(diff)
    .map(objeto)
    .filter((d) => !texto(d["path"]).startsWith("/desc"))
    .map((d) => `${texto(d["path"])}: ${emTexto(d["old"])} → ${emTexto(d["new"])}`);
}

function mapearSkill(bruto: unknown, situacao: SituacaoNovaOuAlterada): SkillPatch {
  const { antes, depois } = doisLados(bruto);
  const id = numero(depois["id"]);
  const constante = texto(depois["const"]);
  const nome = texto(depois["name"]);
  return {
    id,
    constante,
    nome,
    nivelMaximo: numero(depois["maxlv"]),
    descricao: linhas(depois["desc"]),
    descricaoAntes: antes === null ? null : linhas(antes["desc"]),
    info: ehObjeto(depois["info"]) && Object.keys(depois["info"]).length > 0 ? emTexto(depois["info"]) : "",
    mudancas: mudancasDaSkill(objeto(bruto)["diff"]),
    situacao,
    busca: normalizarBusca(`${id} ${constante} ${nome}`),
  };
}

function mapearMapa(bruto: unknown, situacao: SituacaoNovaOuAlterada): MapaPatch {
  const { antes, depois } = doisLados(bruto);
  const mapa = texto(depois["map"]);
  const nome = texto(depois["name"]);
  const placa = texto(depois["sign"]);
  return {
    mapa,
    nome,
    placa,
    antes: antes === null ? null : { nome: texto(antes["name"]), placa: texto(antes["sign"]) },
    situacao,
    busca: normalizarBusca(`${mapa} ${nome} ${placa}`),
  };
}

function textoDaQuest(o: Objeto): TextoDaQuest {
  return { titulo: texto(o["title"]), resumo: texto(o["summary"]), descricao: linhas(o["desc"]) };
}

function mapearQuest(bruto: unknown, situacao: SituacaoNovaOuAlterada): QuestPatch {
  const { antes, depois } = doisLados(bruto);
  const id = numero(depois["id"]);
  const agora = textoDaQuest(depois);
  const anterior = antes === null ? null : textoDaQuest(antes);
  return {
    id,
    ...agora,
    antes: anterior,
    situacao,
    busca: normalizarBusca(
      [id, agora.titulo, agora.resumo, anterior?.titulo ?? "", ...agora.descricao.map(textoPuroRo)].join(" "),
    ),
  };
}

/** Uma linha de `grf.added`/`removed` (`[caminho, tamanho, tipo]` ou só o caminho) ou de `grf.changed`. */
function mapearArquivo(bruto: unknown, situacao: SituacaoArquivo): ArquivoGrf {
  const t = Array.isArray(bruto) ? bruto : [bruto];
  const caminho = texto(t[0]);
  const alterado = situacao === "alterado";
  const tipo = texto(alterado ? t[3] : t[2]);
  return {
    caminho,
    tamanho: numero(alterado ? t[2] : t[1]),
    tamanhoAntes: alterado ? numero(t[1]) : null,
    tipo,
    situacao,
    busca: normalizarBusca(`${caminho} ${tipo} ${rotuloDoTipoGrf(tipo)}`),
  };
}

function mapearResumoGrf(bruto: unknown): ResumoGrf {
  const t = lista(bruto);
  return { tipo: texto(t[0]), novos: numero(t[1]), alterados: numero(t[2]), removidos: numero(t[3]) };
}

const situacaoDaTabela = (v: unknown): SituacaoTabela =>
  v === "added" ? "novo" : v === "error" ? "erro" : "alterado";

function mapearMudancaLua(bruto: unknown): MudancaLua {
  const o = objeto(bruto);
  const op = o["op"];
  return {
    op: op === "add" || op === "del" ? op : "chg",
    caminho: texto(o["path"]),
    antes: emTexto(o["old"]),
    depois: emTexto(o["new"]),
  };
}

function mapearTabelaLua(bruto: unknown): TabelaLua {
  const o = objeto(bruto);
  const arquivo = texto(o["file"]);
  const globais = textos(o["globals"]);
  const mudancas = lista(o["diff"]).map(mapearMudancaLua);
  return {
    arquivo,
    situacao: situacaoDaTabela(o["status"]),
    globais,
    quantidade: Math.max(numero(o["count"]), mudancas.length),
    mudancas,
    truncado: verdadeiro(o["truncated"]),
    erro: texto(o["error"]),
    busca: normalizarBusca([arquivo, ...globais].join(" ")),
  };
}

function mapearTexto(bruto: unknown): TextoPatch {
  const o = objeto(bruto);
  const arquivo = texto(o["file"]);
  return {
    arquivo,
    situacao: situacaoDaTabela(o["status"]),
    linhas: linhas(o["lines"]),
    adicionadas: numero(o["added"]),
    removidas: numero(o["removed"]),
    truncado: verdadeiro(o["truncated"]),
    busca: normalizarBusca(arquivo),
  };
}

function estadoArquivo(bruto: unknown): EstadoArquivo | null {
  if (!ehObjeto(bruto)) return null;
  return { tamanho: numero(bruto["size"]), entradas: numero(bruto["entries"]) };
}

function snapshot(bruto: unknown): Snapshot | null {
  if (!ehObjeto(bruto)) return null;
  return { tirado: texto(bruto["taken"]), rotulo: texto(bruto["label"]) };
}

/** Os dois lados existem e são diferentes (um lado vazio não conta como mudança). */
function mudou(antes: unknown, depois: unknown): boolean {
  const a = texto(antes);
  const d = texto(depois);
  return a !== "" && d !== "" && a !== d;
}

function mapearPastas(bruto: unknown): PastaDoCliente[] {
  return Object.entries(objeto(bruto))
    .map(([nome, pasta]) => {
      const p = objeto(pasta);
      return {
        nome,
        novos: textos(p["added"]),
        alterados: textos(p["changed"]),
        removidos: textos(p["removed"]),
      };
    })
    .filter((p) => p.novos.length + p.alterados.length + p.removidos.length > 0);
}

function mapearMeta(bruto: unknown, arquivos: unknown): MetaPatch {
  const o = objeto(bruto);
  const ragexe = objeto(o["ragexe"]);
  const grf = objeto(o["grf"]);
  return {
    titulo: texto(o["title"]),
    patches: linhas(o["patches"]).filter((p) => p.trim() !== ""),
    snapshotAntes: snapshot(o["old"]),
    snapshotDepois: snapshot(o["new"]),
    ragexeNovo: mudou(objeto(ragexe["old"])["sha1"], objeto(ragexe["new"])["sha1"]),
    ragexeAntes: estadoArquivo(ragexe["old"]),
    ragexeDepois: estadoArquivo(ragexe["new"]),
    grfReempacotado: mudou(objeto(grf["old"])["tbl_off"], objeto(grf["new"])["tbl_off"]),
    grfAntes: estadoArquivo(grf["old"]),
    grfDepois: estadoArquivo(grf["new"]),
    pastas: mapearPastas(arquivos),
  };
}

/** Novos e alterados de uma seção (`{added, changed}`) numa lista só, os novos primeiro. */
function novosEAlterados<T>(
  secao: unknown,
  mapear: (bruto: unknown, situacao: SituacaoNovaOuAlterada) => T,
): T[] {
  const o = objeto(secao);
  return [
    ...lista(o["added"]).map((x) => mapear(x, "novo")),
    ...lista(o["changed"]).map((x) => mapear(x, "alterado")),
  ];
}

/** O report.json (qualquer que seja o estado dele) no modelo da tela. Nunca lança. */
export function mapearRelatorio(bruto: unknown): RelatorioPatch {
  const raiz = objeto(bruto);
  const itens = objeto(raiz["items"]);
  const grf = objeto(raiz["grf"]);
  return {
    meta: mapearMeta(raiz["meta"], raiz["files"]),
    itensNovos: lista(itens["added"]).map(mapearItem),
    itensRemovidos: lista(itens["removed"]).map(mapearItem),
    itensAlterados: lista(itens["changed"]).map(mapearItemAlterado),
    caixas: novosEAlterados(raiz["packages"], mapearCaixa),
    monstros: novosEAlterados(raiz["monsters"], mapearMonstro),
    skills: novosEAlterados(raiz["skills"], mapearSkill),
    mapas: novosEAlterados(raiz["maps"], mapearMapa),
    quests: novosEAlterados(raiz["quests"], mapearQuest),
    arquivosGrf: [
      ...lista(grf["added"]).map((a) => mapearArquivo(a, "novo")),
      ...lista(grf["changed"]).map((a) => mapearArquivo(a, "alterado")),
      ...lista(grf["removed"]).map((a) => mapearArquivo(a, "removido")),
    ],
    resumoGrf: lista(grf["summary"]).map(mapearResumoGrf),
    tabelasLua: lista(raiz["lua"]).map(mapearTabelaLua),
    textos: lista(raiz["text"]).map(mapearTexto),
  };
}
