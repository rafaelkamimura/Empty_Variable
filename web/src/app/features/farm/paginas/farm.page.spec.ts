import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import type { EstadoFarm } from "../data/farm.modelos";
import { FarmPage } from "./farm.page";

const esperar = () => new Promise((r) => setTimeout(r));
const estado = (x: Partial<EstadoFarm> = {}): EstadoFarm => ({
  vinculado: true,
  personagens: [{ id: "p1", nome: "Lyra", classe: null }],
  instancias: [
    { id: "i1", nome: "Cripta", recarga: "DIARIA", instanciaId: null, personagemIds: ["p1"], drops: ["a"] },
  ],
  itens: [{ id: "a", nome: "Oridecon", idJogo: null, precoZeny: 1_500_000 }],
  checkinsRecentes: [],
  divinePride: false,
  ...x,
});

function montar(confirma = true) {
  const executar = jasmine.createSpy("executar").and.callFake(async (f: () => Promise<unknown>) => {
    await f();
    return true;
  });
  const perguntar = jasmine.createSpy("perguntar").and.resolveTo(confirma);
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      { provide: Acao, useValue: { executar, avisar: jasmine.createSpy("avisar") } },
      { provide: Confirmacao, useValue: { perguntar } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(FarmPage);
  f.autoDetectChanges();
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  return { http, el, f, perguntar };
}

const botao = (raiz: Element, texto: string) =>
  Array.from(raiz.querySelectorAll("button")).find((b) => b.textContent?.trim() === texto)!;

/** O chip leva a contagem junto ("Lyra 0/1"). */
const chip = (el: Element, nome: string) =>
  Array.from(el.querySelectorAll("[data-testid='personagens-farm'] button")).find((b) =>
    b.textContent?.trim().startsWith(nome),
  ) as HTMLButtonElement;

describe("FarmPage", () => {
  afterEach(() => document.querySelectorAll("app-farm-page").forEach((e) => e.remove()));

  it("sem vínculo, avisa com o link para pedir", async () => {
    const { http, el } = montar();
    http.expectOne("/api/farm/estado").flush(estado({ vinculado: false }));
    await esperar();
    await esperar();
    expect(el.textContent).toContain("Falta o vínculo");
    expect(el.querySelector("a[href='/vinculo']")).not.toBeNull();
  });

  it("sem instâncias, 'Ir para o cadastro' troca de aba", async () => {
    const { http, el } = montar();
    http.expectOne("/api/farm/estado").flush(estado({ instancias: [] }));
    await esperar();
    await esperar();
    botao(el, "Ir para o cadastro").click();
    await esperar();
    expect(el.querySelector("[role='tab'][aria-selected='true']")?.textContent).toContain("Cadastro");
    http.match(() => true).forEach((r) => r.flush([]));
  });

  it("faz o check-in com os drops do editor", async () => {
    const { http, el } = montar();
    http.expectOne("/api/farm/estado").flush(estado());
    await esperar();
    await esperar();
    chip(el, "Lyra").click();
    await esperar();
    const cartao = el.querySelector("[data-testid='inst-Cripta']")!;
    botao(cartao, "Check-in").click();
    await esperar();
    cartao.querySelector<HTMLButtonElement>("[aria-label='Mais Oridecon']")!.click();
    await esperar();
    botao(cartao, "Confirmar check-in").click();
    const req = http.expectOne("/api/farm/checkins");
    expect(req.request.body).toEqual({
      personagemId: "p1",
      farmInstanciaId: "i1",
      drops: [{ farmItemId: "a", quantidade: 1 }],
    });
    req.flush({});
    await esperar();
    http.expectOne("/api/farm/estado").flush(estado());
    await esperar();
    await esperar();
    expect(el.textContent).not.toContain("Confirmar check-in");
  });

  it("desfazer pede confirmação; sem confirmar, não chama a API", async () => {
    const { http, el, perguntar } = montar(false);
    const feitoEm = new Date(Date.now() - 60_000).toISOString();
    http.expectOne("/api/farm/estado").flush(
      estado({
        checkinsRecentes: [
          {
            id: "c1",
            personagemId: "p1",
            farmInstanciaId: "i1",
            nomeInstancia: "Cripta",
            feitoEm,
            drops: [],
          },
        ],
      }),
    );
    await esperar();
    await esperar();
    chip(el, "Lyra").click();
    await esperar();
    botao(el, "Desfazer check-in").click();
    await esperar();
    expect(perguntar).toHaveBeenCalled();
    http.expectNone("/api/farm/checkins/c1");
  });
});
