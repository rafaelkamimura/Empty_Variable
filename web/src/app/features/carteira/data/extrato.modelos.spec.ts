import {
  apenasCreditos,
  descreverLancamento,
  type Extrato,
  type LancamentoExtrato,
  somaDosLancamentos,
} from "./extrato.modelos";

describe("Extrato (US-06)", () => {
  it("descreve a origem dos lançamentos do extrato (US-06)", () => {
    const participacao = {
      personagem: { nome: "Beto-GX" },
      jogador: { id: "j-beto", apelido: "Beto" },
      funcao: { nome: "Garra Sombria", classe: { nomeOficial: "Executor", apelidoGrupo: "GX" } },
      rank: 3,
      pesoCentesimos: 200,
      multiplicadorChefeCentesimos: 100,
      multiplicadorStatusCentesimos: 100,
      fracaoCentesimos: 100,
      pontosGerados: 200,
    };
    const emprestimo = {
      categoria: "ESSENCIAL" as const,
      pctSugeridoBp: 2000,
      pctInformadoBp: null,
      pctEfetivo: "20.000000",
      pontos: 40,
      itemDescricao: "Arma",
      item: null,
      credor: { id: "j-x", apelido: "X" },
    };
    const base = { id: "l", criadoEm: "", observacao: null, estornaLancamentoId: null, run: null };
    const part = {
      ...base,
      valor: 200,
      tipo: "PARTICIPACAO",
      participacao,
      emprestimo: null,
    } as LancamentoExtrato;
    const deb = {
      ...base,
      valor: -40,
      tipo: "EMPRESTIMO_DEBITO",
      participacao,
      emprestimo,
    } as LancamentoExtrato;
    const cred = {
      ...base,
      valor: 40,
      tipo: "EMPRESTIMO_CREDITO",
      participacao,
      emprestimo,
    } as LancamentoExtrato;
    expect(descreverLancamento(part)).toContain("rank 3, peso 2 × encontro 1 × status 1 × fração 1");
    expect(descreverLancamento(deb)).toBe("Parcela para X pelo empréstimo de Arma (Essencial, 20%)");
    expect(descreverLancamento(cred)).toContain("para Beto (Beto-GX)");
  });

  it("transferências descrevem o outro lado; créditos e soma", () => {
    const base = {
      id: "l",
      criadoEm: "",
      observacao: null,
      estornaLancamentoId: null,
      run: null,
      participacao: null,
      emprestimo: null,
    };
    const transferencia = {
      id: "t",
      remetente: { apelido: "Cliente" },
      destinatario: { apelido: "Recebedor" },
    };
    const enviada = {
      ...base,
      valor: -100,
      tipo: "TRANSFERENCIA_ENVIADA",
      transferencia,
    } as LancamentoExtrato;
    const recebida = {
      ...base,
      valor: 100,
      tipo: "TRANSFERENCIA_RECEBIDA",
      transferencia,
    } as LancamentoExtrato;
    expect(descreverLancamento(enviada)).toBe("Enviada para Recebedor");
    expect(descreverLancamento(recebida)).toBe("Recebida de Cliente");
    const extrato: Extrato = {
      jogador: { id: "j", apelido: "A" },
      saldo: 0,
      lancamentos: [enviada, recebida],
    };
    expect(apenasCreditos(extrato).lancamentos).toEqual([recebida]);
    expect(somaDosLancamentos(extrato.lancamentos)).toBe(0);
  });
});
