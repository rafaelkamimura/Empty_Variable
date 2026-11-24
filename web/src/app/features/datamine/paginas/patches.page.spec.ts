import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import type { PatchResumido } from "../data/datamine.modelos";
import { PatchesPage } from "./patches.page";

const esperar = () => new Promise((r) => setTimeout(r));

const patch = (extra: Partial<PatchResumido> = {}): PatchResumido => ({
  id: "11111111-1111-4111-8111-111111111111",
  chave: "2026-11-24_live_client_2170_2171_1795480754.rgz",
  titulo: "Patch LATAM 2026-11-24",
  dataPatch: "2026-11-24",
  patches: ["1601 a.gpf", "1604 b.rgz"],
  resumo: {
    contagens: { itensNovos: 230, itensAlterados: 122, monstros: 24, mapas: 3, caixas: 31, grfNovos: 956 },
  },
  bytesHtml: 1_000,
  bytesJson: 2_000,
  publicadoEm: "2026-11-24T01:00:00.000Z",
  atualizadoEm: "2026-11-24T01:00:00.000Z",
  ...extra,
});

function montar() {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(PatchesPage);
  f.autoDetectChanges();
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  return { http, el };
}

describe("PatchesPage", () => {
  afterEach(() => document.querySelectorAll("app-patches-page").forEach((e) => e.remove()));

  it("mostra o esqueleto e depois a lista, com os indicadores do resumo e o link do patch", async () => {
    const { http, el } = montar();
    expect(el.querySelector("ui-skeleton")).not.toBeNull();
    http.expectOne("/api/datamine/patches").flush([patch()]);
    await esperar();

    const linha = el.querySelector("[data-testid=datamine-lista] tbody tr")!;
    expect(linha.textContent).toContain("Patch LATAM 2026-11-24");
    expect(linha.textContent).toContain("24/11/2026");
    expect(linha.querySelector("[data-testid=datamine-abrir]")?.getAttribute("href")).toBe(
      "/datamine/11111111-1111-4111-8111-111111111111",
    );
    const badges = Array.from(linha.querySelectorAll("ui-badge")).map((b) => b.textContent?.trim());
    expect(badges).toEqual([
      "230 itens novos",
      "122 itens alterados",
      "24 monstros e NPCs",
      "3 mapas",
      "31 caixas e ovos",
    ]);
    expect(linha.querySelector("td.numero")?.textContent?.trim()).toBe("2");
  });

  it("patch pequeno, sem itens, monstros, mapas nem caixas, mostra o que mudou em vez de parecer vazio", async () => {
    const { http, el } = montar();
    http.expectOne("/api/datamine/patches").flush([
      patch({
        id: "a",
        resumo: { contagens: { itensNovos: 0, monstros: 0, caixas: 0, tabelasLua: 3, grfAlterados: 5 } },
      }),
      patch({ id: "b", resumo: { contagens: { itensNovos: 0, tabelasLua: 0 } } }),
      patch({ id: "c", resumo: {} }),
    ]);
    await esperar();

    const linhas = Array.from(el.querySelectorAll("[data-testid=datamine-lista] tbody tr"));
    const oQueMudou = (tr: Element) =>
      tr.querySelector(".indicadores")?.textContent?.replace(/\s+/g, " ").trim();
    expect(Array.from(linhas[0]!.querySelectorAll("ui-badge")).map((b) => b.textContent?.trim())).toEqual([
      "5 alterados no GRF",
      "3 tabelas Lua",
    ]);
    expect(oQueMudou(linhas[1]!)).toBe("Nenhuma mudança contada");
    expect(oQueMudou(linhas[2]!)).toBe("Sem resumo");
  });

  it("sem patches, mostra o estado vazio", async () => {
    const { http, el } = montar();
    http.expectOne("/api/datamine/patches").flush([]);
    await esperar();
    expect(el.querySelector("ui-vazio")?.textContent).toContain("Nenhum patch publicado ainda");
    expect(el.querySelector("[data-testid=datamine-lista]")).toBeNull();
  });

  it("com erro da API, mostra a mensagem e tenta de novo", async () => {
    const { http, el } = montar();
    http
      .expectOne("/api/datamine/patches")
      .flush({ message: "Banco fora do ar." }, { status: 500, statusText: "Erro" });
    await esperar();
    expect(el.querySelector("ui-aviso")?.textContent).toContain("Banco fora do ar.");

    (el.querySelector("ui-aviso button") as HTMLButtonElement | null)?.click();
    http.expectOne("/api/datamine/patches").flush([patch()]);
    await esperar();
    expect(el.querySelector("[data-testid=datamine-lista]")).not.toBeNull();
  });
});
