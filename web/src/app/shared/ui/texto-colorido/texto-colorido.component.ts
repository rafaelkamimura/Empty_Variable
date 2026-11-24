import { DOCUMENT } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, input } from "@angular/core";
import { corLegivel } from "../../utils/contraste";

/** Um pedaço de texto com a cor que veio dos dados. Sem cor, usa a cor do texto em volta. */
export interface TrechoColorido {
  readonly texto: string;
  /** Cor em hex (`#RRGGBB`). Nula ou ausente: a cor padrão do texto. */
  readonly cor?: string | null;
}

interface TrechoPronto {
  readonly texto: string;
  readonly cor: string | null;
}

const TOKEN_DA_SUPERFICIE = "--cartao";
const superficiePorTema = new Map<string, string>();

/** O valor do token da superfície no tema atual, lido uma vez por tema. Vazio se o token não existe. */
function superficieDoTema(documento: Document): string {
  const raiz = documento.documentElement;
  const tema = raiz.getAttribute("data-tema") ?? "";
  const guardada = superficiePorTema.get(tema);
  if (guardada !== undefined) return guardada;
  const valor =
    documento.defaultView?.getComputedStyle(raiz).getPropertyValue(TOKEN_DA_SUPERFICIE).trim() ?? "";
  if (valor !== "") superficiePorTema.set(tema, valor);
  return valor;
}

/**
 * Uma linha de texto em trechos, cada um com a cor que veio dos dados (ex.: as cores das descrições
 * do jogo). A cor é do conteúdo, não da interface: por isso entra por estilo inline, e não por
 * token. O componente só a ajusta até o contraste de 4,5:1 sobre `--cartao`, no tema em uso
 * (diretrizes §7), mantendo o matiz. A cor aqui é ênfase do texto original, nunca o único sinal
 * de um estado.
 *
 * @nivel atomo
 */
@Component({
  selector: "ui-texto-colorido",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@for (t of prontos(); track $index) {
    <span [style.color]="t.cor">{{ t.texto }}</span>
  }`,
  styles: `
    :host {
      display: block;
      min-height: 1lh;
      overflow-wrap: anywhere;
      white-space: pre-wrap;
    }
  `,
})
export class TextoColoridoComponent {
  private readonly documento = inject(DOCUMENT);

  /** Os trechos da linha, na ordem de leitura. Lista vazia mostra uma linha em branco. */
  readonly trechos = input.required<readonly TrechoColorido[]>();

  protected readonly prontos = computed<TrechoPronto[]>(() => {
    const superficie = superficieDoTema(this.documento);
    return this.trechos().map((t) => ({
      texto: t.texto,
      cor: t.cor ? (superficie === "" ? t.cor : corLegivel(t.cor, superficie)) : null,
    }));
  });
}
