import type { HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import type { Instancia } from "../../../shared/dominio/instancias";
import { cat, classes } from "../data/runs.modelos.spec";
import { AssistenteRunPage } from "./assistente-run.page";
import {
  botao,
  configurar,
  detalhe,
  esperar,
  irParaRevisao,
  parametros,
  passoAtual,
  rascunhoNag4eyes,
  torreComFuncoes,
} from "./runs-teste.spec";

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
    // A prévia só é criada quando a Revisão abre.
    expect(el.querySelector("app-previa-run")).toBeNull();

    await irParaRevisao(el);
    expect(el.querySelector("[data-testid='runs-ganho-por-jogador']")?.textContent).toContain("Ana");
    botao(el, "Registrar run").click();
    const req = http.expectOne("/api/rascunhos-run/r-1/confirmar");
    expect(req.request.body.participantes.length).toBe(1);
    req.flush({ runId: "run-9", avisosReducao: [] });
    await esperar();
    expect(avisar).toHaveBeenCalledWith("Run registrada.");
    expect(navegar).toHaveBeenCalledWith(["/gestao/runs", "run-9"]);
  });

  it("alteração não registrada: marca a tela como alterada e o beforeunload avisa; depois de registrar, não", async () => {
    const { http } = configurar();
    spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    const f = TestBed.createComponent(AssistenteRunPage);
    f.componentRef.setInput("rascunho", "r-1");
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    catalogos(http);
    await esperar();
    http.expectOne("/api/rascunhos-run/r-1").flush(rascunhoNag4eyes);
    await esperar();
    http.expectOne((r) => r.url === "/api/classes").flush(classes);
    await esperar();
    expect(f.componentInstance.alterado()).toBeFalse();

    const observacao = Array.from(el.querySelectorAll<HTMLInputElement>("app-passo-dados input")).find(
      (i) => i.maxLength === 500,
    )!;
    observacao.value = "Teste";
    observacao.dispatchEvent(new Event("input"));
    await esperar();
    expect(f.componentInstance.alterado()).toBeTrue();
    // O handler do host (window:beforeunload); disparar o evento de verdade recarregaria o Karma.
    const evento = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    (f.componentInstance as unknown as { avisarAntesDeSair(e: BeforeUnloadEvent): void }).avisarAntesDeSair(
      evento,
    );
    expect(evento.defaultPrevented).toBeTrue();

    await irParaRevisao(el);
    botao(el, "Registrar run").click();
    http.expectOne("/api/rascunhos-run/r-1/confirmar").flush({ runId: "run-9", avisosReducao: [] });
    await esperar();
    expect(f.componentInstance.alterado()).toBeFalse();
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
    const proximo = botao(el.querySelector("app-acoes-passo")!, "Próximo");
    proximo.click();
    await esperar();
    expect(passoAtual(el)).toBe("Dados da run");
    expect(el.textContent).toContain("Informe o motivo da correção.");

    const motivo = Array.from(el.querySelectorAll<HTMLInputElement>("app-passo-dados input")).at(-1)!;
    motivo.value = "Rank errado";
    motivo.dispatchEvent(new Event("input"));
    await esperar();
    proximo.click();
    await esperar();
    expect(passoAtual(el)).toBe("Participantes");

    await irParaRevisao(el);
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
