import { TestBed } from "@angular/core/testing";
import { ResumoComponent } from "./resumo.component";

describe("ResumoComponent", () => {
  it("mostra rótulo, valor e meta opcional; tom alerta marca o host", () => {
    const fixture = TestBed.createComponent(ResumoComponent);
    fixture.componentRef.setInput("rotulo", "Saldo");
    fixture.componentRef.setInput("valor", "1.250 pts");
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector(".indicador-rotulo")?.textContent).toBe("Saldo");
    expect(el.querySelector(".indicador-valor")?.textContent).toBe("1.250 pts");
    expect(el.querySelector(".meta")).toBeNull();
    fixture.componentRef.setInput("meta", "agora");
    fixture.componentRef.setInput("tom", "alerta");
    fixture.detectChanges();
    expect(el.querySelector(".meta")?.textContent).toBe("agora");
    expect(el.classList).toContain("alerta");
  });
});
