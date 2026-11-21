import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Confirmacao } from "../../../core/confirmacao";
import type { Oferta } from "../data/loja.modelos";
import { OfertasPage } from "./ofertas.page";

const esperar = () => new Promise((r) => setTimeout(r));

const oferta = (p: Partial<Oferta>): Oferta => ({
  id: "o1",
  quantidade: 2,
  status: "PENDENTE",
  motivo: null,
  criadaEm: "2026-11-14T20:00:00.000Z",
  analisadaEm: null,
  item: { id: "i1", nome: "Carta Naght Sieger", tipo: "CARTA" },
  jogador: { id: "j1", apelido: "Ana" },
  analisadaPor: null,
  lote: null,
  ...p,
});

describe("OfertasPage", () => {
  function montar() {
    const perguntar = jasmine.createSpy("perguntar").and.resolveTo(true);
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
    const f = TestBed.createComponent(OfertasPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    return { http, el, perguntar };
  }
  afterEach(() => document.querySelectorAll("app-ofertas-page").forEach((e) => e.remove()));

  const responder = (http: HttpTestingController, ofertas: Oferta[], itens: unknown[]) => {
    http.expectOne("/api/loja/ofertas").flush(ofertas);
    http.expectOne("/api/loja/ofertas/itens").flush(itens);
  };

  it("lista as ofertas com o motivo da rejeição; rejeitada não tem Retirar", async () => {
    const { http, el } = montar();
    responder(http, [oferta({ status: "REJEITADA", motivo: "Item não recebido" })], []);
    await esperar();
    const tabela = el.querySelector('[data-testid="minhas-ofertas"]')!;
    expect(tabela.textContent).toContain("Item não recebido");
    expect(tabela.textContent).toContain("Rejeitada");
    expect(tabela.querySelector("tbody button")).toBeNull();
  });

  it("envia uma nova oferta pelo painel e fecha", async () => {
    const { http, el } = montar();
    responder(http, [], [{ id: "i1", nome: "Carta Naght Sieger", tipo: "CARTA", precoVigente: 300 }]);
    await esperar();
    Array.from(el.querySelectorAll("button"))
      .find((b) => b.textContent?.includes("Nova oferta"))!
      .click();
    await esperar();
    const painel = el.querySelector("[role=dialog]")!;
    const select = painel.querySelector("select")!;
    expect(select.textContent).toContain("Carta Naght Sieger · 300 pts");
    select.value = "i1";
    select.dispatchEvent(new Event("change"));
    const qtd = painel.querySelector<HTMLInputElement>("input[type=number]")!;
    qtd.value = "2";
    qtd.dispatchEvent(new Event("input"));
    await esperar();
    painel.querySelector<HTMLButtonElement>("button[type=submit]")!.click();
    const req = http.expectOne((r) => r.method === "POST" && r.url === "/api/loja/ofertas");
    expect(req.request.body).toEqual({ itemId: "i1", quantidade: 2 });
    req.flush(oferta({}));
    await esperar();
    responder(http, [oferta({})], []);
    await esperar();
    expect(el.querySelector("[role=dialog]")).toBeNull();
  });

  it("retirar uma oferta à venda pede confirmação de perigo", async () => {
    const { http, el, perguntar } = montar();
    responder(http, [oferta({ status: "APROVADA" })], []);
    await esperar();
    el.querySelector<HTMLButtonElement>("tbody button")!.click();
    await esperar();
    expect(perguntar).toHaveBeenCalledWith(
      jasmine.objectContaining({ confirmar: "Retirar da loja", perigo: true }),
    );
    http.expectOne((r) => r.method === "POST" && r.url === "/api/loja/ofertas/o1/retirar").flush({});
    await esperar();
    responder(http, [oferta({ status: "RETIRADA_SOLICITADA" })], []);
  });
});
