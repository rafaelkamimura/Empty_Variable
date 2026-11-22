import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { STATUS_RUN, type StatusRun } from "@betel/scoring";
import {
  type EncontroInstancia,
  type Instancia,
  textoMultiplicador,
} from "../../../shared/dominio/instancias";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { numeroOuNulo } from "../data/edicao-run";
import { ROTULO_STATUS, type RascunhoRun } from "../data/runs.modelos";

/** Passo 1 do assistente: data, instância, encontro, resultado e, na correção, o motivo. */
@Component({
  selector: "app-passo-dados",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoComponent, CampoControleDirective],
  templateUrl: "./passo-dados.component.html",
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 200px), 1fr));
      align-items: start;
      gap: var(--esp-3);
    }
  `,
})
export class PassoDadosComponent {
  readonly rascunho = input.required<RascunhoRun>();
  readonly instancias = input.required<readonly Instancia[]>();
  readonly encontros = input.required<readonly EncontroInstancia[]>();
  /** Correção (US-07): instância travada e motivo obrigatório. */
  readonly correcao = input(false);
  readonly motivo = input("");
  readonly ehBetelgeuse = input(false);
  readonly mudar = output<Partial<RascunhoRun>>();
  readonly instancia = output<string>();
  readonly motivoChange = output<string>();

  protected readonly statusRun = STATUS_RUN;
  protected readonly rotuloStatus = ROTULO_STATUS;

  protected texto(evento: Event): string {
    return (evento.target as HTMLInputElement | HTMLSelectElement).value;
  }
  protected numero(texto: string): number | null {
    return numeroOuNulo(texto);
  }
  protected status(valor: string): StatusRun {
    return (STATUS_RUN as readonly string[]).includes(valor) ? (valor as StatusRun) : "CONCLUIDA";
  }
  protected multiplicador(c: number): string {
    return textoMultiplicador(c);
  }
}
