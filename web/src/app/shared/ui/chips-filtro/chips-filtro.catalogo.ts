import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { ChipsFiltroComponent, type OpcaoChip } from "./chips-filtro.component";

/** Exemplos do catálogo: ui-chips-filtro com seleção única e múltipla. */
@Component({
  selector: "ui-chips-filtro-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ChipsFiltroComponent],
  template: `
    <h3>Seleção única (com contagem)</h3>
    <ui-chips-filtro rotulo="Filtrar por tipo" [opcoes]="tipos" [(selecionado)]="tipo" />
    <p class="meta">Selecionado: {{ tipo() }}</p>
    <h3>Seleção múltipla</h3>
    <ui-chips-filtro rotulo="Classes" [opcoes]="classes" [multipla]="true" [(selecionados)]="escolhidas" />
    <p class="meta">Selecionados: {{ escolhidas().join(", ") || "nenhum" }}</p>
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    h3 {
      margin: var(--esp-3) 0 0;
      font-size: var(--fs-m);
      color: var(--texto-suave);
    }
    .meta {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-apagado);
    }
  `,
})
export class ChipsFiltroCatalogoComponent {
  protected readonly tipos: OpcaoChip[] = [
    { valor: "todos", rotulo: "Todos", contagem: 42 },
    { valor: "material", rotulo: "Materiais", contagem: 30 },
    { valor: "carta", rotulo: "Cartas", contagem: 8 },
    { valor: "visual", rotulo: "Visuais", contagem: 4 },
  ];
  protected readonly classes: OpcaoChip[] = [
    { valor: "mtk", rotulo: "MTK" },
    { valor: "magus", rotulo: "Magus" },
    { valor: "demais", rotulo: "Demais classes" },
  ];
  protected readonly tipo = signal("todos");
  protected readonly escolhidas = signal<readonly string[]>([]);
}
