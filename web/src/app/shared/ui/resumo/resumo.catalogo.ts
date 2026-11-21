import { ChangeDetectionStrategy, Component } from "@angular/core";
import { ResumoComponent } from "./resumo.component";

/** Exemplos do catálogo: ui-resumo padrão, em alerta, sem meta e com número longo. */
@Component({
  selector: "ui-resumo-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ResumoComponent],
  template: `
    <ui-resumo rotulo="Saldo disponível" valor="1.250 pts" meta="Atualizado agora" />
    <ui-resumo rotulo="Compras para entregar" valor="3" meta="A mais antiga há 2 dias" tom="alerta" />
    <ui-resumo rotulo="Runs no mês" valor="18" />
    <ui-resumo
      rotulo="Zeny estimado no período"
      valor="1.234.567.890 z"
      meta="Número longo quebra sem estourar"
    />
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
      gap: var(--esp-4);
    }
  `,
})
export class ResumoCatalogoComponent {}
