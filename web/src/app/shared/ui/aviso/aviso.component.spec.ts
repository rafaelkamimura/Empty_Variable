import { TestBed } from "@angular/core/testing";
import { AvisoComponent } from "./aviso.component";

describe("AvisoComponent", () => {
  it("papel ARIA e classe seguem o tom; o tom também vai em texto para leitores de tela", () => {
    const fixture = TestBed.createComponent(AvisoComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute("role")).toBe("status");
    expect(el.classList).toContain("tom-info");
    expect(el.querySelector(".sr-only")?.textContent).toContain("Informação");

    fixture.componentRef.setInput("tom", "erro");
    fixture.componentRef.setInput("titulo", "Falhou");
    fixture.detectChanges();
    expect(el.getAttribute("role")).toBe("alert");
    expect(el.classList).toContain("tom-erro");
    expect(el.classList).not.toContain("tom-info");
    expect(el.querySelector(".titulo")?.textContent).toBe("Falhou");
    expect(el.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
  });
});
