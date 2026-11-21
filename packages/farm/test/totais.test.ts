import { describe, expect, it } from "vitest";
import { ErroBackup, diaDoJogo, formatarZeny, lerBackup, lerZeny, periodo, totalizar } from "../src/index.js";

const br = (s: string) => Date.parse(`${s}-03:00`);

describe("períodos (dia, semana de segunda a domingo, mês)", () => {
  const hoje = diaDoJogo(br("2026-11-12T10:00"));

  it("semana atual e anterior", () => {
    expect(periodo("semana", hoje).rotulo).toBe("09/11 – 15/11");
    expect(periodo("semana", hoje, -1).rotulo).toBe("02/11 – 08/11");
    expect(periodo("semana", hoje).inicioMs).toBe(br("2026-11-09T04:00"));
  });

  it("mês e virada de ano", () => {
    expect(periodo("mes", hoje).rotulo).toBe("novembro 2026");
    expect(periodo("mes", hoje, 2).rotulo).toBe("janeiro 2027");
    expect(periodo("mes", hoje).fimMs).toBe(br("2026-12-01T04:00"));
  });

  it("dia", () => {
    expect(periodo("dia", hoje).rotulo).toBe("qui, 12/11/2026");
  });
});

describe("zeny", () => {
  it("lê os formatos da comunidade", () => {
    expect(lerZeny("1500000")).toBe(1_500_000);
    expect(lerZeny("1.500.000")).toBe(1_500_000);
    expect(lerZeny("1,5kk")).toBe(1_500_000);
    expect(lerZeny("300k")).toBe(300_000);
    expect(lerZeny("2m")).toBe(2_000_000);
    expect(lerZeny(" 50 z")).toBe(50);
    expect(lerZeny("")).toBeNull();
  });

  it("recusa o que não é preço", () => {
    expect(lerZeny("abc")).toBeUndefined();
    expect(lerZeny("-5")).toBeUndefined();
    expect(lerZeny("3kkk")).toBeUndefined(); // acima do teto do jogo
    expect(lerZeny("1.5.2k")).toBeUndefined();
  });

  it("formata curto", () => {
    expect(formatarZeny(1_250_000)).toBe("1,25kk");
    expect(formatarZeny(300_000)).toBe("300k");
    expect(formatarZeny(950)).toBe("950");
  });
});

describe("totais", () => {
  const precos: Record<string, number | null> = { ori: 10_000, elu: null };
  const t = totalizar(
    [
      {
        personagemId: "p1",
        instanciaId: "i1",
        drops: [
          { itemId: "ori", quantidade: 3 },
          { itemId: "elu", quantidade: 2 },
        ],
      },
      { personagemId: "p2", instanciaId: "i1", drops: [{ itemId: "ori", quantidade: 1 }] },
      { personagemId: "p1", instanciaId: "i2", drops: [] },
    ],
    (id) => precos[id] ?? null,
  );

  it("soma itens e valor; itens sem preço ficam fora do valor", () => {
    expect(t).toMatchObject({ checkins: 3, itens: 6, valor: 40_000, itensSemPreco: 2 });
    expect(t.porItem).toEqual([
      { itemId: "ori", quantidade: 4, precoUnitario: 10_000, subtotal: 40_000 },
      { itemId: "elu", quantidade: 2, precoUnitario: null, subtotal: null },
    ]);
  });

  it("agrupa por instância e por personagem", () => {
    expect(t.porInstancia.map((g) => [g.id, g.checkins, g.valor])).toEqual([
      ["i1", 2, 40_000],
      ["i2", 1, 0],
    ]);
    expect(t.porPersonagem.map((g) => [g.id, g.checkins, g.itens])).toEqual([
      ["p1", 2, 5],
      ["p2", 1, 1],
    ]);
  });
});

describe("backup do artefato (D54)", () => {
  const valido = {
    kind: "diario-instancias-backup",
    v: 1,
    exportadoEm: "2026-11-20T10:00:00.000Z",
    personagens: [{ id: "c1", nome: "Lia", classe: "" }],
    instancias: [{ id: "n1", nome: "Cripta", recarga: "TRES_DIAS", personagens: ["c1"], drops: ["i1"] }],
    itens: [{ id: "i1", nome: "Oridecon", precoZeny: 12000 }],
    checkins: [
      {
        id: "k1",
        personagem: "c1",
        instancia: "n1",
        nomeInstancia: "Cripta",
        feitoEm: br("2026-11-12T10:00"),
        drops: [
          { item: "i1", quantidade: 2, nome: "Oridecon" },
          { item: "i1", quantidade: 0, nome: "x" },
        ],
      },
    ],
  };

  it("aceita o formato do artefato e descarta drops com quantidade 0", () => {
    const b = lerBackup(valido);
    expect(b.checkins[0]!.drops).toEqual([{ item: "i1", quantidade: 2, nome: "Oridecon" }]);
    expect(b.instancias[0]!.recarga).toBe("TRES_DIAS");
  });

  it("recusa outro arquivo", () => {
    expect(() => lerBackup({ kind: "diario-instancias", insts: [] })).toThrow(ErroBackup);
    expect(() => lerBackup({ ...valido, instancias: [{ id: "n1", nome: "X", recarga: "ANUAL" }] })).toThrow(
      "Instância inválida",
    );
  });
});
