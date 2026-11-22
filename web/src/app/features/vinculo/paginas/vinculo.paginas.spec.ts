import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Acao } from "../../../core/acao";
import { AuthService } from "../../../core/auth.service";
import type { ClasseFicha, SituacaoVinculo, Solicitacao } from "../data/vinculo.modelos";
import { AprovacoesVinculoPage } from "./aprovacoes.page";
import { VinculoPage } from "./vinculo.page";

const esperar = () => new Promise((r) => setTimeout(r));
const CLASSES: ClasseFicha[] = [
  { id: "rg", nomeOficial: "Guardião Real", apelidoGrupo: "RG", grupo: "4" },
  { id: "dk", nomeOficial: "Cavaleiro Dracônico", apelidoGrupo: null, grupo: "4" },
];
const PEDIDO: Solicitacao = {
  id: "s1",
  status: "PENDENTE",
  motivo: null,
  apelidoProposto: "Novata",
  personagensNovos: ["Nova-RG"],
  fichas: [{ nome: "Nova-RG", classeId: "rg", nivelBase: 200, build: null, equipamentos: {} }],
  criadaEm: "2026-11-14T20:00:00.000Z",
  analisadaEm: null,
  usuario: { id: "u1", discordUsername: "ana", globalName: null },
  jogador: null,
  analisadaPor: null,
};
const VINCULADO: SituacaoVinculo = {
  jogador: {
    id: "j1",
    apelido: "Ana",
    personagens: [
      {
        id: "p-dk",
        nome: "Ana-DK",
        ativo: true,
        classeId: "dk",
        classe: { nomeOficial: "Cavaleiro Dracônico" },
        nivelBase: 250,
        build: "",
        equipamentos: {},
      },
    ],
  },
  solicitacao: null,
} as unknown as SituacaoVinculo;

function configurar() {
  const executar = jasmine.createSpy("executar").and.callFake(async (f: () => Promise<unknown>) => {
    await f();
    return true;
  });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      { provide: Acao, useValue: { executar, avisar: jasmine.createSpy("avisar") } },
    ],
  });
  return TestBed.inject(HttpTestingController);
}

const botao = (raiz: ParentNode, texto: string) =>
  Array.from(raiz.querySelectorAll("button")).find((b) => b.textContent?.trim() === texto)!;
const painel = () => document.querySelector<HTMLElement>("ui-painel-lateral [role='dialog']");

async function abrirVinculo(situacao: SituacaoVinculo) {
  const http = configurar();
  const f = TestBed.createComponent(VinculoPage);
  f.autoDetectChanges();
  document.body.appendChild(f.nativeElement as HTMLElement);
  http.expectOne("/api/vinculo").flush(situacao);
  http.expectOne("/api/vinculo/classes").flush(CLASSES);
  await esperar();
  return { http, el: f.nativeElement as HTMLElement };
}

function digitar(el: HTMLInputElement | HTMLTextAreaElement, valor: string, evento = "input") {
  el.value = valor;
  el.dispatchEvent(new Event(evento));
}

describe("VinculoPage", () => {
  afterEach(() => document.querySelectorAll("app-vinculo-page").forEach((e) => e.remove()));

  it("sem vínculo, avisa e a primeira ficha vira a solicitação", async () => {
    const { http, el } = await abrirVinculo({ jogador: null, solicitacao: null });
    expect(el.textContent).toContain("Falta o vínculo com o seu jogador");
    botao(el, "+ Adicionar personagem").click();
    await esperar();
    const p = painel()!;
    expect(p.getAttribute("aria-label")).toBe("Adicionar personagem");
    const salvar = botao(p, "Salvar personagem");
    expect(salvar.disabled).toBeTrue();
    const [nome, nivel] = [
      p.querySelector<HTMLInputElement>("input[maxlength='23']")!,
      p.querySelector<HTMLInputElement>("input[type='number']")!,
    ];
    expect(nome.labels?.[0]?.textContent).toBe("Nickname do personagem");
    digitar(nome, " Nova-RG ");
    const classe = p.querySelector<HTMLSelectElement>("select")!;
    classe.value = "rg";
    classe.dispatchEvent(new Event("change"));
    digitar(nivel, "251");
    await esperar();
    expect(p.textContent).toContain("Use um nível de 1 a 250.");
    expect(salvar.disabled).toBeTrue();
    digitar(nivel, "250");
    await esperar();
    salvar.click();
    const req = http.expectOne("/api/vinculo/solicitacoes");
    expect(req.request.body).toEqual({
      fichas: [
        { nome: "Nova-RG", classeId: "rg", nivelBase: 250, build: "", equipamentos: {}, atributos: {} },
      ],
    });
    req.flush(PEDIDO);
    await esperar();
    http.expectOne("/api/vinculo").flush({ jogador: null, solicitacao: PEDIDO });
    http.expectOne("/api/vinculo/classes").flush(CLASSES);
    await esperar();
    expect(painel()).toBeNull();
    expect(el.querySelector("[data-testid='pendente']")?.textContent).toContain("Solicitação em análise");
    expect(el.querySelector("[data-testid='pendente']")?.textContent).toContain("Guardião Real · Nível 200");
  });

  it("rejeitada mostra o motivo e libera nova solicitação", async () => {
    const { el } = await abrirVinculo({
      jogador: null,
      solicitacao: { ...PEDIDO, status: "REJEITADA", motivo: "Personagem errado" },
    });
    expect(el.querySelector("[data-testid='rejeitada']")?.textContent).toContain("Personagem errado");
    expect(botao(el, "+ Adicionar personagem")).toBeTruthy();
  });

  it("importa a build na ficha aberta e salva o personagem vinculado com os atributos (D55, D57)", async () => {
    const { http, el } = await abrirVinculo(VINCULADO);
    el.querySelector<HTMLButtonElement>("button[aria-label='Editar ficha de Ana-DK']")!.click();
    await esperar();
    http
      .expectOne("/equipamentos-latam.json")
      .flush({ slots: { arma: [{ id: 600020, nome: "Espada de Duas Mãos" }] } });
    await esperar();
    const p = painel()!;
    expect(p.getAttribute("aria-label")).toBe("Editar personagem");
    (
      Array.from(p.querySelectorAll("[role='tab']")).find((t) =>
        t.textContent?.includes("Build"),
      ) as HTMLElement
    ).click();
    await esperar();
    const link = p.querySelector<HTMLInputElement>("input[type='url']")!;
    digitar(link, " https://short.latam-tools.com.br/abc ");
    await esperar();
    botao(p, "Importar build").click();
    const req = http.expectOne("/api/vinculo/build-simulador");
    expect(req.request.body).toEqual({ link: "https://short.latam-tools.com.br/abc" });
    req.flush({
      classeId: null,
      classeNome: null,
      nivelBase: 250,
      equipamentos: { arma: { id: 600020, nome: null, refino: 12 } },
      atributos: { nivelClasse: 60 },
    });
    await esperar();
    expect(p.textContent).toContain("Build importada: nível 250, 1 equipamento.");
    expect(p.querySelector("[data-testid='atributos-build']")).not.toBeNull();
    expect(link.value).toBe("");
    expect(p.querySelector("a[href*='personagem=p-dk']")).not.toBeNull();

    botao(p, "Salvar personagem").click();
    const salvar = http.expectOne("/api/vinculo/personagens/p-dk");
    expect(salvar.request.method).toBe("PATCH");
    expect(salvar.request.body).toEqual(
      jasmine.objectContaining({
        equipamentos: { arma: { id: 600020, nome: "Espada de Duas Mãos", refino: 12 } },
        atributos: { nivelClasse: 60 },
      }),
    );
    salvar.flush({});
    await esperar();
    http.expectOne("/api/vinculo").flush(VINCULADO);
    http.expectOne("/api/vinculo/classes").flush(CLASSES);
  });

  it("o erro da API aparece na ficha, que continua aberta", async () => {
    const { http, el } = await abrirVinculo(VINCULADO);
    el.querySelector<HTMLButtonElement>("button[aria-label='Editar ficha de Ana-DK']")!.click();
    await esperar();
    http.expectOne("/equipamentos-latam.json").flush({ slots: {} });
    await esperar();
    botao(painel()!, "Salvar personagem").click();
    http
      .expectOne("/api/vinculo/personagens/p-dk")
      .flush({ message: "Este personagem já existe." }, { status: 409, statusText: "Conflict" });
    await esperar();
    expect(painel()?.textContent).toContain("Este personagem já existe.");
  });
});

describe("AprovacoesVinculoPage", () => {
  function abrir(usuarioId: string) {
    const http = configurar();
    spyOn(TestBed.inject(AuthService), "usuario").and.returnValue({ id: usuarioId } as never);
    const f = TestBed.createComponent(AprovacoesVinculoPage);
    f.autoDetectChanges();
    http.expectOne("/api/vinculo/solicitacoes?status=PENDENTE").flush([PEDIDO]);
    http.expectOne("/api/vinculo/classes").flush(CLASSES);
    return { http, el: f.nativeElement as HTMLElement };
  }

  it("lista os personagens e aprova", async () => {
    const { http, el } = abrir("admin");
    await esperar();
    expect(el.textContent).toContain("Nova-RG · Guardião Real · Nível 200");
    botao(el, "Aprovar vínculo").click();
    http.expectOne("/api/vinculo/solicitacoes/s1/aprovar").flush({});
    await esperar();
    http.expectOne("/api/auth/me").flush({ id: "admin" });
    await esperar();
    http.expectOne("/api/vinculo/solicitacoes?status=PENDENTE").flush([]);
    http.expectOne("/api/vinculo/classes").flush(CLASSES);
    await esperar();
    expect(el.textContent).toContain("Nenhuma solicitação pendente.");
  });

  it("quem pediu não aprova o próprio vínculo; rejeitar pede o motivo", async () => {
    const { http, el } = abrir("u1");
    await esperar();
    expect(el.textContent).toContain("Outro administrador precisa aprovar este vínculo.");
    expect(botao(el, "Aprovar vínculo")).toBeUndefined();
    botao(el, "Rejeitar").click();
    await esperar();
    botao(el, "Confirmar rejeição").click();
    await esperar();
    expect(el.textContent).toContain("pelo menos 3 letras");
    http.expectNone("/api/vinculo/solicitacoes/s1/rejeitar");
    digitar(el.querySelector("textarea")!, " Personagem errado ");
    await esperar();
    botao(el, "Confirmar rejeição").click();
    expect(http.expectOne("/api/vinculo/solicitacoes/s1/rejeitar").request.body).toEqual({
      motivo: "Personagem errado",
    });
  });
});
