import { ChangeDetectionStrategy, Component } from "@angular/core";
import { PendenciasComponent } from "./pendencias.component";

/** Exemplos do catálogo: ui-pendencias com contexto, sem contexto, texto longo e vazio. */
@Component({
  selector: "ui-pendencias-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PendenciasComponent],
  template: `
    <ui-pendencias [pendencias]="varias" />
    <ui-pendencias titulo="Antes de criar o grupo" [pendencias]="longa" />
    <ui-pendencias [pendencias]="[]" />
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
  `,
})
export class PendenciasCatalogoComponent {
  protected readonly varias = [
    { campo: "a", mensagem: "Escolha o personagem.", contexto: "Participante 1" },
    { campo: "b", mensagem: "Escolha a classe.", contexto: "Participante 1" },
    { campo: "c", mensagem: "Adicione ao menos um participante." },
  ];
  protected readonly longa = [
    {
      campo: "d",
      mensagem:
        "Informe uma data e hora no futuro, no horário de São Paulo, para que os membros consigam se inscrever.",
    },
  ];
}
