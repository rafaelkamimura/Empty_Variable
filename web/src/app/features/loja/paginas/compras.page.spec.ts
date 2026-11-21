import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Confirmacao } from "../../../core/confirmacao";
import type { Compra } from "../data/loja.modelos";
import { ComprasPage } from "./compras.page";

const esperar = () => new Promise((r) => setTimeout(r));

const compra = (p: Partial<Compra>): Compra =>
  ({
    id: "c1",
    quantidade: 2,
    precoUnitario: 150,
    total: 300,
    status: "PENDENTE_ENTREGA",
    criadaEm: "2026-11-20T10:00:00.000Z",
    motivoCancelamento: null,
    item: { id: "i1", nome: "Alma de Betelgeuse" },
    ...p,
  }) as Compra;

describe("ComprasPage", () => {
  function montar(resposta: boolean) {
    const perguntar = jasmine.createSpy("perguntar").and.resolveTo(resposta);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
        { provide: Confirmacao, useValue: { perguntar } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(ComprasPage);
    f.autoDetectChanges();
    return { http, perguntar, el: f.nativeElement as HTMLElement };
  }

  it("vazio mostra a marca e o caminho para a loja", async () => {
    const { http, el } = montar(true);
    http.expectOne("/api/loja/compras").flush([]);
    await esperar();
    expect(el.querySelector("ui-vazio")?.textContent).toContain("Você ainda não comprou nada.");
    expect(el.querySelector("ui-vazio a")?.textContent).toContain("Ir à loja");
  });

  it("lista com o selo da situação; cancelar pede confirmação com o efeito e só então envia", async () => {
    const { http, el, perguntar } = montar(true);
    http
      .expectOne("/api/loja/compras")
      .flush([compra({}), compra({ id: "c2", status: "CANCELADA", motivoCancelamento: "Pedido do membro" })]);
    await esperar();
    const tabela = el.querySelector("[data-testid=minhas-compras]")!;
    expect(tabela.querySelectorAll("tbody tr").length).toBe(2);
    expect(tabela.textContent).toContain("Aguardando entrega");
    expect(tabela.textContent).toContain("Pedido do membro");
    const botoes = tabela.querySelectorAll("tbody button");
    expect(botoes.length).toBe(1);
    (botoes[0] as HTMLButtonElement).click();
    await esperar();
    expect(perguntar).toHaveBeenCalledWith(
      jasmine.objectContaining({ confirmar: "Cancelar compra", perigo: true }),
    );
    expect(perguntar.calls.mostRecent().args[0].descricao).toContain("300 pts");
    http.expectOne((r) => r.method === "POST" && r.url === "/api/loja/compras/c1/cancelar").flush({});
    await esperar();
    http.expectOne("/api/loja/compras").flush([compra({ status: "CANCELADA" })]);
    http.expectOne("/api/saldo/me").flush({ saldo: 300 });
  });

  it("desistir da confirmação não envia nada", async () => {
    const { http, el } = montar(false);
    http.expectOne("/api/loja/compras").flush([compra({})]);
    await esperar();
    el.querySelector<HTMLButtonElement>("tbody button")!.click();
    await esperar();
    http.expectNone((r) => r.method === "POST");
    expect(el.querySelector("tbody button")?.textContent).toContain("Cancelar");
  });

  it("cancelamento que falha recarrega a lista (a compra pode ter sido entregue)", async () => {
    const { http, el } = montar(true);
    http.expectOne("/api/loja/compras").flush([compra({})]);
    await esperar();
    el.querySelector<HTMLButtonElement>("tbody button")!.click();
    await esperar();
    http
      .expectOne((r) => r.method === "POST" && r.url === "/api/loja/compras/c1/cancelar")
      .flush({ message: "A compra já foi entregue." }, { status: 409, statusText: "Conflito" });
    await esperar();
    http.expectOne("/api/loja/compras").flush([compra({ status: "ENTREGUE" })]);
    http.expectNone("/api/saldo/me");
    await esperar();
    expect(el.querySelector("tbody button")).toBeNull();
    expect(el.textContent).toContain("Entregue");
  });
});
