import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { ComoFuncionaComponent } from "./como-funciona.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComoFuncionaComponent],
  template: `<ui-como-funciona titulo="Como a taxa funciona"><p>Explicação.</p></ui-como-funciona>`,
})
class HospedeiroComponent {}

describe("ComoFuncionaComponent", () => {
  it("começa recolhido, com o título no resumo e o conteúdo projetado", () => {
    const fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const detalhes = el.querySelector("details")!;
    expect(detalhes.open).toBeFalse();
    expect(el.querySelector("summary")?.textContent).toBe("Como a taxa funciona");
    expect(el.querySelector(".conteudo p")?.textContent).toBe("Explicação.");
    expect(el.querySelector("ui-como-funciona")?.classList).toContain("ui-como-funciona");
  });
});
