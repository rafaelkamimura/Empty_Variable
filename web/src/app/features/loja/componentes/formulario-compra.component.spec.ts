import { TestBed } from "@angular/core/testing";
import { FormularioCompraComponent } from "./formulario-compra.component";

describe("FormularioCompraComponent", () => {
  it("campo de quantidade vazio mostra total 0, não NaN, e desabilita a confirmação", () => {
    const f = TestBed.createComponent(FormularioCompraComponent);
    f.componentRef.setInput("item", {
      itemId: "i1",
      nome: "Alma",
      idJogo: null,
      tipo: "MATERIAL",
      quantidade: 4,
      preco: 100,
    });
    f.componentRef.setInput("vinculado", true);
    f.componentRef.setInput("saldo", 500);
    f.componentRef.setInput("cotacao", {
      itemId: "i1",
      nome: "Alma",
      tipo: "MATERIAL",
      preco: 100,
      disponivel: 4,
      temConsignado: false,
      limitePorMembro: null,
      limitePeriodoDias: null,
      limiteRestante: null,
    });
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const qtd = el.querySelector<HTMLInputElement>("input[type=number]")!;
    qtd.value = "";
    qtd.dispatchEvent(new Event("input"));
    f.detectChanges();
    expect(el.textContent).toContain("Total: 0 pts");
    expect(el.textContent).not.toContain("NaN");
    const confirmar = Array.from(el.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Confirmar"),
    )!;
    expect(confirmar.disabled).toBeTrue();
  });
});
