import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { MinhaAreaPage } from "./minha-area.page";

describe("MinhaAreaPage", () => {
  it("mostra saldo (T-22), personagens e os pontos base por rank do motor compartilhado", async () => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    const http = TestBed.inject(HttpTestingController);
    const f = TestBed.createComponent(MinhaAreaPage);
    f.autoDetectChanges();
    http.expectOne("/api/vinculo").flush({
      jogador: {
        id: "j1",
        apelido: "Ana",
        personagens: [
          { id: "p1", nome: "Ana-MTK", ativo: true },
          { id: "p2", nome: "Velha-RG", ativo: false },
        ],
      },
      solicitacao: null,
    });
    http
      .expectOne("/api/extrato/me")
      .flush({ jogador: { id: "j1", apelido: "Ana" }, saldo: 240, lancamentos: [] });
    await new Promise((r) => setTimeout(r));
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector("h1")?.textContent).toContain("Ana");
    expect(el.querySelector('[data-testid="saldo"]')?.textContent).toBe("240");
    expect(el.querySelector('[data-testid="carteira-personagens"]')?.textContent).toContain("Inativo");
    const pontos = Array.from(
      el.querySelectorAll('[data-testid="carteira-pontos-por-rank"] tbody td:last-child'),
    ).map((td) => td.textContent?.trim());
    expect(pontos).toEqual(["300", "250", "200", "150", "100"]);
  });
});
