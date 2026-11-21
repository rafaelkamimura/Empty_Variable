import { ChangeDetectionStrategy, Component, input } from "@angular/core";

/**
 * Estado vazio (diretrizes §5 e §6.2): a marca {∅_}, uma frase que explica e, se houver,
 * a ação para preencher (slot `[slot=acao]`).
 *
 * @nivel molecula
 */
@Component({
  selector: "ui-vazio",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="marca" aria-hidden="true"
      ><span class="chaves">{{ "{" }}</span
      ><span class="nulo">∅</span><span class="cursor">_</span><span class="chaves">{{ "}" }}</span></span
    >
    <p class="frase">{{ mensagem() }}</p>
    <div class="acao"><ng-content select="[slot=acao]" /></div>
  `,
  styles: `
    :host {
      display: grid;
      justify-items: center;
      gap: var(--esp-3);
      padding: var(--esp-6) var(--esp-4);
      text-align: center;
      border: 1px dashed var(--borda-forte);
      border-radius: var(--raio-g);
      background: var(--aurora-brilho), var(--superficie);
    }
    .marca {
      font-family: var(--fonte-mono);
      font-size: var(--fs-2xl);
      font-weight: 700;
    }
    .chaves {
      background: var(--acento-degrade);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
    }
    .nulo {
      color: var(--texto);
    }
    .cursor {
      color: var(--acento-suave);
      animation: piscar 1s steps(1) infinite;
    }
    .frase {
      margin: 0;
      max-width: 48ch;
      color: var(--texto-suave);
    }
    .acao:empty {
      display: none;
    }
    @keyframes piscar {
      50% {
        opacity: 0;
      }
    }
  `,
})
export class VazioComponent {
  /** Frase que explica por que está vazio (e o que fazer). */
  readonly mensagem = input.required<string>();
}
