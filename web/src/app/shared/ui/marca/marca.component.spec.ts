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

  it("variante animada: a imagem no tamanho pedido, com o quadro parado para movimento reduzido", () => {
    const fixture = TestBed.createComponent(MarcaComponent);
    fixture.componentRef.setInput("variante", "animada");
    fixture.componentRef.setInput("rotulo", "Empty Variable");
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const img = el.querySelector("img");
    expect(el.classList).toContain("animada");
    expect(el.textContent?.trim()).toBe("");
    expect(img?.getAttribute("src")).toBe("imagens/empty-variable-header.gif");
    expect(img?.getAttribute("alt")).toBe("");
    expect(img?.getAttribute("width")).toBe("72");
    expect(img?.getAttribute("height")).toBe("42");
    expect(el.querySelector("source")?.getAttribute("media")).toBe("(prefers-reduced-motion: reduce)");
    expect(el.querySelector("source")?.getAttribute("srcset")).toBe("imagens/empty-variable-header.png");
    expect(el.getAttribute("role")).toBe("img");

    fixture.componentRef.setInput("tamanho", "g");
    fixture.detectChanges();
    expect(img?.getAttribute("width")).toBe("144");
    expect(img?.getAttribute("height")).toBe("84");
  });
});
