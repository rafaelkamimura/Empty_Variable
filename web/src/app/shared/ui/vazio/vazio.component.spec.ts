import { TestBed } from "@angular/core/testing";
import { VazioComponent } from "./vazio.component";

describe("VazioComponent", () => {
  it("mostra a frase e esconde a marca decorativa de leitores de tela", () => {
    const fixture = TestBed.createComponent(VazioComponent);
    fixture.componentRef.setInput("mensagem", "Nada aqui.");
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector(".frase")?.textContent).toBe("Nada aqui.");
    expect(el.querySelector(".marca")?.getAttribute("aria-hidden")).toBe("true");
  });
});
