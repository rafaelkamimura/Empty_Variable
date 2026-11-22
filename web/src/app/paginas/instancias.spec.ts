import { pontosPrevia } from "./gestao-instancia.component";
import { deReferencia } from "./gestao-instancias.component";
import {
  corpoVersao,
  type Instancia,
  pendenciasVersao,
  recebeRun,
  situacaoInstancia,
  textoMultiplicador,
} from "../shared/dominio/instancias";

const instancia = (ativa: boolean, funcoes: number): Instancia => ({
  id: "i1",
  nome: "Teste",
  codigo: null,
  ativa,
  nivelMinimo: null,
  retorno: null,
  modo: null,
  dificuldade: null,
  requisito: null,
  premiacao: null,
  vigente: {
    id: "v1",
    versao: 1,
    vigenteDesde: "",
    criadaPor: null,
    encontros: [{ id: "e1", nome: "Chefe", codigo: null, multiplicadorCentesimos: 100 }],
    funcoes: Array.from({ length: funcoes }, (_, n) => ({
      id: `f${n}`,
      nome: `F${n}`,
      rank: 3,
      padrao: false,
      classe: { id: `c${n}`, nomeOficial: `C${n}`, apelidoGrupo: null, ativa: true },
    })),
  },
});

describe("instâncias (M15, D43 a D46)", () => {
  it("só instância ativa e com funções recebe run (CT-146)", () => {
    expect(recebeRun(instancia(true, 1))).toBe(true);
    expect(recebeRun(instancia(true, 0))).toBe(false);
    expect(recebeRun(instancia(false, 1))).toBe(false);
    expect(situacaoInstancia(instancia(true, 0)).tipo).toBe("sem-funcoes");
    expect(situacaoInstancia(instancia(false, 2)).tipo).toBe("inativa");
    expect(situacaoInstancia(instancia(true, 2)).texto).toBe("Ativa");
  });

  it("mostra o multiplicador em centésimos como ×1,5", () => {
    expect(textoMultiplicador(150)).toBe("×1,5");
    expect(textoMultiplicador(100)).toBe("×1");
    expect(textoMultiplicador(125)).toBe("×1,25");
  });

  it("a referência da browiki pré-preenche o cadastro, sem multiplicador (D44)", () => {
    const n = deReferencia({
      nome: "Torre sem Fim",
      nivelMinimo: 50,
      retorno: "SEMANAL",
      detalheRetorno: null,
      modo: "GRUPO",
      dificuldade: "MEDIA",
      requisito: null,
      premiacao: "Itens",
    });
    expect(n).toEqual({
      nome: "Torre sem Fim",
      nivelMinimo: 50,
      retorno: "SEMANAL",
      modo: "GRUPO",
      dificuldade: "MEDIA",
      requisito: "",
      premiacao: "Itens",
    });
    expect("multiplicador" in n).toBe(false);
  });

  it("o editor de versão aponta as pendências antes de enviar", () => {
    const ok = pendenciasVersao(
      [{ nome: "Chefe", multiplicador: 1.5 }],
      [{ classeId: "c1", nome: "Tanque", rank: 5, padrao: true }],
    );
    expect(ok).toEqual([]);
    expect(pendenciasVersao([], [])).toContain("Informe ao menos um encontro.");
    expect(pendenciasVersao([{ nome: "A", multiplicador: 0 }], [])).toContain(
      "Multiplicadores maiores que zero, com até 2 casas.",
    );
    expect(pendenciasVersao([{ nome: "A", multiplicador: 1.234 }], [])).toContain(
      "Multiplicadores maiores que zero, com até 2 casas.",
    );
    expect(
      pendenciasVersao(
        [
          { nome: "A", multiplicador: 1 },
          { nome: "a ", multiplicador: 2 },
        ],
        [],
      ),
    ).toContain("Encontros com nomes repetidos.");
    const funcoes = [
      { classeId: "c1", nome: "Tanque", rank: 6, padrao: true },
      { classeId: "c1", nome: "tanque", rank: 2, padrao: true },
    ];
    const p = pendenciasVersao([{ nome: "A", multiplicador: 1 }], funcoes);
    expect(p).toContain("Ranks inteiros de 1 a 5.");
    expect(p).toContain("Uma classe não pode ter duas funções com o mesmo nome.");
    expect(p).toContain("Só uma função padrão por classe.");
  });

  it("o corpo da versão leva o multiplicador em centésimos e os nomes sem espaços", () => {
    expect(
      corpoVersao(
        [{ nome: " Chefe ", multiplicador: 1.5 }],
        [{ classeId: "c1", nome: " Tanque", rank: 5, padrao: true }],
      ),
    ).toEqual({
      encontros: [{ nome: "Chefe", multiplicadorCentesimos: 150 }],
      funcoes: [{ classeId: "c1", nome: "Tanque", rank: 5, padrao: true }],
    });
  });

  it("a prévia do editor usa B e α da v1: rank 5 completo vale 300 × multiplicador", () => {
    expect(pontosPrevia(5, 1)).toBe(300);
    expect(pontosPrevia(5, 1.5)).toBe(450);
    expect(pontosPrevia(null, 1)).toBeNull();
    expect(pontosPrevia(3, 0)).toBeNull();
  });
});
