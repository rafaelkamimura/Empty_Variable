import { provideHttpClient } from "@angular/common/http";
import {
  HttpTestingController,
  provideHttpClientTesting,
  type TestRequest,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter, Router } from "@angular/router";
import { Acao } from "../../../core/acao";
import { AuthService } from "../../../core/auth.service";
import { Confirmacao } from "../../../core/confirmacao";
import type { VersaoParametros } from "../../../shared/dominio/cadastros";
import type { FuncaoInstancia, Instancia } from "../../../shared/dominio/instancias";
import type { DetalheRun, RunResumo } from "../data/detalhe-run.modelos";
import type { RascunhoNag4eyes, ResumoRascunhoNag4eyes } from "../data/nag4eyes.modelos";
import { cat, classes, torre } from "../data/runs.modelos.spec";
import { AssistenteRunPage } from "./assistente-run.page";
import { RunDetalhePage } from "./run-detalhe.page";
import { RunsPage } from "./runs.page";

const esperar = () => new Promise((r) => setTimeout(r));
const botao = (raiz: ParentNode, texto: string) =>
  Array.from(raiz.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent?.trim() === texto,
  )!;

/** A Torre com funções, para poder receber run (CT-146). */
const torreComFuncoes: Instancia = {
  ...torre,
  vigente: { ...torre.vigente!, funcoes: [{} as FuncaoInstancia] },
};
const parametros: VersaoParametros = {
  id: "cfg-1",
  versao: 1,
  base: 100,
  alphaCentesimos: 50,
  sConcluidaCentesimos: 100,
  sFalhaCentesimos: 50,
  sAbortadaCentesimos: 0,
  pctEssencialBp: 2000,
  pctImportanteBp: 1000,
  pctComplementarBp: 500,
  tetoCredoresBp: 5000,
  vigenteDesde: "",
  criadaPorId: null,
};

const resumo = (id: string, extra: Partial<RunResumo> = {}): RunResumo => ({
  id,
  data: "2026-11-20T00:00:00.000Z",
  encontro: { nome: "Naght Sieger 25", codigo: "NAGHT_25" },
  versaoInstancia: { versao: 2, instancia: { id: "i-torre", nome: "Torre da Constelação" } },
  status: "CONCLUIDA",
  corrigeRunId: null,
  config: { versao: 1 },
  participantes: 2,
  pontosTotais: 500,
  ...extra,
});

function detalhe(extra: Partial<DetalheRun> = {}): DetalheRun {
  return {
    id: "run-1",
    data: "2026-11-20T00:00:00.000Z",
    encontro: { id: "e-naght", nome: "Naght Sieger 25", codigo: "NAGHT_25", multiplicadorCentesimos: 100 },
    versaoInstancia: { id: "v2", versao: 2, instancia: { id: "i-torre", nome: "Torre da Constelação" } },
    status: "CONCLUIDA",
    pontuacaoBetelgeuse: null,
    observacao: null,
    criadaEm: "2026-11-20T22:00:00.000Z",
    corrigeRunId: null,
    corrigidaPorRunId: null,
    config: { id: "cfg-1", versao: 1 },
    registradaPor: { id: "u-1", discordUsername: "gestor" },
    participacoes: [
      {
        id: "pa-1",
        personagem: { id: "p-ana", nome: "Ana-MTK" },
        jogador: { id: "j-ana", apelido: "Ana" },
        funcao: {
          id: "f-mtk",
          nome: "Padrão",
          classe: { id: "c-mtk", nomeOficial: "Mestre Celestial", apelidoGrupo: "MTK" },
        },
        fracaoCentesimos: 100,
        rank: 5,
        pesoCentesimos: 100,
        multiplicadorChefeCentesimos: 100,
        multiplicadorStatusCentesimos: 100,
        pontosGerados: 250,
        emprestimos: [],
      },
    ],
    drops: [{ id: "d-1", quantidade: 1, item: { id: "it-1", nome: "Fragmento" }, lancadoNoEstoque: false }],
    lancamentos: [
      {
        id: "l-1",
        valor: 250,
        tipo: "RUN",
        jogador: { id: "j-ana", apelido: "Ana" },
        estornaLancamentoId: null,
      },
    ],
    ...extra,
  } as DetalheRun;
}

const rascunhoNag4eyes: RascunhoNag4eyes = {
  id: "r-1",
  partyId: "42",
  data: "2026-11-20T00:00:00.000Z",
  status: "PENDENTE",
  recebidoEm: "2026-11-20T22:00:00.000Z",
  instancia: { id: "i-torre", nome: "Torre da Constelação" },
  instanciaOrigem: { nome: "Torre da Constelação", nomeIngles: null, slug: null },
  runId: null,
  participantes: [
    {
      id: "rp-0",
      ordem: 0,
      discordId: "100",
      personagemNome: "Ana-MTK",
      classeNome: null,
      pendencia: null,
      jogador: { id: "j-ana", apelido: "Ana" },
      personagem: { id: "p-ana", nome: "Ana-MTK" },
      classe: { id: "c-mtk", nomeOficial: "Mestre Celestial", apelidoGrupo: "MTK" },
    },
    {
      id: "rp-1",
      ordem: 1,
      discordId: "101",
      personagemNome: "Solto",
      classeNome: "Cardeal",
      pendencia: "SEM_VINCULO",
      jogador: null,
      personagem: null,
      classe: null,
    },
  ],
};

const resumoRascunho: ResumoRascunhoNag4eyes = {
  id: "r-1",
  partyId: null,
  data: "2026-11-20T00:00:00.000Z",
  status: "PENDENTE",
  recebidoEm: "2026-11-20T22:00:00.000Z",
  instancia: null,
  instanciaOrigem: null,
  participantes: 1,
  pendentes: 0,
};

function configurar(confirma = true) {
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
      { provide: Acao, useValue: { executar, avisar } },
      { provide: Confirmacao, useValue: { perguntar } },
      { provide: AuthService, useValue: { ehAdmin: () => true } },
    ],
  });
  return { http: TestBed.inject(HttpTestingController), perguntar, avisar };
}

const pedidoRuns = (http: HttpTestingController) => http.expectOne((r) => r.url === "/api/runs");

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

  it("filtrar: só a resposta do pedido mais recente vale", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(RunsPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/instancias").flush([]);
    http.expectOne((r) => r.url === "/api/rascunhos-run").flush([]);
    const primeiro = pedidoRuns(http);

    const status = Array.from(el.querySelectorAll<HTMLSelectElement>("form select")).at(-1)!;
    status.value = "ESTORNADA";
    status.dispatchEvent(new Event("change"));
    botao(el, "Filtrar").click();
    const segundo: TestRequest = pedidoRuns(http);
    expect(segundo.request.params.get("status")).toBe("ESTORNADA");

    segundo.flush([
      resumo("run-2", { status: "ESTORNADA", encontro: { nome: "Betelgeuse 50", codigo: null } }),
    ]);
    await esperar();
    primeiro.flush([resumo("run-1")]);
    await esperar();
    const lista = el.querySelector("[data-testid='runs-lista']")!.textContent!;
    expect(lista).toContain("Betelgeuse 50");
    expect(lista).not.toContain("Naght Sieger 25");
  });
});

describe("RunDetalhePage", () => {
  it("mostra a run e lança os drops no estoque uma vez", async () => {
    const { http, avisar } = configurar();
    const f = TestBed.createComponent(RunDetalhePage);
    f.componentRef.setInput("id", "run-1");
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/runs/run-1").flush(detalhe());
    await esperar();
    expect(el.querySelector("[data-testid='runs-participacoes']")?.textContent).toContain("Ana-MTK");
    expect(el.querySelector("[data-testid='runs-lancamentos']")?.textContent).toContain("250");

    const lancar = botao(el, "Lançar drops no estoque");
    lancar.click();
    lancar.click();
    http
      .expectOne("/api/runs/run-1/estoque")
      .flush({ lancados: [{ dropId: "d-1", item: "Fragmento", quantidade: 1 }], naoLancados: [] });
    await esperar();
    expect(avisar).toHaveBeenCalledWith("1 drop(s) lançado(s) no estoque.");
    http
      .expectOne("/api/runs/run-1")
      .flush(detalhe({ drops: [{ ...detalhe().drops[0]!, lancadoNoEstoque: true }] }));
    await esperar();
    expect(el.querySelector("[data-testid='runs-drops']")?.textContent).toContain("No estoque");
  });
});

describe("AssistenteRunPage", () => {
  afterEach(() => document.querySelectorAll("app-assistente-run-page").forEach((e) => e.remove()));

  function catalogos(http: HttpTestingController) {
    http.expectOne("/api/jogadores").flush(cat.jogadores);
    http.expectOne("/api/instancias").flush([torreComFuncoes]);
    http.expectOne("/api/itens").flush([]);
    http.expectOne("/api/config-pontuacao").flush([parametros]);
  }

  it("a partir do rascunho do nag4eyes: pré-preenche, mostra a prévia e confirma o rascunho", async () => {
    const { http, avisar } = configurar();
    const navegar = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    const f = TestBed.createComponent(AssistenteRunPage);
    f.componentRef.setInput("rascunho", "r-1");
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    catalogos(http);
    await esperar();
    http.expectOne("/api/rascunhos-run/r-1").flush(rascunhoNag4eyes);
    await esperar();
    http.expectOne((r) => r.url === "/api/classes").flush(classes);
    await esperar();

    const origem = el.querySelector("[data-testid='runs-origem-rascunho']")!;
    expect(origem.textContent).toContain("grupo 42");
    expect(origem.textContent).toContain("Usuário sem vínculo com um jogador");
    expect(el.querySelector("[data-testid='runs-ganho-por-jogador']")?.textContent).toContain("Ana");

    botao(el, "Registrar run").click();
    const req = http.expectOne("/api/rascunhos-run/r-1/confirmar");
    expect(req.request.body.participantes.length).toBe(1);
    req.flush({ runId: "run-9", avisosReducao: [] });
    await esperar();
    expect(avisar).toHaveBeenCalledWith("Run registrada.");
    expect(navegar).toHaveBeenCalledWith(["/gestao/runs", "run-9"]);
  });

  it("trocar de instância: só as classes do pedido mais recente valem", async () => {
    const { http } = configurar();
    const a: Instancia = { ...torreComFuncoes, id: "i-a", codigo: "A", nome: "Instância A" };
    const b: Instancia = { ...torreComFuncoes, id: "i-b", codigo: "B", nome: "Instância B" };
    const f = TestBed.createComponent(AssistenteRunPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/jogadores").flush(cat.jogadores);
    http.expectOne("/api/instancias").flush([torreComFuncoes, a, b]);
    http.expectOne("/api/itens").flush([]);
    http.expectOne("/api/config-pontuacao").flush([parametros]);
    await esperar();
    http.expectOne((r) => r.url === "/api/classes").flush(classes);
    await esperar();

    const instancia = el.querySelector<HTMLSelectElement>("app-passo-dados select")!;
    const escolher = (id: string) => {
      instancia.value = id;
      instancia.dispatchEvent(new Event("change"));
    };
    escolher("i-a");
    escolher("i-b");
    const pedidoA = http.expectOne((r) => r.url === "/api/classes" && r.params.get("instanciaId") === "i-a");
    const pedidoB = http.expectOne((r) => r.url === "/api/classes" && r.params.get("instanciaId") === "i-b");
    pedidoB.flush([{ ...classes[0]!, id: "c-b", apelidoGrupo: "Classe de B" }]);
    await esperar();
    pedidoA.flush([{ ...classes[0]!, id: "c-a", apelidoGrupo: "Classe de A" }]);
    await esperar();

    const opcoes = el.querySelector("app-passo-participantes")!.textContent!;
    expect(opcoes).toContain("Classe de B");
    expect(opcoes).not.toContain("Classe de A");
  });

  it("erro ao carregar as classes: mostra o erro, deixa as classes vazias e tenta de novo", async () => {
    const { http } = configurar();
    const b: Instancia = { ...torreComFuncoes, id: "i-b", codigo: "B", nome: "Instância B" };
    const f = TestBed.createComponent(AssistenteRunPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    http.expectOne("/api/jogadores").flush(cat.jogadores);
    http.expectOne("/api/instancias").flush([torreComFuncoes, b]);
    http.expectOne("/api/itens").flush([]);
    http.expectOne("/api/config-pontuacao").flush([parametros]);
    await esperar();
    http.expectOne((r) => r.url === "/api/classes").flush(classes);
    await esperar();

    const instancia = el.querySelector<HTMLSelectElement>("app-passo-dados select")!;
    instancia.value = "i-b";
    instancia.dispatchEvent(new Event("change"));
    http
      .expectOne((r) => r.url === "/api/classes")
      .flush({ mensagem: "falhou" }, { status: 500, statusText: "Erro" });
    await esperar();
    const erro = el.querySelector("[data-testid='runs-erro-classes']")!;
    expect(erro).not.toBeNull();
    const opcoesClasse = () =>
      Array.from(el.querySelectorAll("app-passo-participantes select")[1]!.querySelectorAll("option")).map(
        (o) => o.textContent!.trim(),
      );
    expect(opcoesClasse()).toEqual(["Escolha"]);

    botao(erro, "Tentar novamente").click();
    http.expectOne((r) => r.url === "/api/classes" && r.params.get("instanciaId") === "i-b").flush(classes);
    await esperar();
    expect(el.querySelector("[data-testid='runs-erro-classes']")).toBeNull();
    expect(opcoesClasse()).toContain("MTK");
  });

  it("correção: trava a instância e exige o motivo antes de avançar", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(AssistenteRunPage);
    f.componentRef.setInput("id", "run-1");
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    catalogos(http);
    await esperar();
    http.expectOne("/api/runs/run-1").flush(detalhe());
    await esperar();
    http.expectOne((r) => r.url === "/api/classes").flush(classes);
    await esperar();

    expect(el.querySelector("h1")?.textContent).toContain("Corrigir run");
    const instancia = Array.from(el.querySelectorAll<HTMLSelectElement>("app-passo-dados select"))[0]!;
    expect(instancia.disabled).toBeTrue();
    const proximo = el.querySelector<HTMLButtonElement>("app-passo-dados ~ .acoes button")!;
    expect(proximo.disabled).toBeTrue();
    expect(el.textContent).toContain("Informe o motivo da correção.");

    const motivo = Array.from(el.querySelectorAll<HTMLInputElement>("app-passo-dados input")).at(-1)!;
    motivo.value = "Rank errado";
    motivo.dispatchEvent(new Event("input"));
    await esperar();
    expect(proximo.disabled).toBeFalse();

    botao(el, "Registrar correção").click();
    const req = http.expectOne("/api/runs/run-1/corrigir");
    expect(req.request.body.motivo).toBe("Rank errado");
  });

  it("rascunho já confirmado mostra o erro em vez do formulário", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(AssistenteRunPage);
    f.componentRef.setInput("rascunho", "r-1");
    f.autoDetectChanges();
    catalogos(http);
    await esperar();
    http.expectOne("/api/rascunhos-run/r-1").flush({ ...rascunhoNag4eyes, status: "CONFIRMADO" });
    await esperar();
    expect((f.nativeElement as HTMLElement).textContent).toContain(
      "Este rascunho já foi confirmado ou descartado.",
    );
    expect((f.nativeElement as HTMLElement).querySelector("mat-stepper")).toBeNull();
  });
});
