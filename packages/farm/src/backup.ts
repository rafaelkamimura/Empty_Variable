import { ehRecarga, type Recarga } from "./recarga.js";
import { ZENY_MAXIMO } from "./zeny.js";

/**
 * D54: arquivo "Backup completo" exportado pelo artefato Diário de Instâncias (claude.ai).
 * Os ids são os do artefato; na importação, personagens viram personagens do vínculo (escolhidos
 * pelo membro), e instâncias e itens são casados pelo nome.
 */
export interface BackupDiario {
  kind: "diario-instancias-backup";
  v: 1;
  exportadoEm: string;
  personagens: { id: string; nome: string; classe: string }[];
  instancias: { id: string; nome: string; recarga: Recarga; personagens: string[]; drops: string[] }[];
  itens: { id: string; nome: string; precoZeny: number | null }[];
  checkins: {
    id: string;
    personagem: string;
    instancia: string;
    nomeInstancia: string;
    feitoEm: number;
    drops: { item: string; quantidade: number; nome: string }[];
  }[];
}

/** Limites para não aceitar arquivo absurdo (o artefato não chega perto disso). */
export const LIMITES_BACKUP = { personagens: 100, instancias: 500, itens: 5_000, checkins: 100_000 } as const;

export class ErroBackup extends Error {}

const ehObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const textoValido = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const idValido = (v: unknown): v is string => typeof v === "string" && /^[A-Za-z0-9_-]{1,64}$/.test(v);

function lista(valor: unknown, campo: string, max: number): unknown[] {
  if (!Array.isArray(valor)) throw new ErroBackup(`O backup não tem a lista de ${campo}.`);
  if (valor.length > max) throw new ErroBackup(`O backup tem ${campo} demais (máximo ${max}).`);
  return valor;
}

/** Confere a estrutura do backup e devolve uma cópia limpa. Lança ErroBackup com a mensagem para o usuário. */
export function lerBackup(dados: unknown): BackupDiario {
  if (!ehObjeto(dados) || dados["kind"] !== "diario-instancias-backup") {
    throw new ErroBackup("Esse arquivo não é um backup completo do Diário de Instâncias.");
  }
  if (dados["v"] !== 1) throw new ErroBackup("Versão de backup desconhecida.");

  const personagens = lista(dados["personagens"], "personagens", LIMITES_BACKUP.personagens).map((p) => {
    if (!ehObjeto(p) || !idValido(p["id"]) || !textoValido(p["nome"], 64))
      throw new ErroBackup("Personagem inválido no backup.");
    return {
      id: p["id"],
      nome: p["nome"].trim(),
      classe: typeof p["classe"] === "string" ? p["classe"] : "",
    };
  });
  const itens = lista(dados["itens"], "itens", LIMITES_BACKUP.itens).map((i) => {
    if (!ehObjeto(i) || !idValido(i["id"]) || !textoValido(i["nome"], 80))
      throw new ErroBackup("Item inválido no backup.");
    const p = i["precoZeny"];
    const precoZeny = typeof p === "number" && Number.isInteger(p) && p >= 0 && p <= ZENY_MAXIMO ? p : null;
    return { id: i["id"], nome: i["nome"].trim(), precoZeny };
  });
  const instancias = lista(dados["instancias"], "instâncias", LIMITES_BACKUP.instancias).map((i) => {
    if (!ehObjeto(i) || !idValido(i["id"]) || !textoValido(i["nome"], 80) || !ehRecarga(i["recarga"]))
      throw new ErroBackup("Instância inválida no backup.");
    const ids = (v: unknown) => (Array.isArray(v) ? v.filter(idValido) : []);
    return {
      id: i["id"],
      nome: i["nome"].trim(),
      recarga: i["recarga"],
      personagens: ids(i["personagens"]),
      drops: ids(i["drops"]),
    };
  });
  const checkins = lista(dados["checkins"], "check-ins", LIMITES_BACKUP.checkins).map((c) => {
    if (
      !ehObjeto(c) ||
      !idValido(c["id"]) ||
      !idValido(c["personagem"]) ||
      !idValido(c["instancia"]) ||
      typeof c["feitoEm"] !== "number" ||
      !Number.isFinite(c["feitoEm"]) ||
      c["feitoEm"] < Date.UTC(2020, 0, 1)
    )
      throw new ErroBackup("Check-in inválido no backup.");
    const drops = (Array.isArray(c["drops"]) ? c["drops"] : []).flatMap((d) => {
      if (!ehObjeto(d) || !idValido(d["item"])) return [];
      const q = d["quantidade"];
      if (typeof q !== "number" || !Number.isInteger(q) || q < 1 || q > 1_000_000) return [];
      return [
        { item: d["item"], quantidade: q, nome: typeof d["nome"] === "string" ? d["nome"].trim() : "" },
      ];
    });
    return {
      id: c["id"],
      personagem: c["personagem"],
      instancia: c["instancia"],
      nomeInstancia: typeof c["nomeInstancia"] === "string" ? c["nomeInstancia"].trim() : "",
      feitoEm: Math.round(c["feitoEm"]),
      drops,
    };
  });

  return {
    kind: "diario-instancias-backup",
    v: 1,
    exportadoEm: typeof dados["exportadoEm"] === "string" ? dados["exportadoEm"] : "",
    personagens,
    instancias,
    itens,
    checkins,
  };
}
