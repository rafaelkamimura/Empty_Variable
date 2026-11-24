import { TestBed } from "@angular/core/testing";
import { contraste, lerHex } from "../../utils/contraste";
import { TextoColoridoComponent, type TrechoColorido } from "./texto-colorido.component";

const CARTAO = "#140B36";

/** `rgb(r, g, b)` do estilo inline de volta para hex, para comparar com o que foi pedido. */
function hexDe(estilo: string): string {
  const [r = 0, g = 0, b = 0] = (estilo.match(/\d+/g) ?? []).map(Number);
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

describe("TextoColoridoComponent", () => {
  beforeAll(() => document.documentElement.style.setProperty("--cartao", CARTAO));
  afterAll(() => document.documentElement.style.removeProperty("--cartao"));

  function montar(trechos: readonly TrechoColorido[]) {
    const fixture = TestBed.createComponent(TextoColoridoComponent);
    fixture.componentRef.setInput("trechos", trechos);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    return { fixture, el, spans: Array.from(el.querySelectorAll("span")) };
  }

  it("um span por trecho, na ordem, com o texto inteiro legível de uma vez", () => {
    const { el, spans } = montar([
      { texto: "Tipo: " },
      { texto: "Carta", cor: "#FF0000" },
      { texto: " rara", cor: null },
    ]);
    expect(spans.length).toBe(3);
    expect(el.textContent).toBe("Tipo: Carta rara");
  });

  it("trecho sem cor não recebe estilo; cor legível entra como veio", () => {
    const { spans } = montar([{ texto: "a" }, { texto: "b", cor: "#FF0000" }]);
    expect(spans[0]!.style.color).toBe("");
    expect(hexDe(spans[1]!.style.color)).toBe("#FF0000");
  });

  it("cor escura do jogo é ajustada até 4,5:1 sobre o cartão", () => {
    const { spans } = montar([
      { texto: "azul", cor: "#0000FF" },
      { texto: "cinza", cor: "#777777" },
    ]);
    for (const span of spans) {
      const cor = hexDe(span.style.color);
      expect(contraste(lerHex(cor)!, lerHex(CARTAO)!)).toBeGreaterThanOrEqual(4.5);
    }
    expect(hexDe(spans[0]!.style.color)).not.toBe("#0000FF");
  });

  it("lista vazia mostra a linha em branco, sem spans", () => {
    const { el, spans } = montar([]);
    expect(spans.length).toBe(0);
    expect(el.textContent).toBe("");
  });

  it("trocar os trechos atualiza a linha", () => {
    const { fixture, el } = montar([{ texto: "antes" }]);
    fixture.componentRef.setInput("trechos", [{ texto: "depois", cor: "#00FF00" }]);
    fixture.detectChanges();
    expect(el.textContent).toBe("depois");
  });
});
