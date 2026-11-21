// Diário de farm (D48–D54): o que a API /api/farm devolve e as regras puras das telas.
import {
  cicloDoCalendario,
  DIAS_SEMANA,
  dataDoDia,
  diaDoJogo,
  diaMes,
  horaDoServidor,
  type Recarga,
  rotuloDoDia,
  type Situacao,
  situacao,
  type Totais,
  totalizar,
} from "@betel/farm";

export interface PersonagemFarm {
  id: string;
  nome: string;
  classe: string | null;
}

export interface InstanciaFarm {
  id: string;
  nome: string;
  recarga: Recarga;
  instanciaId: string | null;
  personagemIds: string[];
  /** Itens que costuma dropar, na ordem do cadastro. */
  drops: string[];
}

export interface ItemFarm {
  id: string;
  nome: string;
  idJogo: number | null;
  precoZeny: number | null;
}

export interface DropCheckin {
  farmItemId: string;
  nome: string;
  quantidade: number;
}

export interface CheckinFarm {
  id: string;
  personagemId: string;
  farmInstanciaId: string;
  nomeInstancia: string;
  feitoEm: string;
  drops: DropCheckin[];
}

export interface EstadoFarm {
  vinculado: boolean;
  personagens: PersonagemFarm[];
  instancias: InstanciaFarm[];
  itens: ItemFarm[];
  checkinsRecentes: CheckinFarm[];
  divinePride: boolean;
}

export interface ResultadoBuscaItem {
  nome: string;
  idJogo: number | null;
  origem: "meus-itens" | "catalogo" | "divine-pride";
  farmItemId: string | null;
}

/** D60: item da lista de loot de uma instância do catálogo, pelos drops dos chefes dela. */
export interface ItemLoot {
  idJogo: number;
  nome: string | null;
  /** Maior chance entre os chefes que dropam o item, de 0 a 1. */
  chance: number | null;
  /** Recompensa da própria instância (moeda ou prêmio dela), pela browiki. */
  recompensa: boolean;
  origens: { idMonstro: number; monstro: string; tipo: "COMUM" | "MVP" | "MAPA"; chance: number | null }[];
}

export interface LootInstancia {
  instancia: { id: string; nome: string };
  chefes: number;
  /** Chefes cujos drops ainda não foram buscados na Divine Pride. */
  pendentes: number;
  divinePride: boolean;
  itens: ItemLoot[];
}

export interface InstanciaCatalogo {
  id: string;
  nome: string;
  recargaSugerida: Recarga | null;
}

export interface ResultadoImportacao {
  itensCriados: number;
  instanciasCriadas: number;
  checkinsImportados: number;
  checkinsJaImportados: number;
  checkinsSemPersonagem: number;
}

/** Situação de uma instância para um personagem, com o check-in que a deixou verde. */
export type SituacaoCard = Situacao & { checkin: CheckinFarm | null };

/** Limite de quantidade por item num check-in (o mesmo da API). */
export const MAXIMO_POR_DROP = 1_000_000;

export interface DropQuantidade {
  farmItemId: string;
  quantidade: number;
}

export function instanciasDoPersonagem(
  instancias: readonly InstanciaFarm[],
  personagemId: string,
): InstanciaFarm[] {
  return instancias.filter((i) => i.personagemIds.includes(personagemId));
}

/** Mesma regra da API (packages/farm): verde até a recarga liberar, com o check-in que a deixou verde. */
export function situacaoDoPersonagem(
  checkinsRecentes: readonly CheckinFarm[],
  personagemId: string,
  instancia: InstanciaFarm,
  agora: number,
): SituacaoCard {
  const ultimo =
    checkinsRecentes.find((c) => c.personagemId === personagemId && c.farmInstanciaId === instancia.id) ??
    null;
  const s = situacao(instancia.recarga, ultimo ? Date.parse(ultimo.feitoEm) : null, agora);
  return { ...s, checkin: s.feita ? ultimo : null };
}

export function checkinsDoDia(checkins: readonly CheckinFarm[], dia: number): CheckinFarm[] {
  return checkins.filter((c) => diaDoJogo(Date.parse(c.feitoEm)) === dia);
}

/** Valor em zeny dos drops (só itens com preço). */
export function valorDosDrops(
  drops: readonly DropQuantidade[],
  precoDe: (itemId: string) => number | null,
): number {
  return drops.reduce((soma, d) => soma + (precoDe(d.farmItemId) ?? 0) * d.quantidade, 0);
}

/** "Oridecon ×2 · Elunium ×1" (ou o aviso de que não houve drop). */
export function textoDosDrops(c: CheckinFarm): string {
  return c.drops.length > 0
    ? c.drops.map((d) => `${d.nome} ×${d.quantidade}`).join(" · ")
    : "Sem drops registrados";
}

/** Nomes dos itens que a instância costuma dropar. */
export function nomesDosDrops(i: InstanciaFarm, itemPorId: ReadonlyMap<string, ItemFarm>): string {
  const nomes = i.drops.map((id) => itemPorId.get(id)?.nome).filter((n) => n !== undefined);
  return nomes.length > 0 ? nomes.join(" · ") : "Sem itens cadastrados";
}

/** Quando a recarga libera, para o subtítulo de cada grupo de instâncias. */
export function dicaDaRecarga(recarga: Recarga, hoje: number): string {
  if (recarga === "DIARIA") return "Libera todo dia às 04:00";
  if (recarga === "TRES_DIAS") return "Libera 3 dias depois do check-in, às 04:00";
  return `Reset ${rotuloDoDia(cicloDoCalendario(recarga, hoje).proximo, hoje)} às 04:00`;
}

/** Itens do editor de drops: os da instância, os do check-in em edição e os extras, sem repetir. */
export function itensDoEditor(
  i: InstanciaFarm,
  editando: CheckinFarm | null,
  extras: readonly string[],
): string[] {
  const ids = [...i.drops];
  for (const d of editando?.drops ?? []) if (!ids.includes(d.farmItemId)) ids.push(d.farmItemId);
  for (const id of extras) if (!ids.includes(id)) ids.push(id);
  return ids;
}

/** Quantidade digitada → inteiro de 0 até o limite (texto vazio ou inválido vira 0). */
export function quantidadeDoTexto(texto: string | undefined): number {
  return Math.min(MAXIMO_POR_DROP, Math.max(0, Number.parseInt(texto ?? "", 10) || 0));
}

/** Drops para enviar: só os itens com quantidade maior que zero. */
export function dropsDoRascunho(
  ids: readonly string[],
  rascunho: Readonly<Record<string, string>>,
): DropQuantidade[] {
  return ids
    .map((farmItemId) => ({ farmItemId, quantidade: quantidadeDoTexto(rascunho[farmItemId]) }))
    .filter((d) => d.quantidade > 0);
}

// ---------- Totais ----------

/** "sáb 21/11 17:30", no fuso e no dia do jogo (reset às 04:00). */
export function quandoDoCheckin(iso: string): string {
  const ms = Date.parse(iso);
  const d = diaDoJogo(ms);
  return `${DIAS_SEMANA[dataDoDia(d).diaSemana]} ${diaMes(d)} ${horaDoServidor(ms)}`;
}

/** Totais (por item, instância e personagem) de uma lista de check-ins, com o preço vigente. */
export function totaisDosCheckins(
  checkins: readonly CheckinFarm[],
  precoDe: (itemId: string) => number | null,
): Totais {
  return totalizar(
    checkins.map((c) => ({
      personagemId: c.personagemId,
      instanciaId: c.farmInstanciaId,
      drops: c.drops.map((d) => ({ itemId: d.farmItemId, quantidade: d.quantidade })),
    })),
    precoDe,
  );
}

/**
 * Nomes guardados nos próprios check-ins: itens e instâncias excluídos depois continuam com nome
 * nos totais de períodos antigos.
 */
export function nomesDosCheckins(checkins: readonly CheckinFarm[]): {
  itens: Map<string, string>;
  instancias: Map<string, string>;
} {
  const itens = new Map<string, string>();
  const instancias = new Map<string, string>();
  for (const c of checkins) {
    instancias.set(c.farmInstanciaId, c.nomeInstancia);
    for (const d of c.drops) itens.set(d.farmItemId, d.nome);
  }
  return { itens, instancias };
}
