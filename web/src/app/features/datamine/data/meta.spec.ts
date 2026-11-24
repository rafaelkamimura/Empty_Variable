import { dataHoraBr, linhasDoCliente } from "./meta";
import { RELATORIO_EXEMPLO } from "./relatorio.exemplo";
import { mapearRelatorio } from "./relatorio.modelos";

describe("meta", () => {
  it("dataHoraBr converte a data do snapshot e devolve o resto como veio", () => {
    expect(dataHoraBr("2026-11-23 21:48:42")).toBe("23/11/2026 21:48");
    expect(dataHoraBr("2026-11-23T21:48:42Z")).toBe("23/11/2026 21:48");
    expect(dataHoraBr("ontem")).toBe("ontem");
  });

  it("linhasDoCliente: comparação, GRF reempacotado, Ragexe novo e pastas", () => {
    expect(linhasDoCliente(mapearRelatorio(RELATORIO_EXEMPLO).meta)).toEqual([
      { rotulo: "Comparação", valor: "cliente de 23/11/2026 21:48 com o de 23/11/2026 22:43" },
      {
        rotulo: "data.grf",
        valor: "4,3 GB → 4,3 GB, 280.173 → 281.129 arquivos (tabela movida: GRF reempacotado)",
      },
      { rotulo: "Ragexe.exe", valor: "executável novo: 20,9 MB → 21,0 MB" },
      { rotulo: "System", valor: "2 alterados, 0 novos, 0 removidos" },
      { rotulo: "grf_text", valor: "1 alterado, 1 novo, 0 removidos" },
    ]);
  });

  it("Ragexe com o mesmo sha1 aparece como inalterado; sem meta, nenhuma linha", () => {
    const meta = mapearRelatorio({
      meta: { ragexe: { old: { sha1: "a", size: 10 }, new: { sha1: "a", size: 10 } } },
    }).meta;
    expect(linhasDoCliente(meta)).toEqual([{ rotulo: "Ragexe.exe", valor: "inalterado" }]);
    expect(linhasDoCliente(mapearRelatorio({}).meta)).toEqual([]);
  });
});
