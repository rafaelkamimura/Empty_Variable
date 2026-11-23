import { TestBed } from "@angular/core/testing";
import { RunDetalhePage } from "./run-detalhe.page";
import { botao, configurar, detalhe, esperar } from "./runs-teste.spec";

describe("RunDetalhePage", () => {
  it("mostra a run e lança os drops no estoque uma vez", async () => {
    const { http, avisar } = configurar();
    const f = TestBed.createComponent(RunDetalhePage);
    f.componentRef.setInput("id", "run-1");
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    // O cabeçalho aparece já no carregamento, com um título genérico.
    expect(el.querySelector("h1")?.textContent).toContain("Run");
    http.expectOne("/api/runs/run-1").flush(detalhe());
    await esperar();
    expect(el.querySelector("h1")?.textContent).toContain("Run de 20/11/2026");
    expect(el.querySelector("[data-testid='runs-participacoes']")?.textContent).toContain("Ana-MTK");
    expect(el.querySelector("[data-testid='runs-lancamentos']")?.textContent).toContain("+250 pts");
    expect(el.textContent).toContain("Soma: 250 pts");

    const lancar = botao(el, "Lançar drops no estoque");
    lancar.click();
    lancar.click();
    http
      .expectOne("/api/runs/run-1/estoque")
      .flush({ lancados: [{ dropId: "d-1", item: "Fragmento", quantidade: 1 }], naoLancados: [] });
    await esperar();
    expect(avisar).toHaveBeenCalledWith("1 drop(s) lançado(s) no estoque.");
    http
      .expectOne("/api/runs/run-1")
      .flush(detalhe({ drops: [{ ...detalhe().drops[0]!, lancadoNoEstoque: true }] }));
    await esperar();
    expect(el.querySelector("[data-testid='runs-drops']")?.textContent).toContain("No estoque");
  });
});
