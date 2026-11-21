import { TestBed } from "@angular/core/testing";
import { diaDoJogo, inicioDoDia } from "@betel/farm";
import type { InstanciaFarm, SituacaoCard } from "../data/farm.modelos";
import { CartaoInstanciaComponent } from "./cartao-instancia.component";

const hoje = diaDoJogo(Date.parse("2026-11-20T15:00:00.000Z"));
const inst: InstanciaFarm = {
  id: "i1",
  nome: "Cripta",
  recarga: "DIARIA",
  instanciaId: null,
  personagemIds: ["p1"],
  drops: [],
};

function montar(situacao: SituacaoCard) {
  const f = TestBed.createComponent(CartaoInstanciaComponent);
  f.componentRef.setInput("instancia", inst);
  f.componentRef.setInput("situacao", situacao);
  f.componentRef.setInput("hoje", hoje);
  f.componentRef.setInput("nomesDrops", "Oridecon");
  f.componentRef.setInput("valor", 3_000_000);
  f.detectChanges();
  return { f, el: f.nativeElement as HTMLElement };
}

describe("CartaoInstanciaComponent", () => {
  it("disponível: mostra os drops esperados e o botão de check-in", () => {
    const { el, f } = montar({ feita: false, diaFeita: null, checkin: null });
    let pediu = false;
    f.componentInstance.checkin.subscribe(() => (pediu = true));
    expect(el.querySelector("[data-testid='inst-Cripta']")?.classList).not.toContain("feita");
    Array.from(el.querySelectorAll("button"))
      .find((b) => b.textContent?.trim() === "Check-in")!
      .click();
    expect(pediu).toBeTrue();
  });

  it("feita: verde, com drops, valor e as ações de editar e desfazer", () => {
    const feitoEm = new Date(inicioDoDia(hoje) + 3_600_000).toISOString();
    const { el } = montar({
      feita: true,
      diaFeita: hoje,
      liberaNoDia: hoje + 1,
      checkin: {
        id: "c1",
        personagemId: "p1",
        farmInstanciaId: "i1",
        nomeInstancia: "Cripta",
        feitoEm,
        drops: [{ farmItemId: "a", nome: "Oridecon", quantidade: 2 }],
      },
    });
    expect(el.querySelector("[data-testid='inst-Cripta']")?.classList).toContain("feita");
    expect(el.textContent).toContain("✓ Feita hoje");
    expect(el.textContent).toContain("Oridecon ×2");
    expect(el.textContent).toContain("3kk");
    expect(el.textContent).toContain("Editar drops");
    expect(el.textContent).toContain("Desfazer check-in");
  });
});
