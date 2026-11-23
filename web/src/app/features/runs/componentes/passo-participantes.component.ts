import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import type { Classe } from "../../../shared/dominio/cadastros";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import { type JogadorCadastro, ROTULO_FRACAO, type RascunhoParticipante } from "../data/runs.modelos";
import { valorDoEvento } from "../../../shared/utils/evento";

const FRACOES = [100, 50, 0] as const;

/** Passo 2 do assistente: quem participou, com classe, função (rank) e participação. */
@Component({
  selector: "app-passo-participantes",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective, GrupoCamposComponent],
  templateUrl: "./passo-participantes.component.html",
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
      justify-items: stretch;
    }
    :host > button {
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
