import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import type { Classe } from "../../../shared/dominio/cadastros";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { type JogadorCadastro, ROTULO_FRACAO, type RascunhoParticipante } from "../data/runs.modelos";
import { valorDoEvento } from "../../../shared/utils/evento";

const FRACOES = [100, 50, 0] as const;

/** Passo 2 do assistente: quem participou, com classe, função (rank) e participação. */
@Component({
  selector: "app-passo-participantes",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective],
  templateUrl: "./passo-participantes.component.html",
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
      justify-items: start;
    }
    .linha {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr));
      align-items: end;
      gap: var(--esp-2) var(--esp-3);
      width: 100%;
      box-sizing: border-box;
      margin: 0;
      padding: var(--esp-3);
      border: 1px solid var(--borda);
      border-radius: var(--raio-m);
    }
    legend {
      padding: 0 var(--esp-1);
      font-size: var(--fs-s);
      font-weight: 600;
      color: var(--texto-suave);
    }
    .linha button {
      justify-self: start;
    }
  `,
})
export class PassoParticipantesComponent {
  readonly participantes = input.required<readonly RascunhoParticipante[]>();
  readonly jogadores = input.required<readonly JogadorCadastro[]>();
  /** Classes ativas, com as funções da versão vigente da instância (D45). */
  readonly classes = input.required<readonly Classe[]>();
  readonly alterar = output<{ i: number; parte: Partial<RascunhoParticipante> }>();
  readonly classe = output<{ i: number; classeId: string }>();
  readonly adicionar = output();
  readonly remover = output<number>();

  protected readonly fracoes = FRACOES;
  protected readonly rotuloFracao = ROTULO_FRACAO;

  protected readonly valor = valorDoEvento;
  protected fracao(valor: string): 100 | 50 | 0 {
    const n = Number(valor);
    return n === 50 || n === 0 ? n : 100;
  }
  protected funcoesDe(p: RascunhoParticipante) {
    return this.classes().find((c) => c.id === p.classeId)?.funcoes ?? [];
  }
}
