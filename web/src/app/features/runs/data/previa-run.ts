// Prévia da run pelo mesmo motor da API (@betel/scoring) e o corpo enviado para registrá-la.
import { type ConfigPontuacao, calcularParticipacao, dividirEmprestimos, ErroDominio } from "@betel/scoring";
import { paraCentesimos } from "../../../shared/dominio/cadastros";
import { type Catalogos, encontroDe, funcaoDe, indicePersonagens, type RascunhoRun } from "./runs.modelos";

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
