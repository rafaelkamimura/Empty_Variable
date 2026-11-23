import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  input,
  output,
} from "@angular/core";
import { CATEGORIAS_EMPRESTIMO, type CategoriaEmprestimo } from "@betel/scoring";
import type { ItemCatalogo } from "../../../shared/dominio/cadastros";
import { ROTULO_CATEGORIA } from "../../../shared/dominio/emprestimo";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import { campoRun } from "../data/pendencias-run";
import type { VistaEmprestimos } from "../data/assistente-run.modelos";
import type { RascunhoEmprestimo } from "../data/runs.modelos";
import {
  campoQueSaiu,
  focarAposRemover,
  focarDepois,
  primeiroControle,
} from "../../../shared/ui/formulario/foco";
import { numeroDoEvento, valorDoEvento } from "../../../shared/utils/evento";

/**
 * Passo 3 do assistente: itens emprestados por outro jogador a cada participante. A categoria
 * sugere o percentual; um valor informado substitui a sugestão.
 */
@Component({
  selector: "app-passo-emprestimos",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AvisoComponent,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    CartaoComponent,
    GrupoCamposComponent,
  ],
  host: { "(focusout)": "aoSair($event)" },
  templateUrl: "./passo-emprestimos.component.html",
  styles: `
    :host {
      display: grid;
      gap: var(--esp-3);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-m);
      font-weight: 600;
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
    ui-cartao > button {
      align-self: flex-start;
    }
  `,
})
export class PassoEmprestimosComponent {
  /** Cada participante com o nome pronto, os credores possíveis e os empréstimos. */
  readonly participantes = input.required<readonly VistaEmprestimos[]>();
  readonly itens = input.required<readonly ItemCatalogo[]>();
  /** Percentual sugerido por categoria ("25%"). */
  readonly sugestoes = input.required<Readonly<Record<CategoriaEmprestimo, string>>>();
  /** Teto dos credores somados ("50%"). */
  readonly teto = input.required<string>();
  /** Erros visíveis por campo (`campoRun`): só depois de sair do campo ou de tentar avançar. */
  readonly erros = input<ReadonlyMap<string, string>>(new Map());
  readonly tocou = output<string>();
  readonly alterar = output<{ i: number; j: number; parte: Partial<RascunhoEmprestimo> }>();
  readonly adicionar = output<number>();
  readonly remover = output<{ i: number; j: number }>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly injector = inject(Injector);
  protected readonly campo = campoRun;
  protected readonly categorias = CATEGORIAS_EMPRESTIMO;
  protected readonly rotuloCategoria = ROTULO_CATEGORIA;

  protected readonly valor = valorDoEvento;
  protected readonly numero = numeroDoEvento;

  /** Novo empréstimo: o foco vai para o primeiro campo dele. */
  protected aoAdicionar(chaveParticipante: string, i: number): void {
    this.adicionar.emit(i);
    focarDepois(this.injector, () => primeiroControle(this.linhas(chaveParticipante).at(-1)));
  }

  /** Empréstimo removido: foco no "Remover" do seguinte ou no "Adicionar empréstimo" do participante. */
  protected aoRemover(chaveParticipante: string, i: number, j: number): void {
    this.remover.emit({ i, j });
    focarAposRemover(
      this.injector,
      () => this.linhas(chaveParticipante),
      j,
      () => this.cartao(chaveParticipante)?.querySelector<HTMLElement>("[data-acao=adicionar]") ?? null,
    );
  }

  protected aoSair(evento: FocusEvent): void {
    const campo = campoQueSaiu(evento);
    if (campo !== null) this.tocou.emit(campo);
  }

  private cartao(chave: string): Element | null {
    return this.host.querySelector(`[data-participante="${CSS.escape(chave)}"]`);
  }

  private linhas(chaveParticipante: string): Element[] {
    return Array.from(this.cartao(chaveParticipante)?.querySelectorAll("[data-linha]") ?? []);
  }
  protected categoria(valor: string): CategoriaEmprestimo {
    return (CATEGORIAS_EMPRESTIMO as readonly string[]).includes(valor)
      ? (valor as CategoriaEmprestimo)
      : "IMPORTANTE";
  }
}
