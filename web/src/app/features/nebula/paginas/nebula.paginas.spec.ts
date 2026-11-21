import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { SaldoService } from "../../../core/saldo.service";
import { solicitacao } from "../componentes/cartao-solicitacao.component.spec";
import { pod } from "../data/nebula.modelos.spec";
import { NebulaPage } from "./nebula.page";
import { SolicitacoesNebulaPage } from "./solicitacoes.page";

const esperar = () => new Promise((r) => setTimeout(r));
const botao = (raiz: Element, texto: string) =>
  Array.from(raiz.querySelectorAll("button")).find((b) => b.textContent?.trim() === texto)!;

function configurar(confirma = true) {
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
  return { http: TestBed.inject(HttpTestingController), perguntar };
}

describe("NebulaPage", () => {
  afterEach(() => document.querySelectorAll("app-nebula-page").forEach((e) => e.remove()));

  it("abre na modalidade possível, mostra as faltas e solicita trazendo a peça", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(NebulaPage);
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    http.expectOne("/api/nebula").flush({ saldo: 600, receitas: [pod()] });
    await esperar();
    expect(TestBed.inject(SaldoService).saldo()).toBe(600);
    const cartao = el.querySelector<HTMLButtonElement>("button[aria-label='Ver Armadura Nebulosa POD']")!;
    expect(cartao.textContent).toContain("Pode solicitar");
    expect(cartao.textContent).toContain("500 pts · 1 disponível(is)");

    cartao.click();
    await esperar();
    const painel = document.querySelector("[data-testid='painel-nebula']")!;
    expect(painel.querySelector("[role='switch']")?.getAttribute("aria-checked")).toBe("true");
    expect(painel.querySelector("[data-testid='materiais']")?.textContent).toContain("60/50");

    botao(painel, "Solicitar").click();
    const req = http.expectOne("/api/nebula/solicitacoes");
    expect(req.request.body).toEqual({ receitaId: "r1", trazPeca: true });
    req.flush({});
    await esperar();
    http.expectOne("/api/nebula").flush({ saldo: 100, receitas: [pod()] });
    await esperar();
    expect(document.querySelector("[data-testid='painel-nebula']")).toBeNull();
    expect(TestBed.inject(SaldoService).saldo()).toBe(100);
  });

  it("sem material, mostra o bloqueio e não deixa solicitar", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(NebulaPage);
    f.autoDetectChanges();
    document.body.appendChild(f.nativeElement as HTMLElement);
    http.expectOne("/api/nebula").flush({
      saldo: 5000,
      receitas: [pod({ disponibilidade: { ...pod().disponibilidade, trazendoPeca: 0 } })],
    });
    await esperar();
    (f.nativeElement as HTMLElement).querySelector<HTMLButtonElement>("app-cartao-nebulosa button")!.click();
    await esperar();
    const painel = document.querySelector("[data-testid='painel-nebula']")!;
    expect(painel.textContent).toContain("Falta material no estoque do grupo.");
    expect(painel.textContent).toContain("0/5");
    expect(botao(painel, "Solicitar").disabled).toBeTrue();
  });
});

describe("SolicitacoesNebulaPage", () => {
  it("admin: carrega a fila pendente e troca o filtro", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(SolicitacoesNebulaPage);
    f.componentRef.setInput("admin", true);
    f.autoDetectChanges();
    http.expectOne("/api/nebula/fila?status=PENDENTE").flush([solicitacao()]);
    await esperar();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector("[data-testid='solicitacoes']")?.textContent).toContain("Eva");
    botao(el, "Entregues").click();
    http.expectOne("/api/nebula/fila?status=ENTREGUE").flush([]);
    await esperar();
    expect(el.textContent).toContain("Nenhuma solicitação nesta situação.");
  });

  it("membro: cancelar pede confirmação; sem confirmar, não chama a API", async () => {
    const { http, perguntar } = configurar(false);
    const f = TestBed.createComponent(SolicitacoesNebulaPage);
    f.autoDetectChanges();
    http.expectOne("/api/nebula/solicitacoes").flush([solicitacao()]);
    await esperar();
    botao(f.nativeElement as HTMLElement, "Cancelar solicitação").click();
    await esperar();
    expect(perguntar).toHaveBeenCalled();
    http.expectNone("/api/nebula/solicitacoes/s1/cancelar");
  });
});
