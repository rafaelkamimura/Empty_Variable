import { TestBed } from "@angular/core/testing";
import type { SolicitacaoNebula } from "../data/nebula.modelos";
import { CartaoSolicitacaoComponent } from "./cartao-solicitacao.component";

export const solicitacao = (p: Partial<SolicitacaoNebula> = {}): SolicitacaoNebula => ({
  id: "s1",
  trazPeca: true,
  pecaDoEstoque: null,
  preco: 300,
  status: "PENDENTE",
  motivo: null,
  criadaEm: "2026-11-21T12:00:00.000Z",
  entregueEm: null,
  encerradaEm: null,
  receita: { id: "r1", nome: "Armadura Nebulosa POD" },
  precoReceita: { versao: 1 },
  jogador: { id: "j1", apelido: "Eva" },
  entreguePor: null,
  encerradaPor: null,
  materiais: [{ itemId: "f", item: "Fragmento de Meteorito", quantidade: 50 }],
  lotes: [{ item: "Fragmento de Meteorito", lote: 3, quantidade: 50 }],
  ...p,
});

const botao = (raiz: Element, texto: string) =>
  Array.from(raiz.querySelectorAll("button")).find((b) => b.textContent?.trim() === texto)!;

describe("CartaoSolicitacaoComponent", () => {
  it("admin: rejeitar pede o motivo ali mesmo e só envia com 3 letras ou mais", () => {
    const f = TestBed.createComponent(CartaoSolicitacaoComponent);
    f.componentRef.setInput("solicitacao", solicitacao());
    f.componentRef.setInput("admin", true);
    const motivos: string[] = [];
    f.componentInstance.rejeitar.subscribe((m) => motivos.push(m));
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Eva");
    expect(el.textContent).toContain("(lote #3)");

    botao(el, "Rejeitar").click();
    f.detectChanges();
    botao(el, "Confirmar rejeição").click();
    f.detectChanges();
    expect(motivos).toEqual([]);
    expect(el.querySelector("[role='alert']")?.textContent).toContain("pelo menos 3 letras");

    const campo = el.querySelector("textarea")!;
    expect(campo.labels?.[0]?.textContent).toBe("Motivo da rejeição");
    campo.value = "  Guardião ausente esta semana ";
    campo.dispatchEvent(new Event("input"));
    f.detectChanges();
    botao(el, "Confirmar rejeição").click();
    expect(motivos).toEqual(["Guardião ausente esta semana"]);
  });

  it("membro: só cancela enquanto pendente, e vê o motivo de uma rejeitada", () => {
    const f = TestBed.createComponent(CartaoSolicitacaoComponent);
    f.componentRef.setInput("solicitacao", solicitacao({ status: "REJEITADA", motivo: "Sem estoque" }));
    f.autoDetectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.textContent).toContain("Rejeitada");
    expect(el.textContent).toContain("Motivo: Sem estoque");
    expect(el.querySelectorAll("button").length).toBe(0);
  });
});
