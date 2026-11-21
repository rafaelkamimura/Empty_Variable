// Regras puras do cadastro do Diário de farm: nomes, ligação com o catálogo e o loot (D60).
import type { InstanciaCatalogo, InstanciaFarm, ItemFarm, ItemLoot, LootInstancia } from "./farm.modelos";

/** Nome de instância para comparar: sem acentos, maiúsculas, pontuação nem "de", "do", "da". */
export function chaveDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((parte) => parte !== "" && !["de", "do", "da", "dos", "das"].includes(parte))
    .join(" ");
}

/**
 * Instância do catálogo ligada a uma do diário: a escolhida no cadastro ou, nas digitadas à mão,
 * a de mesmo nome (pela `chaveDoNome`).
 */
export function idDoCatalogo(i: InstanciaFarm, catalogo: readonly InstanciaCatalogo[]): string | null {
  if (i.instanciaId) return i.instanciaId;
  const chave = chaveDoNome(i.nome);
  return catalogo.find((c) => chaveDoNome(c.nome) === chave)?.id ?? null;
}

export function nomeDoLoot(item: ItemLoot): string {
  return item.nome ?? `Item ${item.idJogo}`;
}

/** Itens do loot que ainda não estão nos drops da instância (pelo ID do jogo ou pelo nome). */
export function lootQueFalta(
  i: InstanciaFarm,
  loot: LootInstancia,
  itemPorId: ReadonlyMap<string, ItemFarm>,
): ItemLoot[] {
  const meus = i.drops.map((id) => itemPorId.get(id)).filter((item) => item !== undefined);
  const ids = new Set(meus.map((item) => item.idJogo));
  const nomes = new Set(meus.map((item) => item.nome.toLowerCase()));
  return loot.itens.filter((item) => !ids.has(item.idJogo) && !nomes.has(nomeDoLoot(item).toLowerCase()));
}

export function resumoDoLoot(loot: LootInstancia): string {
  if (loot.chefes === 0 && loot.itens.length === 0) {
    return "A browiki não nomeia chefes nem recompensas desta instância: o gestor cadastra os chefes na Simulação de dano.";
  }
  const partes = [
    `${loot.itens.length} item(ns): recompensas da instância e drops de ${loot.chefes - loot.pendentes} de ${loot.chefes} chefe(s).`,
  ];
  if (loot.pendentes) {
    partes.push(
      loot.divinePride
        ? `Faltam os drops de ${loot.pendentes} chefe(s): a Divine Pride responde um por vez.`
        : "A busca na Divine Pride está desligada neste servidor.",
    );
  }
  return partes.join(" ");
}

/** "recompensa", "12,5%", "0,05%" ou vazio. */
export function chanceDoLoot(item: ItemLoot): string {
  if (item.recompensa) return "recompensa";
  if (item.chance === null) return "";
  const pct = item.chance * 100;
  return `${pct.toLocaleString("pt-BR", { maximumFractionDigits: pct < 1 ? 2 : 1 })}%`;
}

/** Monstros que dropam o item, sem repetir. */
export function origensDoLoot(item: ItemLoot): string {
  return [...new Set(item.origens.map((origem) => origem.monstro))].join(", ");
}

/** ID do jogo digitado: vazio é null; inválido (não inteiro, menor que 1) é undefined. */
export function lerIdJogo(texto: string): number | null | undefined {
  const t = texto.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isInteger(n) && n >= 1 ? n : undefined;
}

/** Nome digitado (instância ou item): sem espaços nas pontas; vazio é inválido. */
export function lerNome(texto: string): string | undefined {
  const t = texto.trim();
  return t === "" ? undefined : t;
}
