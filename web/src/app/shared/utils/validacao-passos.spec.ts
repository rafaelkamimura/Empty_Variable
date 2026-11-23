import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type PendenciasPorPasso, textoPendencia, ValidacaoPassos } from "./validacao-passos";

type Passo = "a" | "b";

describe("Validação em passos", () => {
  it("mostra o erro do campo tocado e todos os do passo em que a pessoa tentou avançar", () => {
    const pend = signal<PendenciasPorPasso<Passo>>({
      a: [{ campo: "a.nome", mensagem: "Informe o nome." }],
      b: [
        { campo: "b.x", mensagem: "Escolha X." },
        { campo: "b.y", mensagem: "Escolha Y." },
      ],
    });
    const v = TestBed.runInInjectionContext(() => new ValidacaoPassos(pend, ["a", "b"]));
    expect(v.erros().size).toBe(0);
    v.tocar("b.y");
    expect([...v.erros().keys()]).toEqual(["b.y"]);
    v.tentar("a");
    expect(v.erros().get("a.nome")).toBe("Informe o nome.");
    pend.set({ a: [], b: [] });
    expect(v.erros().size).toBe(0);
    v.limpar();
    pend.set({ a: [{ campo: "a.nome", mensagem: "Informe o nome." }], b: [] });
    expect(v.erros().size).toBe(0);
  });

  it("texto do resumo leva o contexto", () => {
    expect(textoPendencia({ campo: "c", mensagem: "Escolha a classe.", contexto: "Vaga 3" })).toBe(
      "Vaga 3: escolha a classe.",
    );
  });
});
