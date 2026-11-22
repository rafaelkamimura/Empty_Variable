import * as e from "./edicao-run";
import { classes } from "./runs.modelos.spec";
import { novoRascunho, type RascunhoRun } from "./runs.modelos";

const base = (): RascunhoRun => novoRascunho("i-torre", "e-naght");

describe("Edição do rascunho da run", () => {
  it("não muta o rascunho original", () => {
    const r = base();
    const novo = e.comParticipante(r, 0, { personagemId: "p-ana" });
    expect(novo).not.toBe(r);
    expect(r.participantes[0]?.personagemId).toBeNull();
    expect(novo.participantes[0]?.personagemId).toBe("p-ana");
  });

  it("trocar a classe pré-seleciona a função padrão; sem padrão, fica sem função (D16)", () => {
    const comMtk = e.comClasse(base(), 0, "c-mtk", classes);
    expect(comMtk.participantes[0]?.funcaoId).toBe("f-mtk");
    const comMagus = e.comClasse(comMtk, 0, "c-magus", classes);
    expect(comMagus.participantes[0]?.funcaoId).toBeNull();
  });

  it("trocar a instância volta cada participante à função padrão (D45)", () => {
    const r = e.comParticipante(base(), 0, { classeId: "c-gx", funcaoId: "outra" });
    expect(e.comFuncoesPadrao(r, classes).participantes[0]?.funcaoId).toBe("f-gx");
  });

  it("adiciona, altera e remove empréstimos e drops pelo índice", () => {
    let r = e.comNovoEmprestimo(base(), 0);
    r = e.comNovoEmprestimo(r, 0);
    r = e.comEmprestimo(r, 0, 1, { credorJogadorId: "j-x" });
    expect(r.participantes[0]?.emprestimos.map((x) => x.credorJogadorId)).toEqual([null, "j-x"]);
    r = e.semEmprestimo(r, 0, 0);
    expect(r.participantes[0]?.emprestimos.map((x) => x.credorJogadorId)).toEqual(["j-x"]);

    r = e.comDrop(e.comNovoDrop(r), 0, { itemId: "it-1", quantidade: 2 });
    expect(r.drops).toEqual([{ itemId: "it-1", quantidade: 2 }]);
    expect(e.semDrop(r, 0).drops).toEqual([]);
    expect(e.semParticipante(r, 0).participantes).toEqual([]);
  });

  it("índice inexistente não altera nada", () => {
    const r = base();
    expect(e.comParticipante(r, 5, { personagemId: "p" })).toBe(r);
  });

  it("numeroOuNulo: vazio vira nulo; texto inválido também", () => {
    expect(e.numeroOuNulo("")).toBeNull();
    expect(e.numeroOuNulo("abc")).toBeNull();
    expect(e.numeroOuNulo("12.5")).toBe(12.5);
  });
});
