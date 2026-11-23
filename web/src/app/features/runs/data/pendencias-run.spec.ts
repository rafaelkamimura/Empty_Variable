import { campoRun, pendencias, textoPendencia } from "./pendencias-run";
import { cat } from "./runs.modelos.spec";
import { novoDrop, novoEmprestimo, novoParticipante, novoRascunho, type RascunhoRun } from "./runs.modelos";

const base = (parcial: Partial<RascunhoRun> = {}): RascunhoRun => ({
  ...novoRascunho("i-torre", "e-naght"),
  participantes: [],
  ...parcial,
});

describe("Pendências do assistente de run", () => {
  it("cada pendência aponta o campo e diz como corrigir", () => {
    const p = { ...novoParticipante(), emprestimos: [{ ...novoEmprestimo(), percentualInformado: 150 }] };
    const d = { ...novoDrop(), quantidade: 0 };
    const pend = pendencias(base({ data: "", participantes: [p], drops: [d] }), cat);

    expect(pend.dados).toEqual([{ campo: campoRun.dados("data"), mensagem: "Informe a data da run." }]);
    expect(pend.participantes.map((x) => x.campo)).toEqual([
      campoRun.participante(p.chave, "personagemId"),
      campoRun.participante(p.chave, "classeId"),
    ]);
    const e = p.emprestimos[0]!;
    expect(pend.emprestimos.map((x) => x.campo)).toEqual([
      campoRun.emprestimo(p.chave, e.chave, "credorJogadorId"),
      campoRun.emprestimo(p.chave, e.chave, "itemDescricao"),
      campoRun.emprestimo(p.chave, e.chave, "percentualInformado"),
    ]);
    expect(pend.drops.map((x) => x.campo)).toEqual([
      campoRun.drop(d.chave, "itemId"),
      campoRun.drop(d.chave, "quantidade"),
    ]);
  });

  it("o resumo leva o contexto da linha; o campo, só a mensagem", () => {
    const pend = pendencias(base({ participantes: [novoParticipante()] }), cat);
    expect(pend.participantes[0]!.mensagem).toBe("Escolha o personagem.");
    expect(textoPendencia(pend.participantes[0]!)).toBe("Participante 1: escolha o personagem.");
  });

  it("lista vazia: pendência sem campo", () => {
    expect(pendencias(base(), cat).participantes).toEqual([
      { campo: "participantes", mensagem: "Adicione ao menos um participante." },
    ]);
  });

  it("na correção, o motivo entra no cálculo do primeiro passo", () => {
    expect(pendencias(base(), cat).dados).toEqual([]);
    expect(pendencias(base(), cat, " a ").dados).toEqual([
      { campo: campoRun.dados("motivo"), mensagem: "Informe o motivo da correção." },
    ]);
    expect(pendencias(base(), cat, "Rank errado").dados).toEqual([]);
  });

  it("drop repetido aponta o item da segunda linha", () => {
    const a = { ...novoDrop(), itemId: "i1" };
    const b = { ...novoDrop(), itemId: "i1" };
    const pend = pendencias(base({ drops: [a, b] }), cat).drops;
    expect(pend.map((x) => x.campo)).toEqual([campoRun.drop(b.chave, "itemId")]);
  });

  it("nenhum código interno nos textos", () => {
    const p = { ...novoParticipante(), personagemId: "p-ana", classeId: "c-magus" };
    const pend = pendencias(base({ participantes: [p, { ...p }], drops: [novoDrop()] }), cat);
    const textos = [...pend.participantes, ...pend.drops].map(textoPendencia).join(" ");
    expect(textos).not.toMatch(/\((CT|D|C|US|T)-?\d/);
  });
});
