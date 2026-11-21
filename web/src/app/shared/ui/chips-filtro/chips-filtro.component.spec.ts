import { TestBed } from "@angular/core/testing";
import { ChipsFiltroComponent } from "./chips-filtro.component";

describe("ChipsFiltroComponent", () => {
  const opcoes = [
    { valor: "a", rotulo: "A", contagem: 2 },
    { valor: "b", rotulo: "B" },
  ];

  function montar(multipla = false) {
    const fixture = TestBed.createComponent(ChipsFiltroComponent);
    fixture.componentRef.setInput("rotulo", "Filtro");
    fixture.componentRef.setInput("opcoes", opcoes);
    fixture.componentRef.setInput("multipla", multipla);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const chips = Array.from(el.querySelectorAll("button"));
    return { fixture, el, chips, c: fixture.componentInstance };
  }

  it("grupo rotulado, um botão por opção e contagem opcional", () => {
    const { el, chips } = montar();
    expect(el.getAttribute("role")).toBe("group");
    expect(el.getAttribute("aria-label")).toBe("Filtro");
    expect(chips.length).toBe(2);
    expect(chips[0]!.querySelector(".qtd")?.textContent).toBe("2");
    expect(chips[1]!.querySelector(".qtd")).toBeNull();
  });

  it("seleção única troca o valor e o aria-pressed", () => {
    const { fixture, chips, c } = montar();
    chips[1]!.click();
    fixture.detectChanges();
    expect(c.selecionado()).toBe("b");
    expect(chips[1]!.getAttribute("aria-pressed")).toBe("true");
    expect(chips[0]!.getAttribute("aria-pressed")).toBe("false");
  });

  it("seleção múltipla liga e desliga cada chip", () => {
    const { fixture, chips, c } = montar(true);
    chips[0]!.click();
    chips[1]!.click();
    chips[0]!.click();
    fixture.detectChanges();
    expect(c.selecionados()).toEqual(["b"]);
    expect(chips[1]!.getAttribute("aria-pressed")).toBe("true");
  });
});
