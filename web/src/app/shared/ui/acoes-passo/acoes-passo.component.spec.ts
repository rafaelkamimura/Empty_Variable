import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { MatStepperModule } from "@angular/material/stepper";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { AcoesPassoComponent } from "./acoes-passo.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatStepperModule, AcoesPassoComponent],
  template: `
    <mat-stepper>
      <mat-step label="Um">
        <ui-acoes-passo [voltar]="false" [cancelarPara]="cancelar()" (avancar)="cliques.set(cliques() + 1)" />
      </mat-step>
      <mat-step label="Dois"><ui-acoes-passo rotulo="Criar" /></mat-step>
    </mat-stepper>
  `,
})
class HospedeiroComponent {
  readonly cancelar = signal<string | null>("/inicio");
  readonly cliques = signal(0);
}

const textos = (raiz: Element) =>
  Array.from(raiz.querySelectorAll("button, a")).map((b) => b.textContent?.trim());

describe("AcoesPassoComponent", () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] }),
  );

  it("mostra Voltar, o principal e Cancelar conforme as entradas; o principal nunca fica desabilitado", () => {
    const f = TestBed.createComponent(HospedeiroComponent);
    f.detectChanges();
    const [primeiro, segundo] = Array.from(
      (f.nativeElement as HTMLElement).querySelectorAll("ui-acoes-passo"),
    );
    expect(textos(primeiro!)).toEqual(["Próximo", "Cancelar"]);
    expect(primeiro!.querySelector("a")?.getAttribute("href")).toBe("/inicio");
    expect(textos(segundo!)).toEqual(["Voltar", "Criar"]);
    const principal = primeiro!.querySelector("button")!;
    expect(principal.disabled).toBeFalse();
    principal.click();
    expect(f.componentInstance.cliques()).toBe(1);
  });

  it("sem destino, não há Cancelar", () => {
    const f = TestBed.createComponent(HospedeiroComponent);
    f.componentInstance.cancelar.set(null);
    f.detectChanges();
    expect(textos((f.nativeElement as HTMLElement).querySelector("ui-acoes-passo")!)).toEqual(["Próximo"]);
  });
});
