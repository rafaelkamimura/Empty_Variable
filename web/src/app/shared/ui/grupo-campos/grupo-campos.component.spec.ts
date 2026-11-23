import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { GrupoCamposComponent } from "./grupo-campos.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [GrupoCamposComponent],
  template: `
    <ui-grupo-campos legenda="Participante 1" larguraCampo="p">
      <label>Nome <input /></label>
      <button slot="acoes">Remover</button>
    </ui-grupo-campos>
    <ui-grupo-campos legenda="Sem ações"
      ><label>Outro <input /></label
    ></ui-grupo-campos>
  `,
})
class HospedeiroComponent {}

describe("GrupoCamposComponent", () => {
  it("agrupa os campos num fieldset com legenda, e as ações abaixo", () => {
    const f = TestBed.createComponent(HospedeiroComponent);
    f.detectChanges();
    const [grupo, semAcoes] = Array.from(
      (f.nativeElement as HTMLElement).querySelectorAll("ui-grupo-campos"),
    );
    const fieldset = grupo!.querySelector("fieldset")!;
    expect(fieldset.querySelector("legend")?.textContent).toBe("Participante 1");
    expect(fieldset.querySelector(".campos input")).not.toBeNull();
    expect(fieldset.querySelector(".acoes button")?.textContent).toBe("Remover");
    expect(grupo!.classList).toContain("estreito");
    expect(semAcoes!.classList).not.toContain("estreito");
    expect(getComputedStyle(semAcoes!.querySelector(".acoes")!).display).toBe("none");
  });

  it("o fieldset dá o nome do grupo aos controles (papel group)", () => {
    const f = TestBed.createComponent(HospedeiroComponent);
    f.detectChanges();
    const fieldset = (f.nativeElement as HTMLElement).querySelector("fieldset")!;
    expect(fieldset.elements.length).toBeGreaterThan(0);
  });
});
