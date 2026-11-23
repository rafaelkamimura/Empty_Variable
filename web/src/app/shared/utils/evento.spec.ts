import { numeroDoEvento, numeroOuNulo, valorDoEvento } from "./evento";

function eventoDe(valor: string, tag: "input" | "select" = "input"): Event {
  const el = document.createElement(tag);
  if (tag === "select") el.appendChild(new Option(valor, valor));
  el.value = valor;
  const e = new Event("input");
  el.dispatchEvent(e);
  return e;
}

describe("Valor do evento", () => {
  it("lê o valor de input e select", () => {
    expect(valorDoEvento(eventoDe("abc"))).toBe("abc");
    expect(valorDoEvento(eventoDe("op", "select"))).toBe("op");
  });

  it("sem alvo, devolve texto vazio", () => {
    expect(valorDoEvento(new Event("input"))).toBe("");
  });

  it("número: vazio ou inválido vira null", () => {
    expect(numeroOuNulo("")).toBeNull();
    expect(numeroOuNulo("abc")).toBeNull();
    expect(numeroOuNulo("12.5")).toBe(12.5);
    expect(numeroDoEvento(eventoDe("3"))).toBe(3);
    expect(numeroDoEvento(eventoDe(""))).toBeNull();
  });
});
