// Abas Cadastro, Totais e Importar do Diário de farm, montadas com o FarmStore real e a API simulada.
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { type Type } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import type { EstadoFarm } from "../data/farm.modelos";
import { FarmStore } from "../data/farm.store";
import { CadastroAbaComponent } from "./cadastro.aba";
import { ImportarAbaComponent } from "./importar.aba";
import { TotaisAbaComponent } from "./totais.aba";

const esperar = () => new Promise((r) => setTimeout(r));
const feitoEm = new Date(Date.now() - 60_000).toISOString();
const ESTADO: EstadoFarm = {
  vinculado: true,
  personagens: [{ id: "p1", nome: "Lyra", classe: null }],
  instancias: [
    { id: "i1", nome: "Cripta", recarga: "DIARIA", instanciaId: null, personagemIds: ["p1"], drops: ["a"] },
  ],
  itens: [{ id: "a", nome: "Oridecon", idJogo: null, precoZeny: null }],
  checkinsRecentes: [],
  divinePride: false,
};

async function montar<T>(tipo: Type<T>, confirma = true) {
  const avisar = jasmine.createSpy("avisar");
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
      { provide: Acao, useValue: { avisar, executar } },
      { provide: Confirmacao, useValue: { perguntar } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const carga = TestBed.inject(FarmStore).carregar();
  http.expectOne("/api/farm/estado").flush(ESTADO);
  await carga;
  const f = TestBed.createComponent(tipo);
  f.autoDetectChanges();
  await esperar();
  return { http, el: f.nativeElement as HTMLElement, perguntar, avisar };
}

const botao = (raiz: Element, texto: string) =>
  Array.from(raiz.querySelectorAll("button")).find((b) => b.textContent?.trim() === texto)!;

describe("Abas do farm", () => {
  it("Cadastro: preço salva ao sair do campo; excluir instância sem confirmar não chama a API", async () => {
    const { http, el, perguntar } = await montar(CadastroAbaComponent, false);
    http.expectOne("/api/farm/catalogo-instancias").flush([]);
    await esperar();
    const preco = el.querySelector<HTMLInputElement>("app-tabela-itens input[inputmode='decimal']")!;
    expect(preco.labels?.[0]?.textContent).toBe("Preço de Oridecon");
    preco.value = "1,5kk";
    preco.dispatchEvent(new Event("change"));
    const req = http.expectOne("/api/farm/itens/a");
    expect(req.request.body).toEqual({ precoZeny: 1_500_000 });
    req.flush({});
    await esperar();
    http.expectOne("/api/farm/estado").flush(ESTADO);
    await esperar();

    botao(el, "Editar").click();
    await esperar();
    botao(el, "Excluir instância").click();
    await esperar();
    expect(perguntar).toHaveBeenCalled();
    http.expectNone("/api/farm/instancias/i1");
  });

  it("Totais: soma o período e remover pede confirmação", async () => {
    const { http, el, perguntar } = await montar(TotaisAbaComponent, true);
    const checkin = {
      id: "c1",
      personagemId: "p1",
      farmInstanciaId: "i1",
      nomeInstancia: "Cripta",
      feitoEm,
      drops: [{ farmItemId: "a", nome: "Oridecon", quantidade: 2 }],
    };
    http.expectOne((r) => r.url === "/api/farm/checkins").flush([checkin]);
    await esperar();
    expect(el.querySelector("[data-testid='total-itens'] strong")?.textContent?.trim()).toBe("2");
    botao(el, "Remover").click();
    await esperar();
    expect(perguntar).toHaveBeenCalled();
    http.expectOne("/api/farm/checkins/c1").flush(null);
    await esperar();
    http.expectOne("/api/farm/estado").flush(ESTADO);
    await esperar();
    http.match(() => true).forEach((r) => r.flush([]));
  });

  it("Importar: lê o backup, sugere o personagem e importa", async () => {
    const { http, el } = await montar(ImportarAbaComponent);
    const backup = {
      kind: "diario-instancias-backup",
      v: 1,
      exportadoEm: new Date().toISOString(),
      personagens: [{ id: "c1", nome: "Lyra", classe: "" }],
      instancias: [{ id: "n1", nome: "Torre", recarga: "SEMANAL", personagens: ["c1"], drops: [] }],
      itens: [],
      checkins: [
        {
          id: "k1",
          personagem: "c1",
          instancia: "n1",
          nomeInstancia: "Torre",
          feitoEm: Date.now() - 86_400_000,
          drops: [],
        },
      ],
    };
    const texto = el.querySelector("textarea")!;
    texto.value = JSON.stringify(backup);
    texto.dispatchEvent(new Event("input"));
    await esperar();
    botao(el, "Ler backup").click();
    await esperar();
    expect(el.querySelector("[data-testid='previa-importacao']")?.textContent).toContain("1 check-in(s)");
    expect(el.querySelector<HTMLSelectElement>("app-previa-importacao select")!.value).toBe("p1");
    botao(el, "Importar").click();
    const req = http.expectOne("/api/farm/importar");
    expect(req.request.body.personagens).toEqual({ c1: "p1" });
    req.flush({
      itensCriados: 0,
      instanciasCriadas: 1,
      checkinsImportados: 1,
      checkinsJaImportados: 0,
      checkinsSemPersonagem: 0,
    });
    await esperar();
    http.expectOne("/api/farm/estado").flush(ESTADO);
    await esperar();
    expect(el.querySelector("[data-testid='resultado-importacao']")?.textContent).toContain(
      "1 check-in(s) importado(s)",
    );
  });
});
