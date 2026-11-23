// Pendências do assistente de run (T-20): o que impede avançar em cada passo, campo a campo.
// Puro (sem Angular). O `campo` liga a mensagem ao controle da tela (atributo data-campo), para o
// erro aparecer no próprio campo e o foco ir até ele (diretrizes §6.4 e §7).
import { paraCentesimos } from "../../../shared/dominio/cadastros";
import type { Pendencia, PendenciasPorPasso } from "../../../shared/utils/validacao-passos";
import { type Catalogos, encontroDe, funcaoDe, indicePersonagens, type RascunhoRun } from "./runs.modelos";

/** Passos do assistente que têm campos (a revisão só mostra a prévia). */
export type PassoRun = "dados" | "participantes" | "emprestimos" | "drops";

export const PASSOS_RUN: readonly PassoRun[] = ["dados", "participantes", "emprestimos", "drops"];

export type PendenciasRun = PendenciasPorPasso<PassoRun>;

/** Ids dos campos do assistente. Viram o atributo `data-campo` do controle. */
export const campoRun = {
  dados: (campo: "data" | "instanciaId" | "encontroId" | "pontuacaoBetelgeuse" | "motivo") =>
    `dados.${campo}`,
  participante: (chave: string, campo: "personagemId" | "classeId" | "funcaoId") =>
    `participantes.${chave}.${campo}`,
  emprestimo: (
    chaveParticipante: string,
    chave: string,
    campo: "credorJogadorId" | "itemDescricao" | "percentualInformado",
  ) => `participantes.${chaveParticipante}.emprestimos.${chave}.${campo}`,
  drop: (chave: string, campo: "itemId" | "quantidade") => `drops.${chave}.${campo}`,
};

/**
 * Pendências que impedem avançar, por passo. Na correção (US-07), `motivo` é o motivo digitado:
 * ele também é obrigatório no primeiro passo.
 */
export function pendencias(r: RascunhoRun, cat: Catalogos, motivo: string | null = null): PendenciasRun {
  return {
    dados: pendenciasDados(r, cat, motivo),
    participantes: pendenciasParticipantes(r, cat),
    emprestimos: pendenciasEmprestimos(r),
    drops: pendenciasDrops(r),
  };
}

function pendenciasDados(r: RascunhoRun, cat: Catalogos, motivo: string | null): Pendencia[] {
  const lista: Pendencia[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(r.data))
    lista.push({ campo: campoRun.dados("data"), mensagem: "Informe a data da run." });
  if (r.instanciaId === null)
    lista.push({ campo: campoRun.dados("instanciaId"), mensagem: "Escolha a instância." });
  else if (encontroDe(r, cat) === null)
    lista.push({ campo: campoRun.dados("encontroId"), mensagem: "Escolha o encontro." });
  const b = r.pontuacaoBetelgeuse;
  if (b !== null && (!Number.isInteger(b) || b < 0)) {
    lista.push({
      campo: campoRun.dados("pontuacaoBetelgeuse"),
      mensagem: "A pontuação do Betelgeuse deve ser um número inteiro, zero ou maior.",
    });
  }
  if (motivo !== null && motivo.trim().length < 3)
    lista.push({ campo: campoRun.dados("motivo"), mensagem: "Informe o motivo da correção." });
  return lista;
}

function pendenciasParticipantes(r: RascunhoRun, cat: Catalogos): Pendencia[] {
  const pessoas = indicePersonagens(cat.jogadores);
  const lista: Pendencia[] = [];
  if (r.participantes.length === 0)
    lista.push({ campo: "participantes", mensagem: "Adicione ao menos um participante." });
  const vistos = new Set<string>();
  r.participantes.forEach((p, i) => {
    const contexto = `Participante ${i + 1}`;
    const campo = (c: "personagemId" | "classeId" | "funcaoId") => campoRun.participante(p.chave, c);
    if (p.personagemId === null) {
      lista.push({ campo: campo("personagemId"), mensagem: "Escolha o personagem.", contexto });
    } else if (vistos.has(p.personagemId)) {
      // CT-52
      const nome = pessoas.get(p.personagemId)?.nome ?? "Este personagem";
      lista.push({ campo: campo("personagemId"), mensagem: `${nome} já está na run.`, contexto });
    } else vistos.add(p.personagemId);
    if (p.classeId === null) {
      lista.push({ campo: campo("classeId"), mensagem: "Escolha a classe.", contexto });
    } else if (funcaoDe(p, cat) === null) {
      // D16: classe sem função padrão
      lista.push({
        campo: campo("funcaoId"),
        mensagem: "Esta classe não tem função padrão; escolha a função.",
        contexto,
      });
    }
  });
  return lista;
}

function pendenciasEmprestimos(r: RascunhoRun): Pendencia[] {
  const lista: Pendencia[] = [];
  r.participantes.forEach((p, i) => {
    p.emprestimos.forEach((e, j) => {
      const contexto = `Participante ${i + 1}, empréstimo ${j + 1}`;
      const campo = (c: "credorJogadorId" | "itemDescricao" | "percentualInformado") =>
        campoRun.emprestimo(p.chave, e.chave, c);
      if (e.credorJogadorId === null)
        lista.push({ campo: campo("credorJogadorId"), mensagem: "Escolha quem emprestou.", contexto });
      if (e.itemId === null && e.itemDescricao.trim().length < 2)
        lista.push({ campo: campo("itemDescricao"), mensagem: "Escolha o item ou descreva-o.", contexto });
      if (e.percentualInformado !== null) {
        const bp = paraCentesimos(e.percentualInformado);
        if (bp === null || bp > 10_000) {
          lista.push({
            campo: campo("percentualInformado"),
            mensagem: "Informe um percentual entre 0 e 100, com até 2 casas.",
            contexto,
          });
        }
      }
    });
  });
  return lista;
}

function pendenciasDrops(r: RascunhoRun): Pendencia[] {
  const lista: Pendencia[] = [];
  const itens = new Set<string>();
  r.drops.forEach((d, i) => {
    const contexto = `Item ${i + 1}`;
    if (d.itemId === null) {
      lista.push({ campo: campoRun.drop(d.chave, "itemId"), mensagem: "Escolha o item.", contexto });
    } else if (itens.has(d.itemId)) {
      lista.push({
        campo: campoRun.drop(d.chave, "itemId"),
        mensagem: "Item repetido; some as quantidades numa linha só.",
        contexto,
      });
    } else itens.add(d.itemId);
    if (d.quantidade === null || !Number.isInteger(d.quantidade) || d.quantidade < 1) {
      // CT-61
      lista.push({
        campo: campoRun.drop(d.chave, "quantidade"),
        mensagem: "Informe uma quantidade inteira maior que zero.",
        contexto,
      });
    }
  });
  return lista;
}
