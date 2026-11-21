import { TestBed } from "@angular/core/testing";
import type { Extrato } from "../data/extrato.modelos";
import { ExtratoComponent } from "./extrato.component";

const extrato: Extrato = {
  jogador: { id: "j1", apelido: "Ana" },
  saldo: 240,
  lancamentos: [
    {
      id: "a",
      valor: 300,
      tipo: "AJUSTE_ADMIN",
      criadoEm: "2026-11-20T10:00:00.000Z",
      observacao: "Bônus",
      estornaLancamentoId: null,
      run: null,
      participacao: null,
      emprestimo: null,
    },
    {
      id: "b",
      valor: -60,
      tipo: "ESTORNO",
      criadoEm: "2026-11-21T10:00:00.000Z",
      observacao: "Erro",
      estornaLancamentoId: "a",
      run: null,
      participacao: null,
      emprestimo: null,
    },
  ],
};

describe("ExtratoComponent", () => {
  it("saldo (com o testid só do número), sinais, estorno esmaecido e soma", () => {
    const f = TestBed.createComponent(ExtratoComponent);
    f.componentRef.setInput("extrato", extrato);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector("[data-testid=saldo]")?.textContent).toBe("240");
    const linhas = el.querySelectorAll("[data-testid=historico] tbody tr");
    expect(linhas.length).toBe(2);
    expect(linhas[0]?.querySelector(".valor")?.textContent?.trim()).toBe("+300");
    expect(linhas[1]?.classList).toContain("estorno");
    expect(linhas[1]?.querySelector(".valor")?.classList).toContain("negativo");
    expect(el.textContent).toContain("Soma dos lançamentos: 240");
  });

  it("sem saldo e sem lançamentos: o estado vazio com a frase pedida", () => {
    const f = TestBed.createComponent(ExtratoComponent);
    f.componentRef.setInput("extrato", { ...extrato, lancamentos: [] });
    f.componentRef.setInput("mostrarSaldo", false);
    f.componentRef.setInput("mensagemVazio", "Nenhum crédito ainda.");
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector("[data-testid=saldo]")).toBeNull();
    expect(el.querySelector("ui-vazio")?.textContent).toContain("Nenhum crédito ainda.");
  });
});
