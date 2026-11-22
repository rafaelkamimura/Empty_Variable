import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Esqueleto de página (diretrizes §5 e §6.1): título (h1), uma frase e uma ação principal à
 * direita, depois abas (opcionais) e o conteúdo.
 *
 * Slots: a ação vai em `[slot=acao]` ou é o próprio `button[uiBotao][variante=principal]`;
 * as abas em `[slot=abas]`; todo o resto é conteúdo.
 *
 * @nivel template
 */
@Component({
  selector: "ui-pagina",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="cabeca">
      <div class="textos">
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
      </div>
      <div class="acao">
        <ng-content select="[slot=acao], [uiBotao][variante=principal]" />
      </div>
    </header>
    <ng-content select="[slot=abas]" />
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: var(--esp-4);
      max-width: var(--largura-conteudo);
      margin: 0 auto;
    }
    .cabeca {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--esp-3);
    }
    .textos {
      flex: 1 1 280px;
      min-width: 0;
    }
    h1 {
      margin: 0 0 var(--esp-1);
      font-size: var(--fs-2xl);
      font-weight: 700;
      line-height: 1.2;
      color: var(--texto-forte);
    }
    p {
      margin: 0;
      max-width: 80ch;
      color: var(--texto-suave);
    }
    .acao {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
    .acao:empty {
      display: none;
    }
  `,
})
export class PaginaComponent {
  /** Título da página (vira o único h1). */
  readonly titulo = input.required<string>();
  /** Uma frase curta que explica a tela. */
  readonly subtitulo = input<string>();
}
