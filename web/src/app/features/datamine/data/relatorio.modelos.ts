// O modelo do relatório de um patch (D63) que a tela usa, e os rótulos em pt-BR do que vem do
// cliente. Quem monta este modelo a partir do report.json é `mapearRelatorio` (relatorio.mapear.ts).
import type { CategoriaItem } from "./categorias";

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
