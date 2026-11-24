import { semAtalhos, textoPuroRo, tokenizarTextoRo } from "./texto-ro";

describe("texto-ro", () => {
  it("linha sem marcação vira um trecho na cor padrão", () => {
    expect(tokenizarTextoRo("Uma carta rara.")).toEqual([{ texto: "Uma carta rara.", cor: null }]);
    expect(tokenizarTextoRo("")).toEqual([]);
  });

  it("^RRGGBB troca a cor até o ^000000", () => {
    expect(tokenizarTextoRo("Tipo: ^777777Carta^000000 rara")).toEqual([
      { texto: "Tipo: ", cor: null },
      { texto: "Carta", cor: "#777777" },
      { texto: " rara", cor: null },
    ]);
  });

  it("cores seguidas, hex em minúsculas e cor que não fecha", () => {
    expect(tokenizarTextoRo("^ff0000A^0000ffB")).toEqual([
      { texto: "A", cor: "#FF0000" },
      { texto: "B", cor: "#0000FF" },
    ]);
  });

  it("une trechos vizinhos da mesma cor e ignora marcas sem texto", () => {
    expect(tokenizarTextoRo("^FF0000A^FF0000B^000000^000000C")).toEqual([
      { texto: "AB", cor: "#FF0000" },
      { texto: "C", cor: null },
    ]);
  });

  it("texto branco (invisível no cliente) vira espaço na cor padrão", () => {
    expect(tokenizarTextoRo("ATQ^FFFFFF_^000000+ 10")).toEqual([{ texto: "ATQ + 10", cor: null }]);
  });

  it("um ^ que não é cor fica como está", () => {
    expect(tokenizarTextoRo("2^3 e ^12 fim")).toEqual([{ texto: "2^3 e ^12 fim", cor: null }]);
  });

  it("NAVI mostra o rótulo com o mapa e a posição", () => {
    expect(semAtalhos("Fale com <NAVI>[Kafra]<INFO>prontera,150,180,0,100,0,0</INFO></NAVI>.")).toBe(
      "Fale com [Kafra] (prontera 150,180).",
    );
    expect(semAtalhos("<NAVI>Geffen<INFO>geffen</INFO></NAVI>")).toBe("Geffen");
    expect(semAtalhos("<NAVI>Sem destino<INFO></INFO></NAVI>")).toBe("Sem destino");
  });

  it("o branco antes de um atalho colorido (comum nas quests) não deixa resto", () => {
    expect(
      tokenizarTextoRo(
        "^ffffff<NAVI>^4D4DFF[Livro de Ilusões-002]^000000<INFO>prt_elib,59,61,0,100,0,0</INFO></NAVI>^000000",
      ),
    ).toEqual([
      { texto: "[Livro de Ilusões-002]", cor: "#4D4DFF" },
      { texto: " (prt_elib 59,61)", cor: null },
    ]);
  });

  it("TIPBOX fica só com o rótulo", () => {
    expect(semAtalhos("<TIPBOX>>Episódios<INFO>4101</INFO></TIPBOX>")).toBe(">Episódios");
  });

  it("ITEM e URL ficam só com o rótulo; etiqueta solta some", () => {
    expect(
      semAtalhos(
        "Use <ITEM>Poção Vermelha<INFO>501</INFO></ITEM> ou veja <URL>o site<INFO>https://x.y</INFO></URL>.",
      ),
    ).toBe("Use Poção Vermelha ou veja o site.");
    expect(semAtalhos("texto </NAVI> cortado <INFO>")).toBe("texto  cortado ");
  });

  it("cor dentro do atalho continua valendo", () => {
    expect(tokenizarTextoRo("<NAVI>^4D4DFF[Sábia]^000000<INFO>yuno,10,20</INFO></NAVI>")).toEqual([
      { texto: "[Sábia]", cor: "#4D4DFF" },
      { texto: " (yuno 10,20)", cor: null },
    ]);
  });

  it("textoPuroRo devolve a linha sem cores nem atalhos", () => {
    expect(textoPuroRo("^0000FFDEF^000000: 10 <ITEM>Elunium<INFO>985</INFO></ITEM>")).toBe("DEF: 10 Elunium");
  });
});
