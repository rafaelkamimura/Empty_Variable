import { TestBed } from "@angular/core/testing";
import { MarcaComponent } from "./marca.component";

describe("MarcaComponent", () => {
  it("é decorativa por padrão e vira imagem nomeada com rótulo", () => {
    const fixture = TestBed.createComponent(MarcaComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toBe("{∅_}");
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.hasAttribute("role")).toBeFalse();

    fixture.componentRef.setInput("rotulo", "Empty Variable");
    fixture.componentRef.setInput("tamanho", "g");
    fixture.detectChanges();
    expect(el.getAttribute("role")).toBe("img");
    expect(el.getAttribute("aria-label")).toBe("Empty Variable");
    expect(el.hasAttribute("aria-hidden")).toBeFalse();
    expect(el.classList).toContain("tamanho-g");
  });
});
