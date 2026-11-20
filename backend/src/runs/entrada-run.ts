import { BadRequestException } from "@nestjs/common";
import {
  BP_100_PORCENTO,
  CATEGORIAS_EMPRESTIMO,
  type CategoriaEmprestimo,
  CHEFES,
  type Chefe,
  FRACOES_PERMITIDAS,
  STATUS_RUN,
  type StatusRun,
} from "@betel/scoring";
import { inteiro, objeto, texto, textoOpcional, uuid } from "../comum/validacao.js";

export interface EntradaEmprestimoRun {
  credorJogadorId: string;
  itemId: string | null;
  itemDescricao: string | null;
  categoria: CategoriaEmprestimo;
  percentualInformadoBp: number | null;
}

export interface EntradaParticipante {
  personagemId: string;
  /** Função exercida. Sem ela, usa a função padrão da classe informada (classes sem padrão exigem a escolha: D16). */
  funcaoId: string | null;
  classeId: string | null;
  fracaoCentesimos: number;
  emprestimos: EntradaEmprestimoRun[];
}

export interface EntradaRun {
  data: Date;
  /** Épico IV (D44): instância e encontro. Sem encontro, vale o único encontro da instância. */
  instanciaId: string | null;
  encontroId: string | null;
  /** Apelido dos encontros da Torre (clientes anteriores ao Épico IV): NAGHT_25, BETELGEUSE_50/75. */
  chefe: Chefe | null;
  status: StatusRun;
  pontuacaoBetelgeuse: number | null;
  observacao: string | null;
  participantes: EntradaParticipante[];
  drops: { itemId: string; quantidade: number }[];
}

const MAX_PARTICIPANTES = 50;
const MAX_EMPRESTIMOS = 10;
const MAX_DROPS = 50;

function lista(valor: unknown, campo: string, max: number): unknown[] {
  if (valor === undefined) return [];
  if (!Array.isArray(valor)) throw new BadRequestException(`${campo} deve ser uma lista.`);
  if (valor.length > max) throw new BadRequestException(`${campo}: no máximo ${max} itens.`);
  return valor;
}

function umDe<T extends string>(valor: unknown, opcoes: readonly T[], campo: string): T {
  if (!opcoes.includes(valor as T))
    throw new BadRequestException(`${campo} deve ser um de: ${opcoes.join(", ")}.`);
  return valor as T;
}

/** Data AAAA-MM-DD (dia do calendário, sem fuso). */
export function data(valor: unknown): Date {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) {
    throw new BadRequestException("data deve estar no formato AAAA-MM-DD.");
  }
  const d = new Date(`${valor}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== valor) {
    throw new BadRequestException("data inválida.");
  }
  return d;
}

const uuidOuNulo = (v: unknown, campo: string) => (v === undefined || v === null ? null : uuid(v, campo));

function emprestimo(valor: unknown, p: number, e: number): EntradaEmprestimoRun {
  const b = objeto(valor);
  const campo = `participantes[${p}].emprestimos[${e}]`;
  const itemId = uuidOuNulo(b["itemId"], `${campo}.itemId`);
  const itemDescricao = textoOpcional(b["itemDescricao"], `${campo}.itemDescricao`, 2, 80) ?? null;
  if (itemId === null && itemDescricao === null) {
    throw new BadRequestException(`${campo}: informe o item do catálogo ou a descrição do item.`);
  }
  return {
    credorJogadorId: uuid(b["credorJogadorId"], `${campo}.credorJogadorId`),
    itemId,
    itemDescricao: itemId === null ? itemDescricao : null,
    categoria: umDe(b["categoria"], CATEGORIAS_EMPRESTIMO, `${campo}.categoria`),
    percentualInformadoBp:
      b["percentualInformadoBp"] === undefined || b["percentualInformadoBp"] === null
        ? null
        : inteiro(b["percentualInformadoBp"], `${campo}.percentualInformadoBp`, 0, BP_100_PORCENTO),
  };
}

function participante(valor: unknown, i: number): EntradaParticipante {
  const b = objeto(valor);
  const campo = `participantes[${i}]`;
  const funcaoId = uuidOuNulo(b["funcaoId"], `${campo}.funcaoId`);
  const classeId = uuidOuNulo(b["classeId"], `${campo}.classeId`);
  if (funcaoId === null && classeId === null) {
    throw new BadRequestException(`${campo}: informe a função ou a classe do participante.`);
  }
  const fracao = b["fracaoCentesimos"] ?? 100;
  if (!(FRACOES_PERMITIDAS as readonly unknown[]).includes(fracao)) {
    throw new BadRequestException(`${campo}.fracaoCentesimos deve ser 100, 50 ou 0 (C6).`);
  }
  return {
    personagemId: uuid(b["personagemId"], `${campo}.personagemId`),
    funcaoId,
    classeId,
    fracaoCentesimos: fracao as number,
    emprestimos: lista(b["emprestimos"], `${campo}.emprestimos`, MAX_EMPRESTIMOS).map((e, j) =>
      emprestimo(e, i, j),
    ),
  };
}

/** Valida o corpo de POST /runs e /runs/:id/corrigir. Regras de cálculo ficam no motor. */
export function lerEntradaRun(corpo: unknown): EntradaRun {
  const b = objeto(corpo);
  const participantes = lista(b["participantes"], "participantes", MAX_PARTICIPANTES).map(participante);
  if (participantes.length === 0) throw new BadRequestException("Informe ao menos um participante.");

  // CT-52: o mesmo personagem não pode aparecer duas vezes na run.
  const vistos = new Set<string>();
  for (const p of participantes) {
    if (vistos.has(p.personagemId))
      throw new BadRequestException("O mesmo personagem aparece duas vezes na run.");
    vistos.add(p.personagemId);
  }

  const drops = lista(b["drops"], "drops", MAX_DROPS).map((d, i) => {
    const x = objeto(d);
    return {
      itemId: uuid(x["itemId"], `drops[${i}].itemId`),
      // CT-61: quantidade inteira maior que zero.
      quantidade: inteiro(x["quantidade"], `drops[${i}].quantidade`, 1, 1_000_000),
    };
  });
  if (new Set(drops.map((d) => d.itemId)).size !== drops.length) {
    throw new BadRequestException("Item repetido nos drops: some as quantidades numa linha só.");
  }

  return {
    data: data(b["data"]),
    instanciaId: uuidOuNulo(b["instanciaId"], "instanciaId"),
    encontroId: uuidOuNulo(b["encontroId"], "encontroId"),
    chefe: b["chefe"] === undefined || b["chefe"] === null ? null : umDe(b["chefe"], CHEFES, "chefe"),
    status: umDe(b["status"], STATUS_RUN, "status"),
    pontuacaoBetelgeuse:
      b["pontuacaoBetelgeuse"] === undefined || b["pontuacaoBetelgeuse"] === null
        ? null
        : inteiro(b["pontuacaoBetelgeuse"], "pontuacaoBetelgeuse", 0, 1_000_000_000),
    observacao: textoOpcional(b["observacao"], "observacao", 1, 500) ?? null,
    participantes,
    drops,
  };
}

/** Texto obrigatório curto usado em motivos de correção. */
export const motivo = (v: unknown) => texto(v, "Motivo da correção", 3, 500);
