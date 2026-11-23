import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from "@angular/core";
import type { Classe } from "../../../shared/dominio/cadastros";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import { campoRun } from "../data/pendencias-run";
import { type JogadorCadastro, ROTULO_FRACAO, type RascunhoParticipante } from "../data/runs.modelos";
import {
  campoQueSaiu,
  focarAposRemover,
  focarDepois,
  primeiroControle,
} from "../../../shared/ui/formulario/foco";
import { valorDoEvento } from "../../../shared/utils/evento";

const FRACOES = [100, 50, 0] as const;

/** Passo 2 do assistente: quem participou, com classe, função (rank) e participação. */
@Component({
  selector: "app-passo-participantes",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent, CampoComponent, CampoControleDirective, GrupoCamposComponent],
  host: { "(focusout)": "aoSair($event)" },
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
  /** Erros visíveis por campo (`campoRun`): só depois de sair do campo ou de tentar avançar. */
  readonly erros = input<ReadonlyMap<string, string>>(new Map());
  readonly tocou = output<string>();
  readonly alterar = output<{ i: number; parte: Partial<RascunhoParticipante> }>();
  readonly classe = output<{ i: number; classeId: string }>();
  readonly adicionar = output();
  readonly remover = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly campo = campoRun;
  protected readonly fracoes = FRACOES;
  protected readonly rotuloFracao = ROTULO_FRACAO;

  protected readonly valor = valorDoEvento;

  /** Nova linha: o foco vai para o primeiro campo dela. */
  protected aoAdicionar(): void {
    this.adicionar.emit();
    focarDepois(this.injector, () => primeiroControle(this.linhas().at(-1)));
  }

  /** Linha removida: o foco vai para o "Remover" da seguinte ou para "Adicionar participante". */
  protected aoRemover(i: number): void {
    this.remover.emit(i);
    focarAposRemover(
      this.injector,
      () => this.linhas(),
      i,
      () => this.host.querySelector<HTMLElement>("[data-acao=adicionar]"),
    );
  }

  protected aoSair(evento: FocusEvent): void {
    const campo = campoQueSaiu(evento);
    if (campo !== null) this.tocou.emit(campo);
  }

  private linhas(): Element[] {
    return Array.from(this.host.querySelectorAll("[data-linha]"));
  }
  protected fracao(valor: string): 100 | 50 | 0 {
    const n = Number(valor);
    return n === 50 || n === 0 ? n : 100;
  }
  protected funcoesDe(p: RascunhoParticipante) {
    return this.classes().find((c) => c.id === p.classeId)?.funcoes ?? [];
  }
}
