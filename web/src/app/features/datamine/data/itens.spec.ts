import {
  descricaoMudou,
  descricaoNaoIdentificadaMudou,
  mostraNaoIdentificado,
  mudancasDeCampo,
  urlDoItemNaDivinePride,
} from "./itens";
import { RELATORIO_EXEMPLO } from "./relatorio.exemplo";
import { mapearRelatorio } from "./relatorio.mapear";

const relatorio = mapearRelatorio(RELATORIO_EXEMPLO);
const novo = (id: number) => relatorio.itensNovos.find((i) => i.id === id)!;

describe("itens", () => {
  it("mudancasDeCampo lista só os campos simples que mudaram, com antes e depois", () => {
    const [capelo, pocao] = relatorio.itensAlterados;
    expect(mudancasDeCampo(capelo!)).toEqual([]);
    expect(mudancasDeCampo(pocao!)).toEqual([
      { rotulo: "Nome", antes: "Poção Gelada", depois: "Poção Invernal" },
      { rotulo: "Nome não identificado", antes: "Poção Gelada", depois: "Poção Invernal" },
      { rotulo: "Slots", antes: "0", depois: "1" },
      { rotulo: "Traje", antes: "não", depois: "sim" },
    ]);
  });

  it("descricaoMudou e descricaoNaoIdentificadaMudou comparam o texto inteiro", () => {
    const [capelo, pocao] = relatorio.itensAlterados;
    expect([descricaoMudou(capelo!), descricaoNaoIdentificadaMudou(capelo!)]).toEqual([true, false]);
    expect([descricaoMudou(pocao!), descricaoNaoIdentificadaMudou(pocao!)]).toEqual([true, true]);
  });

  it("urlDoItemNaDivinePride monta o endereço do item e recusa ID que não é inteiro positivo", () => {
    expect(urlDoItemNaDivinePride(300500)).toBe("https://www.divine-pride.net/database/item/300500");
    expect(urlDoItemNaDivinePride(0)).toBeNull();
    expect(urlDoItemNaDivinePride(-3)).toBeNull();
    expect(urlDoItemNaDivinePride(1.5)).toBeNull();
    expect(urlDoItemNaDivinePride(Number.NaN)).toBeNull();
  });

  it("mostraNaoIdentificado: só quando o texto é outro e o nome não é genérico", () => {
    expect(mostraNaoIdentificado(novo(24816))).toBeTrue();
    expect(mostraNaoIdentificado(novo(450200))).toBeTrue();
    expect(mostraNaoIdentificado(novo(9178))).toBeFalse();
    expect(mostraNaoIdentificado(novo(31588))).toBeFalse();
  });
});
