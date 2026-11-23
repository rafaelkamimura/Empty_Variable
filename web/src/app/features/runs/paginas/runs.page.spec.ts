import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
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

  it("filtrar grava os filtros na URL, sem criar entrada no histórico", async () => {
    const { http } = configurar();
    const navegar = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    const f = TestBed.createComponent(RunsPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/instancias").flush([]);
    http.expectOne((r) => r.url === "/api/rascunhos-run").flush([]);
    pedidoRuns(http).flush([]);

    const status = Array.from(el.querySelectorAll<HTMLSelectElement>("form select")).at(-1)!;
    status.value = "ESTORNADA";
    status.dispatchEvent(new Event("change"));
    botao(el, "Filtrar").click();
    expect(navegar).toHaveBeenCalledWith(
      [],
      jasmine.objectContaining({
        queryParams: { dataDe: null, dataAte: null, instanciaId: null, status: "ESTORNADA" },
        replaceUrl: true,
      }),
    );
  });

  it("filtros da URL: carregam a lista, e só a resposta do pedido mais recente vale", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(RunsPage);
    f.componentRef.setInput("status", "CONCLUIDA");
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/instancias").flush([]);
    http.expectOne((r) => r.url === "/api/rascunhos-run").flush([]);
    const primeiro: TestRequest = pedidoRuns(http);
    expect(primeiro.request.params.get("status")).toBe("CONCLUIDA");

    // A URL mudou (ex.: voltar do detalhe com outro filtro).
    f.componentRef.setInput("status", "ESTORNADA");
    await esperar();
    const segundo: TestRequest = pedidoRuns(http);
    expect(segundo.request.params.get("status")).toBe("ESTORNADA");
    const select = Array.from(el.querySelectorAll<HTMLSelectElement>("form select")).at(-1)!;
    expect(select.value).toBe("ESTORNADA");

    segundo.flush([
      resumo("run-2", { status: "ESTORNADA", encontro: { nome: "Betelgeuse 50", codigo: null } }),
    ]);
    await esperar();
    primeiro.flush([resumo("run-1")]);
    await esperar();
    const lista = el.querySelector("[data-testid='runs-lista']")!.textContent!;
    expect(lista).toContain("Betelgeuse 50");
    expect(lista).not.toContain("Naght Sieger 25");
    // O link do detalhe leva o endereço da lista com o filtro, para o "Voltar à lista".
    const link = el.querySelector<HTMLAnchorElement>("[data-testid='runs-lista'] a")!;
    expect(link.getAttribute("href")).toBe("/gestao/runs/run-2");
  });
});
