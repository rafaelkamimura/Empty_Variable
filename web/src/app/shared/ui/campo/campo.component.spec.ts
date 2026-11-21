import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CampoComponent, CampoControleDirective } from "./campo.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoComponent, CampoControleDirective],
  template: `
    <ui-campo rotulo="Quantidade" dica="Máximo de 5." [erro]="erro()">
      <input uiCampo type="number" inputmode="numeric" />
    </ui-campo>
  `,
})
class HospedeiroComponent {
  readonly erro = signal("");
}

describe("CampoComponent", () => {
  it("liga rótulo, dica e erro ao controle", () => {
    const f = TestBed.createComponent(HospedeiroComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const input = el.querySelector("input")!;
    const label = el.querySelector("label")!;
    expect(label.textContent).toBe("Quantidade");
    expect(label.htmlFor).toBe(input.id);
    expect(input.id).toMatch(/^ui-campo-\d+-controle$/);
    const dica = el.querySelector(".ui-campo-dica")!;
    expect(input.getAttribute("aria-describedby")).toBe(dica.id);
    expect(input.hasAttribute("aria-invalid")).toBeFalse();

    f.componentInstance.erro.set("Use um número inteiro.");
    f.detectChanges();
    const erro = el.querySelector(".ui-campo-erro")!;
    expect(erro.getAttribute("role")).toBe("alert");
    expect(input.getAttribute("aria-describedby")).toBe(`${dica.id} ${erro.id}`);
    expect(input.getAttribute("aria-invalid")).toBe("true");
  });
});
