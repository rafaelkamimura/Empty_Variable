import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from "@angular/core";
import { IconeComponent } from "./icone.component";
import { iconeDoItem, tomDe } from "./visual";

/**
 * Endereço da imagem do item no Betel (a API busca na Divine Pride e guarda em cache, D41).
 * Relativo ao `<base href>`, para valer também quando o sistema fica numa sub-rota.
 */
export function urlImagemItem(idJogo: number | null | undefined, ilustracao = false): string | null {
  if (idJogo === null || idJogo === undefined || !Number.isInteger(idJogo) || idJogo < 1) return null;
  return `api/imagens/item/${idJogo}${ilustracao ? "?tipo=ilustracao" : ""}`;
}

/** Remove apenas os pixels quase brancos alcançáveis a partir da borda. */
export function limparFundoBranco(pixels: ImageData): boolean {
  const { data, width, height } = pixels;
  const fila = new Int32Array(width * height);
  const visitado = new Uint8Array(width * height);
  let total = 0;
  let alterou = false;
  const visitar = (x: number, y: number) => {
    const pixel = y * width + x;
    if (visitado[pixel]) return;
    visitado[pixel] = 1;
    const i = pixel * 4;
    const temFundo = (data[i] ?? 0) >= 245 && (data[i + 1] ?? 0) >= 245 && (data[i + 2] ?? 0) >= 245;
    if (data[i + 3] === 0 || temFundo) {
      if (data[i + 3] !== 0) {
        data[i + 3] = 0;
        alterou = true;
      }
      fila[total++] = pixel;
    }
  };
  for (let x = 0; x < width; x++) {
    visitar(x, 0);
    visitar(x, height - 1);
  }
  for (let y = 1; y < height - 1; y++) {
    visitar(0, y);
    visitar(width - 1, y);
  }
  for (let i = 0; i < total; i++) {
    const pixel = fila[i] ?? 0;
    const x = pixel % width;
    const y = Math.floor(pixel / width);
    if (x > 0) visitar(x - 1, y);
    if (x + 1 < width) visitar(x + 1, y);
    if (y > 0) visitar(x, y - 1);
    if (y + 1 < height) visitar(x, y + 1);
  }
  return alterou;
}

/**
 * Imagem do item (M14): o ícone do jogo quando o item tem ID; senão, ou se a imagem falhar,
 * o ícone desenhado com o tom do item. Decorativa: o nome do item sempre aparece ao lado.
 */
@Component({
  selector: "app-imagem-item",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [IconeComponent],
  template: `
    @if (url(); as u) {
      <img
        [src]="srcTratado() ?? u"
        (load)="tratar($event)"
        alt=""
        [width]="tamanho()"
        [height]="tamanho()"
        loading="lazy"
        decoding="async"
        (error)="imagemFalhou()"
      />
    } @else {
      <app-icone [nome]="icone()" [tamanho]="tamanho()" [traco]="1.4" [style.color]="tom()" />
    }
  `,
  styles: `
    :host {
      display: inline-grid;
      place-items: center;
      line-height: 0;
    }
    img {
      object-fit: contain;
      image-rendering: auto;
    }
  `,
})
export class ImagemItemComponent {
  readonly idJogo = input<number | null | undefined>(null);
  readonly nome = input.required<string>();
  readonly tipo = input<string | null>(null);
  readonly tamanho = input(24);
  /** Ilustração grande (coleção) em vez do ícone. */
  readonly ilustracao = input(false);

  readonly falhou = signal(false);
  readonly usarIcone = signal(false);
  private readonly tratada = signal<{ original: string; png: string } | null>(null);
  private readonly idDaArte = computed(
    () =>
      this.idJogo() ??
      (this.nome().trim().toLocaleLowerCase("pt-BR") === "fragmento de talento" ? 1000442 : null),
  );
  readonly url = computed(() =>
    this.falhou() ? null : urlImagemItem(this.idDaArte(), this.ilustracao() && !this.usarIcone()),
  );
  readonly srcTratado = computed(() => {
    const imagem = this.tratada();
    return imagem?.original === this.url() ? imagem?.png : null;
  });
  readonly icone = computed(() => iconeDoItem(this.nome(), this.tipo()));
  readonly tom = computed(() => tomDe(this.nome()));

  constructor() {
    // Outro item no mesmo componente (listas reaproveitadas): tenta a imagem de novo.
    effect(() => {
      this.idDaArte();
      this.ilustracao();
      this.falhou.set(false);
      this.usarIcone.set(false);
      this.tratada.set(null);
    });
  }

  imagemFalhou(): void {
    if (this.ilustracao() && !this.usarIcone()) this.usarIcone.set(true);
    else this.falhou.set(true);
  }

  tratar(evento: Event): void {
    const img = evento.target as HTMLImageElement;
    const original = this.url();
    const { naturalWidth: w, naturalHeight: h } = img;
    if (!original || img.getAttribute("src") !== original || !w || !h || w * h > 1_000_000) return;
    const canvas = img.ownerDocument.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const contexto = canvas.getContext("2d");
    if (!contexto) return;
    try {
      contexto.drawImage(img, 0, 0);
      const pixels = contexto.getImageData(0, 0, w, h);
      if (!limparFundoBranco(pixels)) return;
      contexto.putImageData(pixels, 0, 0);
      this.tratada.set({ original, png: canvas.toDataURL() });
    } catch {
      // A imagem original continua visível se o navegador não permitir ler os pixels.
    }
  }
}
