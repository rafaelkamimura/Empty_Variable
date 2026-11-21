import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  viewChild,
} from "@angular/core";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";

/** Salva o valor lido do campo; devolve se deu certo (o store recarrega o estado no sucesso). */
export type SalvarCampo<T> = (valor: T) => Promise<boolean>;

/**
 * Campo de texto que salva ao sair dele (evento `change`), como uma planilha: o nome de uma
 * instância, o preço ou o ID do jogo de um item. Quem usa diz como ler o texto (`ler`: undefined
 * é inválido) e como salvar. Texto inválido, igual ao atual ou que não salvou volta ao valor atual.
 */
@Component({
  selector: "app-campo-salvo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CampoComponent, CampoControleDirective],
  template: `
    <ui-campo [rotulo]="rotulo()" [rotuloOculto]="!rotuloVisivel()">
      <input
        #campo
        uiCampo
        [type]="tipo()"
        [attr.inputmode]="modoTeclado()"
        [attr.maxlength]="maximo()"
        [attr.min]="tipo() === 'number' ? 1 : null"
        [placeholder]="placeholder()"
        [value]="valor()"
        (change)="mudou()"
      />
    </ui-campo>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
  `,
})
export class CampoSalvoComponent<T> {
  /** Texto atual (já formatado), vindo do estado. */
  readonly valor = input.required<string>();
  /** Rótulo do campo (ex.: "Preço de Oridecon"): é o nome acessível. */
  readonly rotulo = input.required<string>();
  /**
   * Mostra o rótulo. Sem ele, o rótulo fica só para o leitor de tela: use apenas em célula de
   * tabela, onde o cabeçalho da coluna é o rótulo visível.
   */
  readonly rotuloVisivel = input(false, { transform: booleanAttribute });
  readonly ler = input.required<(texto: string) => T | undefined>();
  readonly salvar = input.required<SalvarCampo<T>>();
  readonly tipo = input<"text" | "number">("text");
  readonly modoTeclado = input<"text" | "decimal" | "numeric">("text");
  readonly placeholder = input("");
  readonly maximo = input<number | null>(null);
  /** O texto não pôde ser lido (quem usa explica o formato). */
  readonly invalido = output();

  private readonly campo = viewChild.required<ElementRef<HTMLInputElement>>("campo");

  protected async mudou(): Promise<void> {
    const el = this.campo().nativeElement;
    const lido = this.ler()(el.value);
    if (lido === undefined) {
      el.value = this.valor();
      this.invalido.emit();
      return;
    }
    if (lido === this.ler()(this.valor())) {
      el.value = this.valor();
      return;
    }
    if (!(await this.salvar()(lido))) el.value = this.valor();
  }
}
