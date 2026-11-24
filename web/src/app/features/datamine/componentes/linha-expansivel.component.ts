import { NgTemplateOutlet } from "@angular/common";
import {
  ChangeDetectionStrategy,
  Component,
  contentChild,
  Directive,
  signal,
  TemplateRef,
} from "@angular/core";

let proximoId = 0;

/** Marca o template do corpo da `app-linha-expansivel`: `<ng-template appCorpoDaLinha>…</ng-template>`. */
@Directive({ selector: "ng-template[appCorpoDaLinha]" })
export class CorpoDaLinhaDirective {}

/**
 * Linha de lista que abre os detalhes ao clicar. O cabeçalho (conteúdo projetado) fica dentro de
 * um botão com `aria-expanded`, e a área de clique do botão cobre a linha inteira. O corpo é o
 * `<ng-template appCorpoDaLinha>` filho, que só é criado quando a linha abre, para a lista não
 * carregar no DOM as descrições que ninguém pediu.
 *
 * Slot `[slot=codigo]`: um link que fica antes do nome e fora do botão (um link dentro de um botão
 * não é válido). Quem entra nesse slot precisa ficar acima da área de clique (`position: relative`
 * e `z-index: 1`), como o `app-link-item` já faz.
 */
@Component({
  selector: "app-linha-expansivel",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgTemplateOutlet],
  template: `
    <div class="cabeca">
      <span class="seta" [class.aberta]="aberta()" aria-hidden="true"></span>
      <div class="conteudo">
        <ng-content select="[slot=codigo]" />
        <button
          type="button"
          class="alternar"
          [attr.aria-expanded]="aberta()"
          [attr.aria-controls]="aberta() ? idCorpo : null"
          (click)="aberta.set(!aberta())"
        >
          <ng-content />
        </button>
      </div>
    </div>
    @if (aberta()) {
      <div class="corpo" [id]="idCorpo">
        <ng-container *ngTemplateOutlet="corpo() ?? null" />
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }
    .cabeca {
      position: relative;
      display: grid;
      grid-template-columns: var(--esp-4) minmax(0, 1fr);
      gap: var(--esp-2);
      align-items: center;
      min-height: 40px;
      box-sizing: border-box;
      padding: var(--esp-2) var(--esp-3);
      border-radius: var(--raio-p);
      color: var(--texto);
    }
    .cabeca:hover {
      background: var(--acento-fundo);
    }
    .seta {
      width: var(--esp-2);
      height: var(--esp-2);
      border-inline-end: 2px solid var(--texto-suave);
      border-block-end: 2px solid var(--texto-suave);
      transform: rotate(-45deg);
      transition: transform var(--duracao) var(--curva);
    }
    .seta.aberta {
      transform: rotate(45deg);
    }
    .conteudo,
    .alternar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--esp-1) var(--esp-2);
      min-width: 0;
      overflow-wrap: anywhere;
    }
    .alternar {
      flex: 1 1 0;
      min-height: 24px;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;
    }
    .alternar::after {
      content: "";
      position: absolute;
      inset: 0;
      border-radius: var(--raio-p);
    }
    .alternar:focus-visible {
      outline: none;
    }
    .alternar:focus-visible::after {
      outline: 2px solid var(--foco);
      outline-offset: -2px;
    }
    .corpo {
      display: grid;
      gap: var(--esp-3);
      padding: var(--esp-2) var(--esp-3) var(--esp-4) calc(var(--esp-3) + var(--esp-4) + var(--esp-2));
    }
  `,
})
export class LinhaExpansivelComponent {
  /**
   * O corpo da linha, criado só quando ela abre. Buscar pela diretiva, e não por qualquer
   * TemplateRef, evita pegar um bloco @if projetado no cabeçalho.
   */
  protected readonly corpo = contentChild(CorpoDaLinhaDirective, { read: TemplateRef });
  protected readonly aberta = signal(false);
  protected readonly idCorpo = `linha-expansivel-${++proximoId}`;
}
