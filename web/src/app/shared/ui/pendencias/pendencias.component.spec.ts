import { TestBed } from "@angular/core/testing";
import { PendenciasComponent } from "./pendencias.component";

describe("PendenciasComponent", () => {
  it("lista as pendências com o contexto, num aviso que o leitor de tela anuncia", () => {
    const f = TestBed.createComponent(PendenciasComponent);
    f.componentRef.setInput("pendencias", [
      { campo: "a", mensagem: "Escolha o personagem.", contexto: "Participante 1" },
      { campo: "lista", mensagem: "Adicione ao menos um participante." },
    ]);
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(Array.from(el.querySelectorAll("li")).map((li) => li.textContent)).toEqual([
      "Participante 1: escolha o personagem.",
      "Adicione ao menos um participante.",
    ]);
    expect(el.querySelector("[role=status]")).not.toBeNull();
    expect(el.getAttribute("tabindex")).toBe("-1");
  });

  it("sem pendências, não mostra nada", () => {
    const f = TestBed.createComponent(PendenciasComponent);
    f.componentRef.setInput("pendencias", []);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector("ui-aviso")).toBeNull();
  });
});
