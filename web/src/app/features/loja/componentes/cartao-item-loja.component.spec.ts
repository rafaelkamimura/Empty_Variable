import { TestBed } from "@angular/core/testing";
import { CartaoItemLojaComponent } from "./cartao-item-loja.component";

describe("CartaoItemLojaComponent", () => {
  it("mostra tipo, nome, preço em pt-BR e estoque; o botão do nome abre a compra", () => {
    const f = TestBed.createComponent(CartaoItemLojaComponent);
    f.componentRef.setInput("item", {
      itemId: "i1",
      nome: "Fragmento de Meteorito",
      idJogo: null,
      tipo: "MATERIAL",
      quantidade: 12,
      preco: 1250,
    });
    let abriu = 0;
    f.componentInstance.abrir.subscribe(() => abriu++);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector("[role=article]")).not.toBeNull();
    expect(el.textContent).toContain("Material");
    expect(el.textContent).toContain("1.250 pts");
    expect(el.textContent).toContain("12 em estoque");
    const botao = el.querySelector<HTMLButtonElement>("h2 button")!;
    expect(botao.textContent?.trim()).toBe("Fragmento de Meteorito");
    botao.click();
    expect(abriu).toBe(1);
  });
});
