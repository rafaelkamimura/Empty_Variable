import {
  booleanAttribute,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostAttributeToken,
  inject,
  input,
} from "@angular/core";

export type VarianteBotao = "principal" | "secundario" | "fantasma" | "perigo";
export type TamanhoBotao = "p" | "m";

/**
 * Botão do sistema (diretrizes §5, átomo). Vai em `<button>` (ações) ou `<a>` (navegação).
 * Use um só `variante="principal"` por tela (§2.4). Durante um envio, ligue `carregando`:
 * o botão fica desabilitado, mostra um indicador e anuncia `aria-busy` (§6.3).
 *
 * @nivel atomo
 */
@Component({
  selector: "button[uiBotao], a[uiBotao]",
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: "ui-botao",
    "[class.variante-principal]": "variante() === 'principal'",
    "[class.variante-secundario]": "variante() === 'secundario'",
    "[class.variante-fantasma]": "variante() === 'fantasma'",
    "[class.variante-perigo]": "variante() === 'perigo'",
    "[class.tamanho-p]": "tamanho() === 'p'",
    "[class.carregando]": "carregando()",
    "[attr.disabled]": "ehBotao && inativo() ? '' : null",
    "[attr.aria-disabled]": "!ehBotao && inativo() ? 'true' : null",
    "[attr.tabindex]": "!ehBotao && inativo() ? -1 : null",
    "[attr.aria-busy]": "carregando() ? 'true' : null",
    "[attr.type]": "ehBotao ? tipoEfetivo() : null",
  },
  template: `
    @if (carregando()) {
      <span class="indicador" aria-hidden="true"></span>
    }
    <ng-content />
  `,
  styleUrl: "./botao.component.scss",
})
export class BotaoComponent {
  /** Aparência: `principal` (degradê, uma por tela), `secundario` (contorno), `fantasma` (só texto), `perigo`. */
  readonly variante = input<VarianteBotao>("secundario");
  /** `m` (padrão) ou `p` (tabelas e barras densas). Os dois mantêm o alvo de toque de 40 px. */
  readonly tamanho = input<TamanhoBotao>("m");
  /** Envio em andamento: desabilita e mostra o indicador. */
  readonly carregando = input(false, { transform: booleanAttribute });
  /** Desabilitado. Substitui o `[disabled]` nativo, que vale também para `<a>` (via `aria-disabled`). */
  readonly disabled = input(false, { transform: booleanAttribute });
  /**
   * `type` do `<button>`. O atributo estático também vale (`<button uiBotao type="submit">`);
   * sem nenhum dos dois, `button`, para não enviar formulários sem querer.
   */
  readonly tipo = input<"button" | "submit" | "reset">();

  /** `type` escrito direto no elemento, lido uma vez (o host binding passaria por cima dele). */
  private readonly tipoEstatico = inject(new HostAttributeToken("type"), { optional: true });

  protected readonly inativo = computed(() => this.disabled() || this.carregando());
  protected readonly tipoEfetivo = computed(() => this.tipo() ?? this.tipoEstatico ?? "button");
  /** O seletor só casa com `<button>` ou `<a>`; o elemento do host diz qual. */
  private readonly elemento = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  protected readonly ehBotao = this.elemento.tagName === "BUTTON";

  constructor() {
    // `<a>` não tem `disabled` nativo: desabilitado ou carregando, o clique não navega nem chega
    // aos handlers da página (como num <button disabled>). A fase de captura no próprio elemento
    // roda antes dos (click) do template, que o Angular registra antes dos do host.
    const host = this.elemento;
    const bloquear = (evento: Event) => {
      if (!this.inativo()) return;
      evento.preventDefault();
      evento.stopImmediatePropagation();
    };
    host.addEventListener("click", bloquear, { capture: true });
    inject(DestroyRef).onDestroy(() => host.removeEventListener("click", bloquear, { capture: true }));
  }
}
