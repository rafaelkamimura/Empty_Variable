import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { DatamineStore } from "./datamine.store";
import { RELATORIO_EXEMPLO } from "./relatorio.exemplo";

const esperar = () => new Promise((r) => setTimeout(r));
const URL_A = "/api/datamine/patches/a/dados";
const URL_B = "/api/datamine/patches/b/dados";

describe("DatamineStore", () => {
  let http: HttpTestingController;
  let store: DatamineStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    store = TestBed.inject(DatamineStore);
  });
  afterEach(() => http.verify());

  it("começa carregando e entrega o relatório já mapeado", async () => {
    expect(store.relatorio().estado).toBe("carregando");
    const pedido = store.carregarRelatorio("a");
    http.expectOne(URL_A).flush(RELATORIO_EXEMPLO);
    await pedido;
    const r = store.relatorio();
    expect(r.estado).toBe("pronto");
    if (r.estado === "pronto") {
      expect(r.dados.meta.titulo).toBe("Patch LATAM 2026-11-24");
      expect(r.dados.itensNovos.length).toBe(9);
    }
  });

  it("o mesmo patch não é pedido duas vezes; forçar pede de novo", async () => {
    const primeiro = store.carregarRelatorio("a");
    http.expectOne(URL_A).flush(RELATORIO_EXEMPLO);
    await primeiro;

    await store.carregarRelatorio("a");
    http.expectNone(URL_A);

    const forcado = store.carregarRelatorio("a", true);
    expect(store.relatorio().estado).toBe("carregando");
    http.expectOne(URL_A).flush({});
    await forcado;
    expect(store.relatorio().estado).toBe("pronto");
  });

  it("erro da API vira a mensagem, e a nova tentativa pede de novo", async () => {
    const pedido = store.carregarRelatorio("a");
    http
      .expectOne(URL_A)
      .flush({ message: "Relatório não encontrado." }, { status: 404, statusText: "Not Found" });
    await pedido;
    expect(store.relatorio()).toEqual({ estado: "erro", mensagem: "Relatório não encontrado." });

    const deNovo = store.carregarRelatorio("a");
    http.expectOne(URL_A).flush(RELATORIO_EXEMPLO);
    await deNovo;
    expect(store.relatorio().estado).toBe("pronto");
  });

  it("trocar de patch no meio descarta a resposta atrasada do anterior", async () => {
    const lento = store.carregarRelatorio("a");
    const rapido = store.carregarRelatorio("b");
    http.expectOne(URL_B).flush({ meta: { title: "Patch B" } });
    await rapido;
    http.expectOne(URL_A).flush(RELATORIO_EXEMPLO);
    await lento;
    await esperar();
    const r = store.relatorio();
    expect(r.estado === "pronto" ? r.dados.meta.titulo : "").toBe("Patch B");
  });
});
