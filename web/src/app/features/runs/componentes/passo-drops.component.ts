import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from "@angular/core";
import type { ItemCatalogo } from "../../../shared/dominio/cadastros";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import { numeroDoEvento, valorDoEvento } from "../../../shared/utils/evento";
import { campoRun } from "../data/pendencias-run";
import type { RascunhoDrop } from "../data/runs.modelos";
import { campoQueSaiu, focarAposRemover, focarDepois, primeiroControle } from "./foco-linhas";

/** Passo 4 do assistente: itens obtidos na run (não mudam a pontuação). */
@Component({
  selector: "app-passo-drops",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AvisoComponent, BotaoComponent, CampoComponent, CampoControleDirective, GrupoCamposComponent],
  host: { "(focusout)": "aoSair($event)" },
  templateUrl: "./passo-drops.component.html",
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    :host > button {
      justify-self: start;
    }
  `,
})
export class PassoDropsComponent {
  readonly drops = input.required<readonly RascunhoDrop[]>();
  readonly itens = input.required<readonly ItemCatalogo[]>();
  /** Erros visíveis por campo (`campoRun`): só depois de sair do campo ou de tentar avançar. */
  readonly erros = input<ReadonlyMap<string, string>>(new Map());
  readonly tocou = output<string>();
  readonly alterar = output<{ i: number; parte: Partial<RascunhoDrop> }>();
  readonly adicionar = output();
  readonly remover = output<number>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly campo = campoRun;
  protected readonly valor = valorDoEvento;
  protected readonly numero = numeroDoEvento;

  /** Nova linha: o foco vai para o primeiro campo dela. */
  protected aoAdicionar(): void {
    this.adicionar.emit();
    focarDepois(this.injector, () => primeiroControle(this.linhas().at(-1)));
  }

  /** Linha removida: o foco vai para o "Remover" da seguinte ou para "Adicionar item". */
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
}
