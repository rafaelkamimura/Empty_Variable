import { TestBed } from "@angular/core/testing";
import type { LinhaPrevia, Previa } from "../data/previa-run";
import { PreviaRunComponent } from "./previa-run.component";

const linha: LinhaPrevia = {
  personagem: "Ana-MTK",
  jogador: "Ana",
  funcao: "Padrão",
  rank: 5,
  pontos: 250,
  parcelas: [],
  pontosTomador: 250,
  reducao: false,
  erro: null,
};

describe("PreviaRunComponent", () => {
  it("mostra uma linha por participante, mesmo com personagem repetido, sem avisar chave duplicada", () => {
    const aviso = spyOn(console, "warn");
    const erro = spyOn(console, "error");
    const f = TestBed.createComponent(PreviaRunComponent);
    const previa: Previa = {
      linhas: [linha, linha],
      porJogador: [{ jogador: "Ana", pontos: 500 }],
      total: 500,
      erros: [],
    };
    f.componentRef.setInput("previa", { ...previa, linhas: [linha, { ...linha, personagem: "Beto-GX" }] });
    f.componentRef.setInput("resumo", "resumo");
    f.detectChanges();
    // A prévia recalcula a cada edição: o personagem repetido aparece numa atualização.
    f.componentRef.setInput("previa", previa);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelectorAll("tbody tr").length).toBe(2);
    expect(aviso).not.toHaveBeenCalled();
    expect(erro).not.toHaveBeenCalled();
  });
});
