import { TestBed } from "@angular/core/testing";
import { CeuComponent } from "./ceu.component";

describe("CeuComponent", () => {
  it("é só decoração: escondido de leitores de tela e sem capturar cliques", () => {
    const f = TestBed.createComponent(CeuComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(getComputedStyle(el).pointerEvents).toBe("none");
    expect(el.textContent).toBe("");
  });
});
