// Vínculo do membro com o jogador e as fichas dos personagens (T-19b, D12, D55, D57).
import type { AtributosBuild, EquipamentoFicha, ItemEquipamento } from "../../../shared/dominio/build";
import { refinoEGrau } from "../../../shared/dominio/build";
import type { PersonagemResumo, SituacaoVinculo, Solicitacao } from "../../../core/modelos";

export type {
  AtributosBuild,
  EquipamentoFicha,
  ItemEquipamento,
  PersonagemResumo,
  SituacaoVinculo,
  Solicitacao,
};

export interface ClasseFicha {
  id: string;
  nomeOficial: string;
  apelidoGrupo: string | null;
  grupo: string;
}

export interface Ficha {
  nome: string;
  classeId: string;
  nivelBase: number | null;
  build: string;
  equipamentos: Partial<Record<string, EquipamentoFicha>>;
  /** D57: atributos da build importada; fichas sem importação não têm o campo. */
  atributos?: AtributosBuild;
}

/** D55: resposta de POST /api/vinculo/build-simulador. */
export interface BuildImportada {
  classeId: string | null;
  classeNome: string | null;
  nivelBase: number | null;
  equipamentos: Partial<Record<string, Omit<ItemEquipamento, "nome"> & { nome: string | null }>>;
  /** D57: atributos, talentos, nível de classe e habilidade da build. */
  atributos?: AtributosBuild;
}

/** Onde a ficha aberta vai ser salva. */
export type DestinoFicha =
  | { tipo: "personagem"; id: string }
  | { tipo: "novo-personagem" }
  | { tipo: "solicitacao"; id: string; nomeAnterior: string | null }
  | { tipo: "nova-solicitacao" };

export const SLOTS = [
  ["topo", "Topo"],
  ["meio", "Meio"],
  ["baixo", "Baixo"],
  ["arma", "Arma"],
  ["armadura", "Armadura"],
  ["escudo", "Escudo"],
  ["capa", "Capa"],
  ["calcado", "Calçado"],
  ["acessorio1", "Acessório 1"],
  ["acessorio2", "Acessório 2"],
] as const;
export type Slot = (typeof SLOTS)[number];

/** Máximo de personagens numa solicitação (a API recusa mais). */
export const MAXIMO_FICHAS_SOLICITACAO = 10;

export const novaFicha = (): Ficha => ({
  nome: "",
  classeId: "",
  nivelBase: null,
  build: "",
  equipamentos: {},
});

/** Ficha de um personagem já vinculado. */
export function fichaDoPersonagem(p: PersonagemResumo): Ficha {
  return {
    nome: p.nome,
    classeId: p.classeId ?? "",
    nivelBase: p.nivelBase ?? null,
    build: p.build ?? "",
    equipamentos: { ...p.equipamentos },
    ...(p.atributos && Object.keys(p.atributos).length ? { atributos: p.atributos } : {}),
  };
}

/** Ficha de um personagem da solicitação pendente (pelo nome). */
export function fichaDaSolicitacao(pedido: Solicitacao, nome: string): Ficha {
  const ficha = pedido.fichas?.find((atual) => atual.nome === nome);
  return ficha
    ? { ...novaFicha(), ...ficha, build: ficha.build ?? "", equipamentos: { ...ficha.equipamentos } }
    : { ...novaFicha(), nome };
}

/** Nome, classe e nível de 1 a 250: o mínimo para salvar. */
export function fichaValida(ficha: Ficha): boolean {
  return (
    ficha.nome.trim() !== "" &&
    ficha.classeId !== "" &&
    ficha.nivelBase !== null &&
    Number.isInteger(ficha.nivelBase) &&
    ficha.nivelBase >= 1 &&
    ficha.nivelBase <= 250
  );
}

/** Corpo enviado à API: nome aparado e normalizado, e atributos sempre presentes. */
export function corpoDaFicha(ficha: Ficha): Ficha & { atributos: AtributosBuild } {
  return { ...ficha, atributos: ficha.atributos ?? {}, nome: ficha.nome.trim().normalize("NFC") };
}

export function itemEquipado(valor: EquipamentoFicha | undefined): ItemEquipamento | null {
  return typeof valor === "object" ? valor : null;
}

/** Nome do equipamento com refino e grau, para a dica do slot; null se o slot está vazio. */
export function tituloDoSlot(valor: EquipamentoFicha | undefined): string | null {
  const nome = typeof valor === "string" ? valor : valor?.nome;
  return nome ? [nome, refinoEGrau(valor)].filter((parte) => parte !== "").join(" · ") : null;
}

/** Frase que confirma o que a importação preencheu e o que ficou para o membro escolher. */
export function resumoDaImportacao(build: BuildImportada, equipamentos: number): string {
  const partes = [
    ...(build.classeId && build.classeNome ? [build.classeNome] : []),
    ...(build.nivelBase !== null ? [`nível ${build.nivelBase}`] : []),
    equipamentos === 1 ? "1 equipamento" : `${equipamentos} equipamentos`,
  ];
  const semClasse = build.classeId
    ? ""
    : build.classeNome
      ? ` A classe ${build.classeNome} não está cadastrada no grupo: escolha a classe.`
      : " Escolha a classe.";
  return `Build importada: ${partes.join(", ")}.${semClasse} Revise e salve.`;
}

/**
 * D55 e D57: a ficha com a build importada. Classe e nível só mudam se a build os trouxer; os
 * equipamentos e os atributos da build substituem os da ficha. O nome do item vem do catálogo,
 * depois da Divine Pride e, sem nenhum, "Item <id>".
 */
export function aplicarBuild(
  ficha: Ficha,
  build: BuildImportada,
  nomeDoCatalogo: (slot: string, id: number) => string | null,
): Ficha {
  const equipamentos: Ficha["equipamentos"] = {};
  for (const [slot, item] of Object.entries(build.equipamentos)) {
    if (!item) continue;
    equipamentos[slot] = { ...item, nome: nomeDoCatalogo(slot, item.id) ?? item.nome ?? `Item ${item.id}` };
  }
  const { atributos: _antigos, ...semAtributos } = ficha;
  return {
    ...semAtributos,
    classeId: build.classeId ?? ficha.classeId,
    nivelBase: build.nivelBase ?? ficha.nivelBase,
    equipamentos,
    ...(build.atributos && Object.keys(build.atributos).length ? { atributos: build.atributos } : {}),
  };
}

/** Motivo da rejeição: de 3 a 500 caracteres. Devolve o erro, ou null. */
export function erroDoMotivo(motivo: string): string | null {
  const t = motivo.trim();
  if (t.length < 3) return "Escreva o motivo, com pelo menos 3 letras.";
  if (t.length > 500) return "O motivo cabe em até 500 caracteres.";
  return null;
}
