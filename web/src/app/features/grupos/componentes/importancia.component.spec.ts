import { TestBed } from "@angular/core/testing";
import { ImportanciaComponent } from "./importancia.component";

describe("ImportanciaComponent", () => {
  function montar(valor: number | null, erro?: string) {
    const f = TestBed.createComponent(ImportanciaComponent);
    f.componentRef.setInput("valor", valor);
    f.componentRef.setInput("campo", "reservas.x.importancia");
    if (erro) f.componentRef.setInput("erro", erro);
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    f.detectChanges();
    return { f, el };
  }

  afterEach(() => document.querySelectorAll("app-importancia").forEach((e) => e.remove()));

  it("é um radiogroup nomeado pela legenda, com rádios 'N de 5' e alvos de 40×40 px", () => {
    const { el } = montar(3);
    const grupo = el.querySelector("fieldset")!;
    expect(grupo.getAttribute("role")).toBe("radiogroup");
    expect(document.getElementById(grupo.getAttribute("aria-labelledby")!)?.textContent).toBe("Importância");
    const radios = Array.from(el.querySelectorAll<HTMLInputElement>("input[type=radio]"));
    expect(radios.map((r) => r.getAttribute("aria-label"))).toEqual([
      "1 de 5",
      "2 de 5",
      "3 de 5",
      "4 de 5",
      "5 de 5",
    ]);
    expect(radios[2]!.checked).toBeTrue();
    for (const estrela of Array.from(el.querySelectorAll<HTMLElement>(".estrela"))) {
      const caixa = estrela.getBoundingClientRect();
      expect(caixa.width).toBeGreaterThanOrEqual(40);
      expect(caixa.height).toBeGreaterThanOrEqual(40);
    }
  });

  it("o erro fica no grupo, não nos rádios", () => {
    const { el } = montar(null, "Escolha a importância.");
    const grupo = el.querySelector("fieldset")!;
    expect(grupo.getAttribute("aria-invalid")).toBe("true");
    const erro = document.getElementById(grupo.getAttribute("aria-describedby")!)!;
    expect(erro.textContent).toBe("Escolha a importância.");
    for (const r of Array.from(el.querySelectorAll("input[type=radio]"))) {
      expect(r.hasAttribute("aria-invalid")).toBeFalse();
    }
  });

  it("escolher emite o valor", () => {
    const { f, el } = montar(null);
    const valores: number[] = [];
    f.componentInstance.mudar.subscribe((v) => valores.push(v));
    el.querySelectorAll<HTMLInputElement>("input[type=radio]")[4]!.click();
    expect(valores).toEqual([5]);
  });
});
