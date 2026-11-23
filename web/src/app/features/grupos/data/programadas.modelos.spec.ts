import {
  elegiveis,
  type GrupoProgramado,
  jaParticipa,
  type MeuPersonagem,
  ocupadas,
  situacaoDaVaga,
  type VagaProgramada,
} from "./programadas.modelos";

const livre: VagaProgramada = {
  tipo: "LIVRE",
  classeId: null,
  classe: null,
  importancia: null,
  ocupada: false,
  meuPersonagem: null,
};
const reservaMtk: VagaProgramada = {
  ...livre,
  tipo: "OBRIGATORIA",
  classeId: "c-mtk",
  classe: "MC",
  importancia: 5,
};
const meus: MeuPersonagem[] = [{ id: "p1", nome: "Ana-Ani", classeId: "c-ani" }];
const grupo = (vagas: VagaProgramada[], fechadoEm: string | null = null): GrupoProgramado => ({
  id: "g",
  instancia: { nome: "Torre" },
  agendadoEm: "",
  fechadoEm,
  vagas,
});

describe("Instâncias programadas (membro)", () => {
  it("elegíveis: a classe precisa bater quando a vaga reserva uma", () => {
    expect(elegiveis(livre, meus)).toEqual(meus);
    expect(elegiveis(reservaMtk, meus)).toEqual([]);
  });

  it("situação de cada vaga", () => {
    const minha = { ...livre, ocupada: true, meuPersonagem: "Ana-Ani" };
    const ocupada = { ...livre, ocupada: true };
    const g = grupo([livre, reservaMtk, ocupada]);
    expect(situacaoDaVaga(g, livre, meus)).toBe("elegivel");
    expect(situacaoDaVaga(g, reservaMtk, meus)).toBe("sem-personagem");
    expect(situacaoDaVaga(g, ocupada, meus)).toBe("ocupada");
    // Já participa: as outras vagas ficam indisponíveis.
    const comMinha = grupo([minha, livre]);
    expect(jaParticipa(comMinha)).toBeTrue();
    expect(situacaoDaVaga(comMinha, minha, meus)).toBe("minha");
    expect(situacaoDaVaga(comMinha, livre, meus)).toBe("indisponivel");
    expect(situacaoDaVaga(grupo([livre], "2026-11-01"), livre, meus)).toBe("indisponivel");
    expect(ocupadas(grupo([minha, ocupada, livre]))).toBe(2);
  });
});
