import { DOCUMENT } from "@angular/common";
import { ChangeDetectionStrategy, Component, inject } from "@angular/core";

interface GrupoTokens {
  readonly titulo: string;
  readonly tipo: "cor" | "espaco" | "raio" | "fonte";
  readonly tokens: readonly string[];
}

const GRUPOS: readonly GrupoTokens[] = [
  {
    titulo: "Superfícies",
    tipo: "cor",
    tokens: ["--fundo", "--superficie", "--cartao", "--elevado", "--borda", "--borda-forte", "--borda-campo"],
  },
  { titulo: "Texto", tipo: "cor", tokens: ["--texto-forte", "--texto", "--texto-suave", "--texto-apagado"] },
  {
    titulo: "Acento",
    tipo: "cor",
    tokens: ["--acento", "--acento-suave", "--acento-degrade", "--acento-fundo", "--destaque", "--aurora"],
  },
  { titulo: "Estados", tipo: "cor", tokens: ["--sucesso", "--alerta", "--erro", "--info"] },
  {
    titulo: "Tons de identidade",
    tipo: "cor",
    tokens: ["--tom-orquidea", "--tom-violeta", "--tom-lavanda", "--tom-azul", "--tom-menta", "--tom-nevoa"],
  },
  {
    titulo: "Espaçamento",
    tipo: "espaco",
    tokens: ["--esp-1", "--esp-2", "--esp-3", "--esp-4", "--esp-5", "--esp-6", "--esp-7"],
  },
  { titulo: "Raio", tipo: "raio", tokens: ["--raio-p", "--raio-m", "--raio-g", "--raio-total"] },
  {
    titulo: "Tamanhos de fonte",
    tipo: "fonte",
    tokens: ["--fs-xs", "--fs-s", "--fs-m", "--fs-l", "--fs-xl", "--fs-2xl"],
  },
];

/** Exemplos do catálogo: os tokens de styles/_tokens.scss, com o valor calculado de cada um. */
@Component({
  selector: "app-tokens-catalogo",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (grupo of grupos; track grupo.titulo) {
      <section class="grupo" [attr.aria-labelledby]="'grupo-' + $index">
        <h3 [id]="'grupo-' + $index">{{ grupo.titulo }}</h3>
        <ul class="lista">
          @for (token of grupo.tokens; track token) {
            <li class="token" data-testid="catalogo-token">
              @switch (grupo.tipo) {
                @case ("cor") {
                  <span class="amostra" [style.background]="'var(' + token + ')'"></span>
                }
                @case ("espaco") {
                  <span class="barra" [style.width]="'var(' + token + ')'"></span>
                }
                @case ("raio") {
                  <span class="amostra contorno" [style.border-radius]="'var(' + token + ')'"></span>
                }
                @case ("fonte") {
                  <span class="texto-exemplo" [style.font-size]="'var(' + token + ')'"
                    >Torre da Constelação</span
                  >
                }
              }
              <code class="nome">{{ token }}</code>
              <span class="valor">{{ valores.get(token) }}</span>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-6);
    }
    h3 {
      margin: 0 0 var(--esp-3);
      font-size: var(--fs-l);
      color: var(--texto-forte);
    }
    .lista {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: var(--esp-3);
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .token {
      display: grid;
      gap: var(--esp-1);
      padding: var(--esp-3);
      background: var(--cartao);
      border: 1px solid var(--borda);
      border-radius: var(--raio-g);
    }
    .amostra {
      height: var(--esp-7);
      border-radius: var(--raio-m);
      border: 1px solid var(--borda-forte);
    }
    .contorno {
      background: var(--elevado);
    }
    .barra {
      display: block;
      height: var(--esp-3);
      background: var(--acento);
      border-radius: var(--raio-p);
    }
    .texto-exemplo {
      color: var(--texto);
      line-height: 1.3;
    }
    .nome {
      font-family: var(--fonte-mono);
      font-size: var(--fs-s);
      color: var(--texto);
    }
    .valor {
      font-family: var(--fonte-mono);
      font-size: var(--fs-xs);
      color: var(--texto-apagado);
      overflow-wrap: anywhere;
    }
  `,
})
export class TokensCatalogoComponent {
  protected readonly grupos = GRUPOS;
  /** Valor calculado de cada token na raiz do documento (vazio se os estilos globais não carregaram). */
  protected readonly valores: ReadonlyMap<string, string>;

  constructor() {
    const raiz = inject(DOCUMENT).documentElement;
    const estilo = getComputedStyle(raiz);
    this.valores = new Map(
      GRUPOS.flatMap((g) => g.tokens).map((t) => [t, estilo.getPropertyValue(t).trim()]),
    );
  }
}
