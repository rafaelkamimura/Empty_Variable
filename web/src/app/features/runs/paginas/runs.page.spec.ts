import { TestBed } from "@angular/core/testing";
import type { TestRequest } from "@angular/common/http/testing";
import { RunsPage } from "./runs.page";
import {
  botao,
  configurar,
  esperar,
  pedidoRuns,
  resumo,
  resumoRascunho,
  torreComFuncoes,
} from "./runs-teste.spec";

describe("RunsPage", () => {
  it("descartar um rascunho pede confirmação e recarrega a lista de rascunhos", async () => {
    const { http, perguntar } = configurar();
    const f = TestBed.createComponent(RunsPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/instancias").flush([torreComFuncoes]);
    pedidoRuns(http).flush([resumo("run-1")]);
    http
      .expectOne((r) => r.url === "/api/rascunhos-run")
      .flush([
        { ...resumoRascunho, partyId: "42", instancia: { id: "i-torre", nome: "Torre" }, participantes: 5 },
      ]);
    await esperar();
    expect(el.querySelector("[data-testid='runs-lista']")?.textContent).toContain("Torre da Constelação");
    const rascunhos = el.querySelector("[data-testid='runs-rascunhos']")!;

    botao(rascunhos, "Descartar").click();
    await esperar();
    expect(perguntar).toHaveBeenCalledWith(
      jasmine.objectContaining({ confirmar: "Descartar rascunho", perigo: true }),
    );
    http.expectOne("/api/rascunhos-run/r-1/descartar").flush({});
    await esperar();
    http.expectOne((r) => r.url === "/api/rascunhos-run").flush([]);
    await esperar();
    expect(el.querySelector("[data-testid='runs-rascunhos']")).toBeNull();
  });

  it("sem confirmação, não descarta", async () => {
    const { http } = configurar(false);
    const f = TestBed.createComponent(RunsPage);
    f.autoDetectChanges();
    http.expectOne("/api/instancias").flush([]);
    pedidoRuns(http).flush([]);
    http.expectOne((r) => r.url === "/api/rascunhos-run").flush([resumoRascunho]);
    await esperar();
    botao(f.nativeElement as HTMLElement, "Descartar").click();
    await esperar();
    http.expectNone("/api/rascunhos-run/r-1/descartar");
  });

  it("filtrar: só a resposta do pedido mais recente vale", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(RunsPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/instancias").flush([]);
    http.expectOne((r) => r.url === "/api/rascunhos-run").flush([]);
    const primeiro = pedidoRuns(http);

    const status = Array.from(el.querySelectorAll<HTMLSelectElement>("form select")).at(-1)!;
    status.value = "ESTORNADA";
    status.dispatchEvent(new Event("change"));
    botao(el, "Filtrar").click();
    const segundo: TestRequest = pedidoRuns(http);
    expect(segundo.request.params.get("status")).toBe("ESTORNADA");

    segundo.flush([
      resumo("run-2", { status: "ESTORNADA", encontro: { nome: "Betelgeuse 50", codigo: null } }),
    ]);
    await esperar();
    primeiro.flush([resumo("run-1")]);
    await esperar();
    const lista = el.querySelector("[data-testid='runs-lista']")!.textContent!;
    expect(lista).toContain("Betelgeuse 50");
    expect(lista).not.toContain("Naght Sieger 25");
  });
});
