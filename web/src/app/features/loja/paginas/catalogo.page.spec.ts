import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { AuthService } from "../../../core/auth.service";
import type { UsuarioMe } from "../../../core/modelos";
import { SaldoService } from "../../../core/saldo.service";
import type { ItemCatalogoLoja, ItemVitrine } from "../data/loja.modelos";
import { CatalogoPage } from "./catalogo.page";

const esperar = () => new Promise((r) => setTimeout(r));

const catalogo: ItemCatalogoLoja[] = [
  { itemId: "i1", nome: "Alma de Betelgeuse", idJogo: null, tipo: "MATERIAL", quantidade: 4, preco: 100 },
  { itemId: "i2", nome: "Carta Naght Sieger", idJogo: null, tipo: "CARTA", quantidade: 1, preco: null },
];
const cotacao: ItemVitrine = {
  itemId: "i1",
  nome: "Alma de Betelgeuse",
  tipo: "MATERIAL",
  preco: 100,
  disponivel: 4,
  temConsignado: false,
  limitePorMembro: null,
  limitePeriodoDias: null,
  limiteRestante: null,
};

function montar(vinculado: boolean) {
  const usuario = signal({ jogador: vinculado ? { id: "j1" } : null } as unknown as UsuarioMe);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      { provide: AuthService, useValue: { usuario } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(CatalogoPage);
  f.autoDetectChanges();
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  return { f, http, el };
}

describe("CatalogoPage", () => {
  afterEach(() => document.querySelectorAll("app-catalogo-page").forEach((e) => e.remove()));

  it("carrega com skeleton, lista os cartões e filtra pela busca", async () => {
    const { http, el } = montar(false);
    expect(el.querySelector("ui-skeleton")).not.toBeNull();
    http.expectOne("/api/loja/catalogo").flush(catalogo);
    await esperar();
    const grade = el.querySelector("[data-testid=catalogo-loja]")!;
    expect(grade.querySelectorAll("[role=article]").length).toBe(2);
    expect(grade.textContent).toContain("100 pts");
    expect(grade.textContent).toContain("Preço a definir");

    const busca = el.querySelector<HTMLInputElement>("input[type=search]")!;
    expect(el.querySelector(`label[for="${busca.id}"]`)?.textContent).toBe("Buscar item");
    busca.value = "carta";
    busca.dispatchEvent(new Event("input"));
    await esperar();
    expect(grade.querySelectorAll("[role=article]").length).toBe(1);
    busca.value = "inexistente";
    busca.dispatchEvent(new Event("input"));
    await esperar();
    expect(grade.textContent).toContain("Nenhum item encontrado.");
  });

  it("erro ao carregar mostra o aviso e tenta de novo", async () => {
    const { http, el } = montar(false);
    http
      .expectOne("/api/loja/catalogo")
      .flush({ message: "Fora do ar" }, { status: 500, statusText: "Erro" });
    await esperar();
    const aviso = el.querySelector("ui-aviso[role=alert]")!;
    expect(aviso).not.toBeNull();
    aviso.querySelector<HTMLButtonElement>("button")!.click();
    http.expectOne("/api/loja/catalogo").flush(catalogo);
    await esperar();
    expect(el.querySelectorAll("[role=article]").length).toBe(2);
  });

  it("sem vínculo, o painel avisa e não consulta a vitrine", async () => {
    const { http, el } = montar(false);
    http.expectOne("/api/loja/catalogo").flush(catalogo);
    await esperar();
    el.querySelector<HTMLButtonElement>("[role=article] button")!.click();
    await esperar();
    const painel = el.querySelector("[role=dialog]")!;
    expect(painel.textContent).toContain("É necessário ter um personagem vinculado");
    http.expectNone("/api/loja");
  });

  it("com vínculo, consulta a vitrine, compra e atualiza saldo e catálogo", async () => {
    const { http, el } = montar(true);
    http.expectOne("/api/loja/catalogo").flush(catalogo);
    await esperar();
    el.querySelector<HTMLButtonElement>("[role=article] button")!.click();
    http.expectOne("/api/loja").flush({ saldo: 350, itens: [cotacao] });
    await esperar();
    expect(TestBed.inject(SaldoService).saldo()).toBe(350);
    const painel = el.querySelector("[role=dialog]")!;
    const qtd = painel.querySelector<HTMLInputElement>("input[type=number]")!;
    qtd.value = "3";
    qtd.dispatchEvent(new Event("input"));
    await esperar();
    expect(painel.textContent).toContain("Total: 300 pts");
    const confirmar = Array.from(painel.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Confirmar solicitação"),
    )!;
    confirmar.click();
    const req = http.expectOne((r) => r.method === "POST" && r.url === "/api/loja/compras");
    expect(req.request.body).toEqual({ itemId: "i1", quantidade: 3, precoEsperado: 100 });
    req.flush({});
    await esperar();
    http.expectOne("/api/saldo/me").flush({ saldo: 50 });
    http.expectOne("/api/loja/catalogo").flush(catalogo);
    await esperar();
    expect(painel.textContent).toContain("Solicitação registrada");
    expect(TestBed.inject(SaldoService).saldo()).toBe(50);
  });
});
