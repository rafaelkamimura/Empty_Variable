import { campoQueSaiu, primeiroControle } from "./foco";

describe("Foco em listas editáveis", () => {
  it("primeiro controle habilitado e campo que perdeu o foco", () => {
    const raiz = document.createElement("div");
    raiz.innerHTML = `<input disabled /><select data-campo="x"></select><input />`;
    const select = raiz.querySelector("select")!;
    expect(primeiroControle(raiz)).toBe(select);
    expect(primeiroControle(null)).toBeNull();
    expect(campoQueSaiu(new FocusEvent("focusout"))).toBeNull();
    select.addEventListener("focusout", (e) => expect(campoQueSaiu(e)).toBe("x"));
    select.dispatchEvent(new FocusEvent("focusout"));
  });
});
