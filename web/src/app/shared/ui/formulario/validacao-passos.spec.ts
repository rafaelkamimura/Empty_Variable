import { signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { PendenciasPorPasso } from "../../utils/pendencias";
import { ValidacaoPassos } from "./validacao-passos";

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
});
