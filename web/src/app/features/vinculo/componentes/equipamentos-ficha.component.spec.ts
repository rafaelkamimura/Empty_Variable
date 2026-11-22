import { TestBed } from "@angular/core/testing";
import { EquipamentosFichaComponent } from "./equipamentos-ficha.component";

describe("EquipamentosFichaComponent", () => {
  it("a busca recomeça vazia ao trocar de slot, e Enter nela não envia o formulário", () => {
    const f = TestBed.createComponent(EquipamentosFichaComponent);
    f.componentRef.setInput("equipamentos", {});
    f.componentRef.setInput("catalogo", {
      arma: [{ id: 1201, nome: "Adaga" }],
      topo: [{ id: 5011, nome: "Antena" }],
    });
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    const busca = () => el.querySelector<HTMLInputElement>("input[type='search']")!;
    const slot = (nome: string) =>
      Array.from(el.querySelectorAll<HTMLButtonElement>("[role='group'] button")).find(
        (b) => b.textContent?.trim() === nome,
      )!;

    slot("Arma").click();
    f.detectChanges();
    busca().value = "Adaga";
    busca().dispatchEvent(new Event("input"));
    const enter = new KeyboardEvent("keydown", { key: "Enter", cancelable: true });
    busca().dispatchEvent(enter);
    expect(enter.defaultPrevented).toBeTrue();

    slot("Topo").click();
    f.detectChanges();
    expect(busca().value).toBe("");
    expect(Array.from(el.querySelectorAll("option")).map((o) => o.textContent?.trim())).toContain("Antena");
  });
});
