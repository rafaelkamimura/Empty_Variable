import { TestBed } from "@angular/core/testing";
import { EditorDropsComponent } from "./editor-drops.component";

function montar(quantidades: Record<string, string> = {}) {
  const f = TestBed.createComponent(EditorDropsComponent);
  f.componentRef.setInput("itens", [{ id: "a", nome: "Oridecon", idJogo: null }]);
  f.componentRef.setInput("quantidades", quantidades);
  f.componentRef.setInput("prefixo", "q-");
  f.componentRef.setInput("buscar", () => Promise.resolve({ resultados: [], divinePride: false }));
  const definidos: { id: string; valor: string }[] = [];
  f.componentInstance.definir.subscribe((d) => definidos.push(d));
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement, definidos };
}

const porRotulo = (el: HTMLElement, rotulo: string) =>
  el.querySelector<HTMLButtonElement>(`[aria-label="${rotulo}"]`)!;

describe("EditorDropsComponent", () => {
  it("− e + mudam a quantidade sem passar de zero para baixo", () => {
    const { el, f, definidos } = montar({ a: "1" });
    porRotulo(el, "Mais Oridecon").click();
    porRotulo(el, "Menos Oridecon").click();
    f.componentRef.setInput("quantidades", {});
    f.detectChanges();
    porRotulo(el, "Menos Oridecon").click();
    expect(definidos).toEqual([
      { id: "a", valor: "2" },
      { id: "a", valor: "0" },
      { id: "a", valor: "0" },
    ]);
  });

  it("o campo tem rótulo e o botão muda com a edição", () => {
    const { el, f } = montar();
    expect(el.querySelector("label[for='q-a']")?.textContent?.trim()).toBe("Oridecon");
    expect(el.textContent).toContain("Confirmar check-in");
    f.componentRef.setInput("editando", true);
    f.detectChanges();
    expect(el.textContent).toContain("Salvar drops");
  });
});
