import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";
import { CATEGORIAS_EMPRESTIMO, type CategoriaEmprestimo } from "@betel/scoring";
import type { ItemCatalogo } from "../../../shared/dominio/cadastros";
import { ROTULO_CATEGORIA } from "../../../shared/dominio/emprestimo";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { GrupoCamposComponent } from "../../../shared/ui/grupo-campos/grupo-campos.component";
import type { JogadorCadastro, RascunhoEmprestimo, RascunhoParticipante } from "../data/runs.modelos";
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
  readonly participantes = input.required<readonly RascunhoParticipante[]>();
  readonly itens = input.required<readonly ItemCatalogo[]>();
  /** "Nome (Jogador)" do participante. */
  readonly nomePersonagem = input.required<(p: RascunhoParticipante) => string>();
  /** Quem pode emprestar ao participante: todos menos o dono do personagem (C3). */
  readonly credoresPara = input.required<(p: RascunhoParticipante) => readonly JogadorCadastro[]>();
  /** Percentual sugerido por categoria ("25%"). */
  readonly sugestoes = input.required<Readonly<Record<CategoriaEmprestimo, string>>>();
  /** Teto dos credores somados ("50%"). */
  readonly teto = input.required<string>();
  readonly alterar = output<{ i: number; j: number; parte: Partial<RascunhoEmprestimo> }>();
  readonly adicionar = output<number>();
  readonly remover = output<{ i: number; j: number }>();

  protected readonly categorias = CATEGORIAS_EMPRESTIMO;
  protected readonly rotuloCategoria = ROTULO_CATEGORIA;

  protected readonly valor = valorDoEvento;
  protected readonly numero = numeroDoEvento;
  protected categoria(valor: string): CategoriaEmprestimo {
    return (CATEGORIAS_EMPRESTIMO as readonly string[]).includes(valor)
      ? (valor as CategoriaEmprestimo)
      : "IMPORTANTE";
  }
}
