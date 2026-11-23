// Modelo do assistente de run (T-20): o rascunho editável e as pendências de cada passo.
// A prévia e o corpo ficam em previa-run.ts; a run registrada, em detalhe-run.modelos.ts.
// Tudo aqui é puro (sem Angular), para ser testado isoladamente.
import type { CategoriaEmprestimo, StatusRun } from "@betel/scoring";
import {
  type Classe,
  type FuncaoClasse,
  type ItemCatalogo,
  paraCentesimos,
} from "../../../shared/dominio/cadastros";
import type { Instancia } from "../../../shared/dominio/instancias";
import { ROTULO_CATEGORIA } from "../../../shared/dominio/emprestimo";

export const ROTULO_STATUS: Record<StatusRun | "ESTORNADA", string> = {
  CONCLUIDA: "Concluída",
  FALHA_CHEFE: "Falha no chefe",
  ABORTADA: "Abortada",
  ESTORNADA: "Estornada (corrigida)",
};

// Rótulo das categorias de empréstimo: mora em shared/dominio (usado também pelo extrato).
export { ROTULO_CATEGORIA };

export const ROTULO_FRACAO: Record<number, string> = {
  100: "Completa (1)",
  50: "Parcial (0,5)",
  0: "Nenhuma (0)",
};

/** Jogador como GET /api/jogadores devolve. */
export interface JogadorCadastro {
  id: string;
  apelido: string;
  personagens: { id: string; nome: string; ativo: boolean }[];
}

export interface RascunhoEmprestimo {
  credorJogadorId: string | null;
  itemId: string | null;
  itemDescricao: string;
  categoria: CategoriaEmprestimo;
  /** % digitado pelo admin (ex.: 25). null = usa a sugestão da categoria. */
  percentualInformado: number | null;
}

export interface RascunhoParticipante {
  personagemId: string | null;
  classeId: string | null;
  funcaoId: string | null;
  fracaoCentesimos: 100 | 50 | 0;
  emprestimos: RascunhoEmprestimo[];
}

export interface RascunhoRun {
  data: string;
  /** Épico IV (D44): instância e encontro da run. */
  instanciaId: string | null;
  encontroId: string | null;
  status: StatusRun;
  pontuacaoBetelgeuse: number | null;
  observacao: string;
  participantes: RascunhoParticipante[];
  drops: { itemId: string | null; quantidade: number | null }[];
}

/** Dados de apoio carregados da API. */
export interface Catalogos {
  jogadores: JogadorCadastro[];
  /** Classes com as funções da versão vigente da instância escolhida (D45). */
  classes: Classe[];
  instancias: Instancia[];
  itens: ItemCatalogo[];
}

export function hojeIso(agora = new Date()): string {
  const d = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 10);
}

export function novoRascunho(
  instanciaId: string | null = null,
  encontroId: string | null = null,
): RascunhoRun {
  return {
    data: hojeIso(),
    instanciaId,
    encontroId,
    status: "CONCLUIDA",
    pontuacaoBetelgeuse: null,
    observacao: "",
    participantes: [novoParticipante()],
    drops: [],
  };
}

export function novoParticipante(): RascunhoParticipante {
  return { personagemId: null, classeId: null, funcaoId: null, fracaoCentesimos: 100, emprestimos: [] };
}

export function novoEmprestimo(): RascunhoEmprestimo {
  return {
    credorJogadorId: null,
    itemId: null,
    itemDescricao: "",
    categoria: "IMPORTANTE",
    percentualInformado: null,
  };
}

/** Função padrão da classe, ou null quando a classe exige escolha (D16). */
export function funcaoPadrao(classe: Classe | undefined): FuncaoClasse | null {
  return classe?.funcoes.find((f) => f.padrao) ?? null;
}

/** Encontro escolhido, dentro da versão vigente da instância escolhida. */
export function encontroDe(r: RascunhoRun, cat: Catalogos) {
  return (
    cat.instancias
      .find((i) => i.id === r.instanciaId)
      ?.vigente?.encontros.find((e) => e.id === r.encontroId) ?? null
  );
}

/**
 * Correção (D46): a run antiga é de uma versão que pode não ser mais a vigente. O encontro e as
 * funções passam para os da versão vigente com o mesmo nome; o que não existir mais fica para
 * escolher de novo (vira pendência no assistente).
 */
export function ajustarAVersaoVigente(
  r: RascunhoRun,
  cat: Catalogos,
  antigos: { encontro: string; funcoes: Map<string, string> },
): RascunhoRun {
  const vigente = cat.instancias.find((i) => i.id === r.instanciaId)?.vigente;
  const encontro =
    vigente?.encontros.find((e) => e.id === r.encontroId) ??
    vigente?.encontros.find((e) => e.nome.toLowerCase() === antigos.encontro.toLowerCase()) ??
    null;
  return {
    ...r,
    encontroId: encontro?.id ?? null,
    participantes: r.participantes.map((p) => {
      const classe = cat.classes.find((c) => c.id === p.classeId);
      if (classe === undefined || p.funcaoId === null || classe.funcoes.some((f) => f.id === p.funcaoId))
        return p;
      const nome = antigos.funcoes.get(p.funcaoId)?.toLowerCase();
      const igual = classe.funcoes.find((f) => f.nome.toLowerCase() === nome);
      return { ...p, funcaoId: igual?.id ?? funcaoPadrao(classe)?.id ?? null };
    }),
  };
}

/** Dono (jogador) de cada personagem. */
export function indicePersonagens(jogadores: JogadorCadastro[]) {
  const m = new Map<string, { nome: string; ativo: boolean; jogadorId: string; apelido: string }>();
  for (const j of jogadores) {
    for (const p of j.personagens)
      m.set(p.id, { nome: p.nome, ativo: p.ativo, jogadorId: j.id, apelido: j.apelido });
  }
  return m;
}

export function funcaoDe(p: RascunhoParticipante, cat: Catalogos): FuncaoClasse | null {
  const classe = cat.classes.find((c) => c.id === p.classeId);
  if (classe === undefined) return null;
  if (p.funcaoId !== null) return classe.funcoes.find((f) => f.id === p.funcaoId) ?? null;
  return funcaoPadrao(classe);
}

/** Pendências que impedem avançar, por passo do assistente (1 a 4). */
export function pendencias(r: RascunhoRun, cat: Catalogos): Record<1 | 2 | 3 | 4, string[]> {
  const pessoas = indicePersonagens(cat.jogadores);
  const passo1: string[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data)) passo1.push("Informe a data da run.");
  if (r.instanciaId === null) passo1.push("Escolha a instância.");
  else if (encontroDe(r, cat) === null) passo1.push("Escolha o encontro.");
  if (
    r.pontuacaoBetelgeuse !== null &&
    (!Number.isInteger(r.pontuacaoBetelgeuse) || r.pontuacaoBetelgeuse < 0)
  ) {
    passo1.push("A pontuação do Betelgeuse deve ser um inteiro ≥ 0.");
  }

  const passo2: string[] = [];
  if (r.participantes.length === 0) passo2.push("Adicione ao menos um participante.");
  const vistos = new Set<string>();
  r.participantes.forEach((p, i) => {
    const n = `Participante ${i + 1}`;
    if (p.personagemId === null) passo2.push(`${n}: escolha o personagem.`);
    else if (vistos.has(p.personagemId)) {
      passo2.push(`${n}: ${pessoas.get(p.personagemId)?.nome ?? "personagem"} já está na run.`); // CT-52
    } else vistos.add(p.personagemId);
    if (p.classeId === null) passo2.push(`${n}: escolha a classe.`);
    else if (funcaoDe(p, cat) === null)
      passo2.push(`${n}: esta classe não tem função padrão; escolha a função.`);
  });

  const passo3: string[] = [];
  r.participantes.forEach((p, i) => {
    p.emprestimos.forEach((e, j) => {
      const n = `Participante ${i + 1}, empréstimo ${j + 1}`;
      if (e.credorJogadorId === null) passo3.push(`${n}: escolha quem emprestou.`);
      if (e.itemId === null && e.itemDescricao.trim().length < 2)
        passo3.push(`${n}: escolha o item ou descreva-o.`);
      if (e.percentualInformado !== null) {
        const bp = paraCentesimos(e.percentualInformado);
        if (bp === null || bp > 10_000) passo3.push(`${n}: percentual entre 0 e 100, com até 2 casas.`);
      }
    });
  });

  const passo4: string[] = [];
  const itensDrop = new Set<string>();
  r.drops.forEach((d, i) => {
    const n = `Drop ${i + 1}`;
    if (d.itemId === null) passo4.push(`${n}: escolha o item.`);
    else if (itensDrop.has(d.itemId)) passo4.push(`${n}: item repetido; some as quantidades.`);
    else itensDrop.add(d.itemId);
    if (d.quantidade === null || !Number.isInteger(d.quantidade) || d.quantidade < 1) {
      passo4.push(`${n}: quantidade inteira maior que zero.`); // CT-61
    }
  });

  return { 1: passo1, 2: passo2, 3: passo3, 4: passo4 };
}
