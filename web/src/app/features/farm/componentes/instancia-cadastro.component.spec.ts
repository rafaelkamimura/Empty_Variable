import { TestBed } from "@angular/core/testing";
import type { InstanciaFarm } from "../data/farm.modelos";
import { InstanciaCadastroComponent } from "./instancia-cadastro.component";

const esperar = () => new Promise((r) => setTimeout(r));
const INST: InstanciaFarm = {
  id: "i1",
  nome: "Cripta",
  recarga: "DIARIA",
  instanciaId: null,
  personagemIds: ["p1"],
  drops: [],
};

function montar(ok: boolean) {
  const salvar = jasmine.createSpy("salvar").and.resolveTo(ok);
  const f = TestBed.createComponent(InstanciaCadastroComponent);
  f.componentRef.setInput("instancia", INST);
  f.componentRef.setInput("personagens", [
    { id: "p1", nome: "Lyra", classe: null },
    { id: "p2", nome: "Bran", classe: null },
    { id: "p3", nome: "Kai", classe: null },
  ]);
  f.componentRef.setInput("drops", []);
  f.componentRef.setInput("aberta", true);
  f.componentRef.setInput("buscar", () => Promise.resolve({ resultados: [], divinePride: false }));
  f.componentRef.setInput("salvar", salvar);
  f.componentRef.setInput("salvarPreco", () => Promise.resolve(true));
  f.autoDetectChanges();
  const el = f.nativeElement as HTMLElement;
  const chip = (nome: string) =>
    Array.from(el.querySelectorAll<HTMLButtonElement>("ui-chips-filtro button")).find(
      (b) => b.textContent?.trim() === nome,
    )!;
  return { el, salvar, chip };
}

describe("InstanciaCadastroComponent", () => {
  it("'Quem faz' volta ao servidor quando a gravação falha, e o clique seguinte não grava o que falhou", async () => {
    const { salvar, chip } = montar(false);
    chip("Bran").click();
    await esperar();
    expect(salvar).toHaveBeenCalledWith({ personagemIds: ["p1", "p2"] });
    expect(chip("Bran").getAttribute("aria-pressed")).toBe("false");
    chip("Kai").click();
    await esperar();
    expect(salvar).toHaveBeenCalledWith({ personagemIds: ["p1", "p3"] });
  });

  it("'Recarga' volta ao valor do servidor quando a gravação falha", async () => {
    const { el, salvar } = montar(false);
    const select = el.querySelector<HTMLSelectElement>("ui-campo.recarga select")!;
    select.value = "MENSAL";
    select.dispatchEvent(new Event("change"));
    await esperar();
    expect(salvar).toHaveBeenCalledWith({ recarga: "MENSAL" });
    expect(select.value).toBe("DIARIA");
  });
});
