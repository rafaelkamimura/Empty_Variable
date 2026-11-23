import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import type { ItemCatalogo } from "../shared/dominio/cadastros";
import {
  descreverLote,
  type MovimentoEstoque,
  origemMovimento,
  type ResumoItemEstoque,
} from "../core/estoque";
import { AdminEstoqueComponent } from "./admin-estoque.component";

const esperar = () => new Promise((r) => setTimeout(r));

const item = (parcial: Partial<ItemCatalogo>): ItemCatalogo => ({
  id: "i1",
  nome: "Alma de Betelgeuse",
  idJogo: 1000397,
  tipo: "MATERIAL",
  negociavel: true,
  vinculadoConta: false,
  ativo: true,
  precoVigente: 500,
  motivoInelegivel: null,
  reservaMinima: 10,
  limitePorMembro: null,
  limitePeriodoDias: null,
  ...parcial,
});

describe("Estoque (M7)", () => {
  it("descreve lotes e a origem dos movimentos", () => {
    expect(descreverLote({ ordem: 3, origem: "DROP_RUN", dono: null })).toBe("#3 · Drop de run");
    expect(descreverLote({ ordem: 4, origem: "OFERTA", dono: { apelido: "Ana" } })).toBe(
      "#4 · Consignado (Ana)",
    );
    const base = { compraId: null, motivo: null, dropRun: null } as unknown as MovimentoEstoque;
    expect(
      origemMovimento({ ...base, dropRun: { run: { id: "r", data: "2026-11-10T00:00:00.000Z" } } }),
    ).toBe("Run de 10/11/2026");
    expect(origemMovimento({ ...base, motivo: "Doação" })).toBe("Doação");
  });

  it("tela mostra o disponível com a reserva, oferece só itens elegíveis e envia a entrada", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNoopAnimations(),
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(AdminEstoqueComponent);
    f.detectChanges();
    const resumo: ResumoItemEstoque[] = [
      {
        itemId: "i1",
        nome: "Alma de Betelgeuse",
        precoVigente: 500,
        motivoInelegivel: null,
        reservaMinima: 10,
        grupo: 12,
        consignado: 3,
        disponivel: 5,
      },
    ];
    http.expectOne("/api/estoque").flush(resumo);
    http.expectOne("/api/itens").flush([
      item({}),
      item({
        id: "i2",
        nome: "Pó de Meteorito",
        negociavel: null,
        motivoInelegivel: "Negociabilidade ainda não verificada no jogo.",
      }),
    ]);
    http.expectOne("/api/estoque/lotes").flush([]);
    http.expectOne("/api/estoque/origens").flush([]);
    await esperar();
    http.expectOne((r) => r.url === "/api/estoque/movimentos").flush([]);
    await esperar();
    f.detectChanges();

    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[data-testid="resumo-estoque"]')?.textContent).toContain("Alma de Betelgeuse");
    const c = f.componentInstance;
    expect(c.elegiveis().map((i) => i.nome)).toEqual(["Alma de Betelgeuse"]); // D20

    c.entrada = {
      origem: "DROP_SOLTO",
      precoPontos: 50,
      itemId: "i1",
      quantidade: 4,
      motivo: " Doação ",
    };
    const envio = c.darEntrada();
    const req = http.expectOne("/api/estoque/entradas");
    expect(req.request.body).toEqual({
      origem: "DROP_SOLTO",
      precoPontos: 50,
      itemId: "i1",
      quantidade: 4,
      motivo: "Doação",
    });
    req.flush({ loteId: "l1", item: "Alma de Betelgeuse", quantidade: 4 });
    await esperar();
    http.expectOne("/api/estoque").flush(resumo);
    http.expectOne("/api/itens").flush([item({})]);
    http.expectOne("/api/estoque/lotes").flush([]);
    http.expectOne("/api/estoque/origens").flush([]);
    await esperar();
    http.expectOne((r) => r.url === "/api/estoque/movimentos").flush([]);
    await envio;
  });
});
