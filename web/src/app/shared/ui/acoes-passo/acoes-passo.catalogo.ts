import { ChangeDetectionStrategy, Component } from "@angular/core";
import { MatStepperModule } from "@angular/material/stepper";
import { AcoesPassoComponent } from "./acoes-passo.component";

/** Exemplos do catálogo: ui-acoes-passo no primeiro passo, num passo do meio e no último. */
@Component({
  selector: "ui-acoes-passo-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [MatStepperModule, AcoesPassoComponent],
  template: `
    <mat-stepper orientation="vertical" aria-label="Exemplo de passos">
      <mat-step label="Primeiro passo (sem Voltar)">
        <ui-acoes-passo [voltar]="false" cancelarPara="/dev/catalogo" />
      </mat-step>
      <mat-step label="Passo do meio">
        <ui-acoes-passo cancelarPara="/dev/catalogo" />
      </mat-step>
      <mat-step label="Último passo, enviando">
        <ui-acoes-passo rotulo="Criar grupo" [carregando]="true" />
      </mat-step>
    </mat-stepper>
  `,
})
export class AcoesPassoCatalogoComponent {}
