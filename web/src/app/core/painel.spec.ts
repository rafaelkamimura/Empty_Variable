import { painelDaUrl } from "../layout/painel";
import { taxaParaBp } from "../paginas/admin-taxa.component";
import { itemAConferir } from "../paginas/admin-itens.component";
import type { ItemCatalogo } from "./cadastros";
import { atrasada, esperaDe } from "./painel";

const DIA = 86_400_000;
const agora = Date.parse("2026-11-16T12:00:00Z");
const ha = (dias: number) => new Date(agora - dias * DIA).toISOString();

describe("painéis (M13)", () => {
  it("o painel ativo vem da URL (paineis §4)", () => {
    expect(painelDaUrl("/gestao")).toBe("gestao");
    expect(painelDaUrl("/gestao/runs/123")).toBe("gestao");
    expect(painelDaUrl("/admin")).toBe("admin");
    expect(painelDaUrl("/admin/estoque")).toBe("admin");
    expect(painelDaUrl("/me")).toBe("cliente");
    expect(painelDaUrl("/loja?categoria=CARTA")).toBe("cliente");
    expect(painelDaUrl("/administrativo")).toBe("cliente");
  });

  it("espera e atraso das pendências", () => {
    expect(esperaDe({ quantidade: 0, maisAntiga: null }, agora)).toBe("Nada pendente");
    expect(esperaDe({ quantidade: 2, maisAntiga: ha(0.2) }, agora)).toBe("A mais antiga é de hoje");
    expect(esperaDe({ quantidade: 1, maisAntiga: ha(1.5) }, agora)).toBe("Esperando há 1 dia");
    expect(esperaDe({ quantidade: 3, maisAntiga: ha(4) }, agora)).toBe("Esperando há 4 dias");
    expect(atrasada({ quantidade: 1, maisAntiga: ha(1.9) }, agora)).toBe(false);
    expect(atrasada({ quantidade: 1, maisAntiga: ha(2) }, agora)).toBe(true);
  });

  it("taxa da loja em % vira pontos-base (0 a 100, até 2 casas)", () => {
    expect(taxaParaBp(null)).toBeNull();
    expect(taxaParaBp(5)).toBe(500);
    expect(taxaParaBp(12.5)).toBe(1250);
    expect(taxaParaBp(100.01)).toBeNull();
  });

  it("item a conferir: ativo com negociabilidade ou vínculo desconhecido", () => {
    const i = (p: Partial<ItemCatalogo>) =>
      ({ ativo: true, negociavel: true, vinculadoConta: false, ...p }) as ItemCatalogo;
    expect(itemAConferir(i({}))).toBe(false);
    expect(itemAConferir(i({ negociavel: null }))).toBe(true);
    expect(itemAConferir(i({ vinculadoConta: null }))).toBe(true);
    expect(itemAConferir(i({ negociavel: null, ativo: false }))).toBe(false);
  });
});
