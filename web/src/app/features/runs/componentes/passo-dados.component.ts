import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { STATUS_RUN, type StatusRun } from "@betel/scoring";
import {
  type EncontroInstancia,
  type Instancia,
  textoMultiplicador,
} from "../../../shared/dominio/instancias";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { campoRun } from "../data/pendencias-run";
import { ROTULO_STATUS, type RascunhoRun } from "../data/runs.modelos";
import { campoQueSaiu } from "./foco-linhas";
import { numeroDoEvento, valorDoEvento } from "../../../shared/utils/evento";

/** Passo 1 do assistente: data, instância, encontro, resultado e, na correção, o motivo. */
@Component({
  selector: "app-passo-dados",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoComponent, CampoControleDirective],
  host: { "(focusout)": "aoSair($event)" },
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
  /** Erros visíveis por campo (`campoRun`): só depois de sair do campo ou de tentar avançar. */
  readonly erros = input<ReadonlyMap<string, string>>(new Map());
  /** A pessoa saiu de um campo: a partir daí o erro dele aparece. */
  readonly tocou = output<string>();
  readonly mudar = output<Partial<RascunhoRun>>();
  readonly instancia = output<string>();
  readonly motivoChange = output<string>();

  protected readonly campo = campoRun;
  protected readonly statusRun = STATUS_RUN;
  protected readonly rotuloStatus = ROTULO_STATUS;

  protected readonly valor = valorDoEvento;
  protected aoSair(evento: FocusEvent): void {
    const campo = campoQueSaiu(evento);
    if (campo !== null) this.tocou.emit(campo);
  }
  protected readonly numero = numeroDoEvento;
  protected status(valor: string): StatusRun {
    return (STATUS_RUN as readonly string[]).includes(valor) ? (valor as StatusRun) : "CONCLUIDA";
  }
  protected multiplicador(c: number): string {
    return textoMultiplicador(c);
  }
}
