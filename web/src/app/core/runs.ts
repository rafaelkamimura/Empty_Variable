// Modelo do assistente de run (T-20): rascunho editável, prévia pelo motor e corpo para a API.
// Tudo aqui é puro (sem Angular), para ser testado isoladamente.
import {
  type CategoriaEmprestimo,
  type ConfigPontuacao,
  calcularParticipacao,
  dividirEmprestimos,
  ErroDominio,
  type StatusRun,
} from "@betel/scoring";
import { type Classe, type FuncaoClasse, type ItemCatalogo, paraCentesimos } from "./cadastros";
import type { Instancia } from "./instancias";
import { ROTULO_CATEGORIA } from "../shared/dominio/emprestimo";

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

function funcaoDe(p: RascunhoParticipante, cat: Catalogos): FuncaoClasse | null {
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
      passo2.push(`${n}: ${pessoas.get(p.personagemId)?.nome ?? "personagem"} já está na run (CT-52).`);
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
      passo4.push(`${n}: quantidade inteira maior que zero (CT-61).`);
    }
  });

  return { 1: passo1, 2: passo2, 3: passo3, 4: passo4 };
}

export interface LinhaPrevia {
  personagem: string;
  jogador: string;
  funcao: string;
  rank: number;
  pontos: number;
  parcelas: { credor: string; percentualAplicadoBp: number; pontos: number }[];
  pontosTomador: number;
  reducao: boolean;
  erro: string | null;
}

export interface Previa {
  linhas: LinhaPrevia[];
  /** Saldo que cada jogador ganha com a run (já com as parcelas). */
  porJogador: { jogador: string; pontos: number }[];
  total: number;
  erros: string[];
}

/** Mesmo cálculo da API, feito no navegador pelo motor compartilhado. */
export function calcularPrevia(r: RascunhoRun, config: ConfigPontuacao, cat: Catalogos): Previa {
  const pessoas = indicePersonagens(cat.jogadores);
  const apelido = new Map(cat.jogadores.map((j) => [j.id, j.apelido]));
  const ganhos = new Map<string, number>();
  const somar = (j: string, v: number) => ganhos.set(j, (ganhos.get(j) ?? 0) + v);
  const erros: string[] = [];
  const encontro = encontroDe(r, cat);
  if (encontro === null) return { linhas: [], porJogador: [], total: 0, erros: [] };

  const linhas = r.participantes.flatMap((p): LinhaPrevia[] => {
    const pessoa = p.personagemId === null ? undefined : pessoas.get(p.personagemId);
    const funcao = funcaoDe(p, cat);
    if (pessoa === undefined || funcao === null) return [];
    const base = {
      personagem: pessoa.nome,
      jogador: pessoa.apelido,
      funcao: funcao.nome,
      rank: funcao.rank,
    };
    try {
      const calc = calcularParticipacao(
        {
          rank: funcao.rank,
          multiplicadorEncontroCentesimos: encontro.multiplicadorCentesimos,
          status: r.status,
          fracaoCentesimos: p.fracaoCentesimos,
        },
        config,
      );
      const div = dividirEmprestimos(
        calc.pontos,
        pessoa.jogadorId,
        p.emprestimos.map((e) => {
          const bp = e.percentualInformado === null ? null : paraCentesimos(e.percentualInformado);
          return {
            credorJogadorId: e.credorJogadorId ?? "",
            categoria: e.categoria,
            ...(bp === null ? {} : { percentualInformadoBp: bp }),
          };
        }),
        config,
      );
      somar(pessoa.apelido, div.pontosTomador);
      for (const parc of div.parcelas) somar(apelido.get(parc.credorJogadorId) ?? "?", parc.pontos);
      return [
        {
          ...base,
          pontos: calc.pontos,
          parcelas: div.parcelas.map((parc) => ({
            credor: apelido.get(parc.credorJogadorId) ?? "?",
            percentualAplicadoBp: parc.percentualAplicadoBp,
            pontos: parc.pontos,
          })),
          pontosTomador: div.pontosTomador,
          reducao: div.reducaoProporcionalAplicada,
          erro: null,
        },
      ];
    } catch (e) {
      const msg = e instanceof ErroDominio ? e.message : String(e);
      erros.push(`${pessoa.nome}: ${msg}`);
      return [{ ...base, pontos: 0, parcelas: [], pontosTomador: 0, reducao: false, erro: msg }];
    }
  });

  const porJogador = [...ganhos.entries()]
    .map(([jogador, pontos]) => ({ jogador, pontos }))
    .sort((a, b) => b.pontos - a.pontos || a.jogador.localeCompare(b.jogador));
  return { linhas, porJogador, total: linhas.reduce((a, l) => a + l.pontos, 0), erros };
}

/** Corpo de POST /api/runs (ou do campo `run` na correção). */
export function montarCorpo(r: RascunhoRun, cat: Catalogos) {
  return {
    data: r.data,
    instanciaId: r.instanciaId,
    encontroId: r.encontroId,
    status: r.status,
    ...(r.pontuacaoBetelgeuse === null ? {} : { pontuacaoBetelgeuse: r.pontuacaoBetelgeuse }),
    ...(r.observacao.trim() === "" ? {} : { observacao: r.observacao.trim() }),
    participantes: r.participantes.map((p) => {
      const funcao = funcaoDe(p, cat);
      return {
        personagemId: p.personagemId,
        ...(funcao === null ? { classeId: p.classeId } : { funcaoId: funcao.id }),
        fracaoCentesimos: p.fracaoCentesimos,
        emprestimos: p.emprestimos.map((e) => ({
          credorJogadorId: e.credorJogadorId,
          categoria: e.categoria,
          ...(e.itemId === null ? { itemDescricao: e.itemDescricao.trim() } : { itemId: e.itemId }),
          ...(e.percentualInformado === null
            ? {}
            : { percentualInformadoBp: paraCentesimos(e.percentualInformado) }),
        })),
      };
    }),
    drops: r.drops.map((d) => ({ itemId: d.itemId, quantidade: d.quantidade })),
  };
}

/** Detalhe da run como GET /api/runs/:id devolve (só os campos usados no frontend). */
export interface DetalheRun {
  id: string;
  data: string;
  encontro: { id: string; nome: string; codigo: string | null; multiplicadorCentesimos: number };
  versaoInstancia: { id: string; versao: number; instancia: { id: string; nome: string } };
  status: StatusRun | "ESTORNADA";
  pontuacaoBetelgeuse: number | null;
  observacao: string | null;
  criadaEm: string;
  corrigeRunId: string | null;
  corrigidaPorRunId: string | null;
  config: { id: string; versao: number };
  registradaPor: { id: string; discordUsername: string };
  participacoes: {
    id: string;
    personagem: { id: string; nome: string };
    jogador: { id: string; apelido: string };
    funcao: {
      id: string;
      nome: string;
      classe: { id: string; nomeOficial: string; apelidoGrupo: string | null };
    };
    fracaoCentesimos: 100 | 50 | 0;
    rank: number;
    pesoCentesimos: number;
    multiplicadorChefeCentesimos: number;
    multiplicadorStatusCentesimos: number;
    pontosGerados: number;
    emprestimos: {
      id: string;
      credor: { id: string; apelido: string };
      item: { id: string; nome: string } | null;
      itemDescricao: string | null;
      categoria: CategoriaEmprestimo;
      pctSugeridoBp: number;
      pctInformadoBp: number | null;
      pctEfetivo: string;
      pontos: number;
    }[];
  }[];
  drops: {
    id: string;
    quantidade: number;
    item: { id: string; nome: string; idJogo?: number | null };
    lancadoNoEstoque: boolean;
  }[];
  lancamentos: {
    id: string;
    valor: number;
    tipo: string;
    jogador: { id: string; apelido: string };
    estornaLancamentoId: string | null;
  }[];
}

/** Rascunho pré-preenchido para a correção (US-07): a run como foi registrada. */
export function rascunhoDeRun(d: DetalheRun): RascunhoRun {
  return {
    data: d.data.slice(0, 10),
    instanciaId: d.versaoInstancia.instancia.id,
    encontroId: d.encontro.id,
    status: d.status === "ESTORNADA" ? "CONCLUIDA" : d.status,
    pontuacaoBetelgeuse: d.pontuacaoBetelgeuse,
    observacao: d.observacao ?? "",
    participantes: d.participacoes.map((p) => ({
      personagemId: p.personagem.id,
      classeId: p.funcao.classe.id,
      funcaoId: p.funcao.id,
      fracaoCentesimos: p.fracaoCentesimos,
      emprestimos: p.emprestimos.map((e) => ({
        credorJogadorId: e.credor.id,
        itemId: e.item?.id ?? null,
        itemDescricao: e.itemDescricao ?? "",
        categoria: e.categoria,
        percentualInformado: e.pctInformadoBp === null ? null : e.pctInformadoBp / 100,
      })),
    })),
    drops: d.drops.map((x) => ({ itemId: x.item.id, quantidade: x.quantidade })),
  };
}

export type PendenciaRascunho =
  | "USUARIO_DESCONHECIDO"
  | "SEM_VINCULO"
  | "PERSONAGEM_NAO_ENCONTRADO"
  | "PERSONAGEM_INATIVO"
  | "PERSONAGEM_REPETIDO"
  | "CLASSE_NAO_ENCONTRADA";

export const ROTULO_PENDENCIA: Record<PendenciaRascunho, string> = {
  USUARIO_DESCONHECIDO: "Discord sem usuário neste sistema",
  SEM_VINCULO: "Usuário sem vínculo com um jogador",
  PERSONAGEM_NAO_ENCONTRADO: "Personagem não cadastrado para o jogador",
  PERSONAGEM_INATIVO: "Personagem inativo",
  PERSONAGEM_REPETIDO: "Personagem repetido no grupo",
  CLASSE_NAO_ENCONTRADA: "Classe não encontrada",
};

/** Rascunho vindo do nag4eyes como GET /api/rascunhos-run/:id devolve. */
export interface RascunhoNag4eyes {
  id: string;
  partyId: string | null;
  data: string;
  status: "PENDENTE" | "CONFIRMADO" | "DESCARTADO";
  recebidoEm: string;
  instancia: { id: string; nome: string } | null;
  instanciaOrigem: { nome: string; nomeIngles: string | null; slug: string | null } | null;
  runId: string | null;
  participantes: {
    id: string;
    ordem: number;
    discordId: string;
    personagemNome: string;
    classeNome: string | null;
    pendencia: PendenciaRascunho | null;
    jogador: { id: string; apelido: string } | null;
    personagem: { id: string; nome: string } | null;
    classe: { id: string; nomeOficial: string; apelidoGrupo: string | null } | null;
  }[];
}

/** Resumo do rascunho como GET /api/rascunhos-run devolve. */
export interface ResumoRascunhoNag4eyes {
  id: string;
  partyId: string | null;
  data: string;
  status: RascunhoNag4eyes["status"];
  recebidoEm: string;
  instancia: { id: string; nome: string } | null;
  instanciaOrigem: RascunhoNag4eyes["instanciaOrigem"];
  participantes: number;
  pendentes: number;
}

/**
 * Pré-preenche o assistente com o rascunho do nag4eyes: a data e os participantes resolvidos (sem
 * função escolhida, vale a padrão da classe). A instância fica a de `base`, que o assistente já
 * escolhe pelo rascunho quando ela pode receber runs. Os participantes com pendência ficam de fora
 * e são mostrados à parte para o gestor incluir à mão. Resultado, encontro, empréstimos e drops
 * continuam com o gestor.
 */
export function rascunhoDeNag4eyes(d: RascunhoNag4eyes, base: RascunhoRun): RascunhoRun {
  const resolvidos = d.participantes.filter(
    (p) => p.pendencia === null && p.personagem !== null && p.classe !== null,
  );
  return {
    ...base,
    data: d.data.slice(0, 10),
    participantes: resolvidos.map((p) => ({
      ...novoParticipante(),
      personagemId: p.personagem?.id ?? null,
      classeId: p.classe?.id ?? null,
    })),
  };
}

/** Participantes do rascunho que não entraram no pré-preenchimento, com o motivo. */
export function pendentesDoRascunho(d: RascunhoNag4eyes) {
  return d.participantes
    .filter((p) => p.pendencia !== null || p.personagem === null || p.classe === null)
    .map((p) => ({
      discordId: p.discordId,
      personagem: p.personagemNome,
      classe: p.classeNome,
      jogador: p.jogador?.apelido ?? null,
      motivo: ROTULO_PENDENCIA[p.pendencia ?? "CLASSE_NAO_ENCONTRADA"],
    }));
}
