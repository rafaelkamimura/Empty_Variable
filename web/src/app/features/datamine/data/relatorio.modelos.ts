// O report.json de um patch (D63), como o rolatam-dm publica, e o modelo que a tela usa.
//
// O arquivo vem de outra ferramenta e pode crescer ou faltar pedaço: `mapearRelatorio` lê cada
// campo com defesa (lista ausente vira lista vazia, tipo errado vira o valor neutro) e entrega um
// modelo completo, já com a categoria de cada item e o texto de busca de cada linha.
import { type CategoriaItem, categoriaDoItem } from "./categorias";
import { normalizarBusca } from "./filtro";
import { textoPuroRo } from "./texto-ro";

export interface ItemPatch {
  readonly id: number;
  readonly nome: string;
  /** Nome do recurso (sprite) no cliente. */
  readonly recurso: string;
  readonly nomeNaoIdentificado: string;
  /** Linhas com a marcação do jogo (ver `texto-ro.ts`). */
  readonly descricao: readonly string[];
  readonly descricaoNaoIdentificada: readonly string[];
  readonly slots: number;
  /** Número do visual do item no cliente (ClassNum); 0 quando não tem. */
  readonly visual: number;
  readonly traje: boolean;
  /** Efeito visual do item no cliente (EffectID); null quando não tem. */
  readonly efeito: number | null;
  readonly categoria: CategoriaItem;
  readonly busca: string;
}

export interface ItemAlterado {
  readonly antes: ItemPatch;
  readonly depois: ItemPatch;
  /** Campos que mudaram, com os nomes do iteminfo (`identifiedDisplayName`, `costume`…). */
  readonly campos: readonly string[];
  readonly categoria: CategoriaItem;
  readonly busca: string;
}

export interface LinhaCaixa {
  readonly id: number;
  readonly nome: string;
  readonly grupo: number;
  /** Peso do sorteio. Zero: o item vem sempre (bônus garantido). */
  readonly peso: number;
  /** Chance em porcentagem, como o cliente publica. */
  readonly pct: number;
  readonly garantido: boolean;
}

export type SituacaoNovaOuAlterada = "novo" | "alterado";

export interface CaixaPatch {
  readonly id: number;
  readonly nome: string;
  readonly descricao: readonly string[];
  readonly linhas: readonly LinhaCaixa[];
  /** Conteúdo antes do patch, só nas caixas alteradas. */
  readonly linhasAntes: readonly LinhaCaixa[] | null;
  readonly situacao: SituacaoNovaOuAlterada;
  readonly busca: string;
}

export interface MonstroPatch {
  readonly id: number;
  readonly constante: string;
  readonly sprite: string;
  /** Constante e sprite antes do patch, só nos alterados. */
  readonly antes: { readonly constante: string; readonly sprite: string } | null;
  readonly situacao: SituacaoNovaOuAlterada;
  readonly busca: string;
}

export interface SkillPatch {
  readonly id: number;
  readonly constante: string;
  readonly nome: string;
  readonly nivelMaximo: number;
  readonly descricao: readonly string[];
  /** Descrição antes do patch, só nas alteradas. */
  readonly descricaoAntes: readonly string[] | null;
  /** A entrada da skill no skillinfolist, em JSON legível. */
  readonly info: string;
  /** Campos que mudaram fora da descrição, uma linha por campo (só nas alteradas). */
  readonly mudancas: readonly string[];
  readonly situacao: SituacaoNovaOuAlterada;
  readonly busca: string;
}

export interface MapaPatch {
  readonly mapa: string;
  readonly nome: string;
  /** Texto da placa do mapa ao entrar. */
  readonly placa: string;
  /** Nome e placa antes do patch, só nos alterados. */
  readonly antes: { readonly nome: string; readonly placa: string } | null;
  readonly situacao: SituacaoNovaOuAlterada;
  readonly busca: string;
}

export interface TextoDaQuest {
  readonly titulo: string;
  readonly resumo: string;
  readonly descricao: readonly string[];
}

export interface QuestPatch extends TextoDaQuest {
  readonly id: number;
  /** Texto antes do patch, só nas alteradas. */
  readonly antes: TextoDaQuest | null;
  readonly situacao: SituacaoNovaOuAlterada;
  readonly busca: string;
}

export type SituacaoArquivo = "novo" | "alterado" | "removido";

export interface ArquivoGrf {
  readonly caminho: string;
  /** Tamanho em bytes depois do patch (nos removidos, o que tinha). */
  readonly tamanho: number;
  /** Tamanho antes do patch, só nos alterados. */
  readonly tamanhoAntes: number | null;
  readonly tipo: string;
  readonly situacao: SituacaoArquivo;
  readonly busca: string;
}

export interface ResumoGrf {
  readonly tipo: string;
  readonly novos: number;
  readonly alterados: number;
  readonly removidos: number;
}

export type OperacaoLua = "add" | "del" | "chg";

export interface MudancaLua {
  readonly op: OperacaoLua;
  readonly caminho: string;
  /** Valor antes, em texto (JSON legível quando é tabela). Vazio em `add`. */
  readonly antes: string;
  /** Valor depois. Vazio em `del`. */
  readonly depois: string;
}

export type SituacaoTabela = "novo" | "alterado" | "erro";

export interface TabelaLua {
  readonly arquivo: string;
  readonly situacao: SituacaoTabela;
  readonly globais: readonly string[];
  /** Total de mudanças no arquivo (pode ser maior que `mudancas`, quando o relatório cortou). */
  readonly quantidade: number;
  readonly mudancas: readonly MudancaLua[];
  readonly truncado: boolean;
  readonly erro: string;
  readonly busca: string;
}

export interface TextoPatch {
  readonly arquivo: string;
  readonly situacao: SituacaoTabela;
  /** Linhas do diff unificado (`+`, `-`, `@@` ou contexto). */
  readonly linhas: readonly string[];
  readonly adicionadas: number;
  readonly removidas: number;
  readonly truncado: boolean;
  readonly busca: string;
}

export interface EstadoArquivo {
  readonly tamanho: number;
  /** Só o GRF tem: quantos arquivos ele guarda. */
  readonly entradas: number;
}

export interface Snapshot {
  /** Quando o snapshot foi tirado (`AAAA-MM-DD HH:MM:SS`). */
  readonly tirado: string;
  readonly rotulo: string;
}

/** Arquivos soltos que o patch mexeu numa pasta do cliente (System, textos do GRF). */
export interface PastaDoCliente {
  readonly nome: string;
  readonly novos: readonly string[];
  readonly alterados: readonly string[];
  readonly removidos: readonly string[];
}

export interface MetaPatch {
  readonly titulo: string;
  readonly patches: readonly string[];
  readonly snapshotAntes: Snapshot | null;
  readonly snapshotDepois: Snapshot | null;
  /** O sha1 do Ragexe mudou: o patch trouxe executável novo. */
  readonly ragexeNovo: boolean;
  readonly ragexeAntes: EstadoArquivo | null;
  readonly ragexeDepois: EstadoArquivo | null;
  /** A tabela de arquivos do GRF mudou de lugar: o GRF foi reempacotado. */
  readonly grfReempacotado: boolean;
  readonly grfAntes: EstadoArquivo | null;
  readonly grfDepois: EstadoArquivo | null;
  readonly pastas: readonly PastaDoCliente[];
}

export interface RelatorioPatch {
  readonly meta: MetaPatch;
  readonly itensNovos: readonly ItemPatch[];
  readonly itensRemovidos: readonly ItemPatch[];
  readonly itensAlterados: readonly ItemAlterado[];
  readonly caixas: readonly CaixaPatch[];
  readonly monstros: readonly MonstroPatch[];
  readonly skills: readonly SkillPatch[];
  readonly mapas: readonly MapaPatch[];
  readonly quests: readonly QuestPatch[];
  readonly arquivosGrf: readonly ArquivoGrf[];
  readonly resumoGrf: readonly ResumoGrf[];
  readonly tabelasLua: readonly TabelaLua[];
  readonly textos: readonly TextoPatch[];
}

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

/** O relatório não tem nada para mostrar em nenhuma aba. */
export function relatorioVazio(r: RelatorioPatch): boolean {
  return (
    r.itensNovos.length +
      r.itensRemovidos.length +
      r.itensAlterados.length +
      r.caixas.length +
      r.monstros.length +
      r.skills.length +
      r.mapas.length +
      r.quests.length +
      r.arquivosGrf.length +
      r.tabelasLua.length +
      r.textos.length ===
    0
  );
}

/** Tamanho de arquivo em pt-BR: "512 B", "1,5 KB", "3,2 MB". */
export function formatarBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  const unidades = ["B", "KB", "MB", "GB"];
  let valor = bytes;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i++;
  }
  const casas = i === 0 || valor >= 100 ? 0 : 1;
  const numeroFormatado = valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
  return `${numeroFormatado} ${unidades[i] ?? "B"}`;
}

/** Rótulo em pt-BR dos tipos de arquivo que o rolatam-dm reconhece; os demais ficam como vieram. */
export const ROTULO_TIPO_GRF: Readonly<Record<string, string>> = {
  map: "Mapa",
  minimap: "Minimapa",
  "map/model texture": "Textura de mapa ou modelo",
  "monster sprite": "Sprite de monstro",
  "npc sprite": "Sprite de NPC",
  "item sprite": "Sprite de item",
  "garment sprite": "Sprite de capa",
  "headgear sprite": "Sprite de chapéu",
  "item icon": "Ícone de item",
  "item collection image": "Imagem de coleção",
  "card image": "Imagem de carta",
  illustration: "Ilustração",
  image: "Imagem",
  "effect texture": "Textura de efeito",
  "ui texture": "Textura de interface",
  sound: "Som",
  lua: "Lua",
  text: "Texto",
  other: "Outros",
};

export function rotuloDoTipoGrf(tipo: string): string {
  return ROTULO_TIPO_GRF[tipo] ?? (tipo === "" ? "Sem tipo" : tipo);
}

/** Rótulo em pt-BR dos campos do iteminfo que o relatório marca como alterados. */
export const ROTULO_CAMPO_ITEM: Readonly<Record<string, string>> = {
  identifiedDisplayName: "Nome",
  identifiedDescriptionName: "Descrição",
  identifiedResourceName: "Sprite",
  unidentifiedDisplayName: "Nome não identificado",
  unidentifiedDescriptionName: "Descrição não identificada",
  unidentifiedResourceName: "Sprite não identificado",
  slotCount: "Slots",
  ClassNum: "Visual",
  costume: "Traje",
  EffectID: "Efeito",
};

export const rotuloDoCampo = (campo: string): string => ROTULO_CAMPO_ITEM[campo] ?? campo;
