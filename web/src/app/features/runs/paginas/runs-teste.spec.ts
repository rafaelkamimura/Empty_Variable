// Dados e utilitários comuns aos specs das páginas das runs (sem testes próprios).
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Acao } from "../../../core/acao";
import { AuthService } from "../../../core/auth.service";
import { Confirmacao } from "../../../core/confirmacao";
import type { VersaoParametros } from "../../../shared/dominio/cadastros";
import type { FuncaoInstancia, Instancia } from "../../../shared/dominio/instancias";
import type { DetalheRun, RunResumo } from "../data/detalhe-run.modelos";
import type { RascunhoNag4eyes, ResumoRascunhoNag4eyes } from "../data/nag4eyes.modelos";
import { torre } from "../data/runs.modelos.spec";

export const esperar = () => new Promise((r) => setTimeout(r));
export const passoAtual = (raiz: ParentNode) =>
  raiz
    .querySelector("[role=tab][aria-selected=true], .mat-step-header[aria-selected=true]")
    ?.textContent?.trim()
    .replace(/^\d+\s*/, "");
export const botao = (raiz: ParentNode, texto: string) =>
  Array.from(raiz.querySelectorAll<HTMLButtonElement>("button")).find(
    (b) => b.textContent?.trim() === texto,
  )!;

/** A Torre com funções, para poder receber run (CT-146). */
export const torreComFuncoes: Instancia = {
  ...torre,
  vigente: { ...torre.vigente!, funcoes: [{} as FuncaoInstancia] },
};
export const parametros: VersaoParametros = {
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

export const resumo = (id: string, extra: Partial<RunResumo> = {}): RunResumo => ({
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

export function detalhe(extra: Partial<DetalheRun> = {}): DetalheRun {
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

export const rascunhoNag4eyes: RascunhoNag4eyes = {
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

export const resumoRascunho: ResumoRascunhoNag4eyes = {
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

export function configurar(confirma = true) {
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

export const pedidoRuns = (http: HttpTestingController) => http.expectOne((r) => r.url === "/api/runs");
