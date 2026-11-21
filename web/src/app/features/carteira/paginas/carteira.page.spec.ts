import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Acao } from "../../../core/acao";
import { AuthService } from "../../../core/auth.service";
import type { UsuarioMe } from "../../../core/modelos";
import { SaldoService } from "../../../core/saldo.service";
import type { Extrato, LancamentoExtrato } from "../data/extrato.modelos";
import { CarteiraPage } from "./carteira.page";

const esperar = () => new Promise((r) => setTimeout(r));
const base = {
  criadoEm: "2026-11-20T10:00:00.000Z",
  observacao: null,
  estornaLancamentoId: null,
  run: null,
  participacao: null,
  emprestimo: null,
};
const extrato = (saldo: number, lancamentos: Partial<LancamentoExtrato>[]): Extrato => ({
  jogador: { id: "j1", apelido: "Cliente" },
  saldo,
  lancamentos: lancamentos.map(
    (l, i) => ({ ...base, id: `l${i}`, valor: 0, tipo: "AJUSTE_ADMIN", ...l }) as LancamentoExtrato,
  ),
});

function montar(vinculado = true) {
  const avisar = jasmine.createSpy("avisar");
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      {
        provide: AuthService,
        useValue: { usuario: signal({ jogador: vinculado ? { id: "j1" } : null } as unknown as UsuarioMe) },
      },
      { provide: Acao, useValue: { avisar } },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(CarteiraPage);
  f.autoDetectChanges();
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  return { http, el, avisar };
}

const botao = (raiz: Element, texto: string) =>
  Array.from(raiz.querySelectorAll("button")).find((b) => b.textContent?.trim() === texto)!;

describe("CarteiraPage", () => {
  afterEach(() => document.querySelectorAll("app-carteira-page").forEach((e) => e.remove()));

  it("sem vínculo, avisa com o próximo passo e não chama a API", () => {
    const { http, el } = montar(false);
    expect(el.querySelector("ui-aviso")?.textContent).toContain("Vincule sua conta");
    expect(el.querySelector("ui-aviso a")?.getAttribute("href")).toBe("/vinculo");
    expect(botao(el, "Transferir pontos").disabled).toBeTrue();
    http.expectNone("/api/extrato/me");
  });

  it("mostra o saldo, os movimentos (com a origem) e atualiza o topo", async () => {
    const { http, el } = montar();
    expect(el.querySelector("ui-skeleton")).not.toBeNull();
    http.expectOne("/api/extrato/me").flush(
      extrato(1250, [
        { valor: 600, tipo: "AJUSTE_ADMIN", observacao: "Bônus" },
        {
          valor: -100,
          tipo: "TRANSFERENCIA_ENVIADA",
          transferencia: {
            id: "t",
            remetente: { apelido: "Cliente" },
            destinatario: { apelido: "Recebedor" },
          },
        },
      ]),
    );
    http.expectOne("/api/loja/compras").flush([]);
    await esperar();
    expect(el.querySelector("[data-testid=saldo-carteira]")?.textContent?.trim()).toBe("1.250 pts");
    expect(TestBed.inject(SaldoService).saldo()).toBe(1250);
    const historico = el.querySelector("[data-testid=historico]")!;
    expect(historico.textContent).toContain("+600");
    expect(historico.textContent).toContain("Enviada para Recebedor");
    expect(botao(el, "Transferir pontos").disabled).toBeFalse();
  });

  it("transfere: escolhe, revisa com o saldo depois, confirma com id estável e recarrega", async () => {
    const { http, el, avisar } = montar();
    http.expectOne("/api/extrato/me").flush(extrato(525, [{ valor: 525 }]));
    http.expectOne("/api/loja/compras").flush([]);
    await esperar();
    botao(el, "Transferir pontos").click();
    http.expectOne("/api/carteira/transferencias/destinatarios").flush([{ id: "j2", apelido: "Recebedor" }]);
    await esperar();
    const painel = el.querySelector("[role=dialog]")!;
    expect(painel.getAttribute("aria-label")).toBe("Transferir pontos");
    const select = painel.querySelector("select")!;
    select.value = "j2";
    select.dispatchEvent(new Event("change"));
    const pontos = painel.querySelector<HTMLInputElement>("input[type=number]")!;
    pontos.value = "526";
    pontos.dispatchEvent(new Event("input"));
    await esperar();
    expect(botao(painel, "Revisar transferência").disabled).toBeTrue();
    pontos.value = "100";
    pontos.dispatchEvent(new Event("input"));
    await esperar();
    botao(painel, "Revisar transferência").click();
    await esperar();
    expect(painel.textContent).toContain("Saldo após o envio: 425 pts.");

    // Primeira tentativa falha; a segunda reaproveita o mesmo id (sem duplicar).
    botao(painel, "Confirmar transferência").click();
    const primeira = http.expectOne((r) => r.method === "POST" && r.url === "/api/carteira/transferencias");
    const id = (primeira.request.body as { id: string }).id;
    expect(primeira.request.body).toEqual({ id, destinatarioId: "j2", pontos: 100 });
    primeira.flush({ message: "Tente de novo." }, { status: 503, statusText: "Indisponível" });
    await esperar();
    expect(painel.textContent).toContain("Tente de novo.");
    botao(painel, "Confirmar transferência").click();
    const segunda = http.expectOne((r) => r.method === "POST" && r.url === "/api/carteira/transferencias");
    expect((segunda.request.body as { id: string }).id).toBe(id);
    segunda.flush({});
    await esperar();
    expect(avisar).toHaveBeenCalledWith("Transferência enviada para Recebedor.");
    expect(el.querySelector("[role=dialog]")).toBeNull();
    http.expectOne("/api/extrato/me").flush(extrato(425, [{ valor: 525 }, { valor: -100 }]));
    http.expectOne("/api/loja/compras").flush([]);
    await esperar();
    expect(el.querySelector("[data-testid=saldo-carteira]")?.textContent?.trim()).toBe("425 pts");
  });

  it("Voltar mantém o destinatário escolhido na tela, limpa o erro e move o foco", async () => {
    const { http, el } = montar();
    http.expectOne("/api/extrato/me").flush(extrato(525, [{ valor: 525 }]));
    http.expectOne("/api/loja/compras").flush([]);
    await esperar();
    botao(el, "Transferir pontos").click();
    http.expectOne("/api/carteira/transferencias/destinatarios").flush([
      { id: "j2", apelido: "Recebedor" },
      { id: "j3", apelido: "Outra" },
    ]);
    await esperar();
    const painel = el.querySelector("[role=dialog]")!;
    const escolher = (id: string, pts: string) => {
      const select = painel.querySelector("select")!;
      select.value = id;
      select.dispatchEvent(new Event("change"));
      const pontos = painel.querySelector<HTMLInputElement>("input[type=number]")!;
      pontos.value = pts;
      pontos.dispatchEvent(new Event("input"));
    };
    escolher("j3", "100");
    await esperar();
    botao(painel, "Revisar transferência").click();
    await esperar();
    expect(document.activeElement?.textContent?.trim()).toBe("Confirmar transferência");
    botao(painel, "Confirmar transferência").click();
    http
      .expectOne((r) => r.method === "POST" && r.url === "/api/carteira/transferencias")
      .flush({ message: "Saldo insuficiente." }, { status: 400, statusText: "Erro" });
    await esperar();
    expect(painel.textContent).toContain("Saldo insuficiente.");

    botao(painel, "Voltar").click();
    await esperar();
    expect(painel.textContent).not.toContain("Saldo insuficiente.");
    // A tela mostra o destinatário que o formulário guarda.
    expect(painel.querySelector("select")!.value).toBe("j3");
    expect(document.activeElement).toBe(painel.querySelector("input[type=number]"));
    const pontos = painel.querySelector<HTMLInputElement>("input[type=number]")!;
    pontos.value = "50";
    pontos.dispatchEvent(new Event("input"));
    await esperar();
    botao(painel, "Revisar transferência").click();
    await esperar();
    expect(painel.textContent).toContain("Enviar 50 pts para Outra?");
    expect(painel.textContent).not.toContain("Saldo insuficiente.");
    botao(painel, "Confirmar transferência").click();
    const req = http.expectOne((r) => r.method === "POST" && r.url === "/api/carteira/transferencias");
    expect((req.request.body as { destinatarioId: string }).destinatarioId).toBe("j3");
  });
});
