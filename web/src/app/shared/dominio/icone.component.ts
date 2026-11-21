import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

/** Forma de um ícone: um caminho ou um círculo (cx, cy, r), no quadro 24 × 24. */
type Forma = { d: string } | { c: readonly [number, number, number] };

/** Ícones de traço do design (mesma linguagem do mockup da loja). */
export const ICONES = {
  casa: [{ d: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" }],
  sacola: [{ d: "M5 7h14l-1 14H6z" }, { d: "M9 10V7a3 3 0 0 1 6 0v3" }],
  diamante: [{ d: "M7 3h10l4 6-9 12L3 9z" }, { d: "M3 9h18" }, { d: "M12 21 8.5 9 12 3l3.5 6z" }],
  carta: [
    { d: "M7 2.5h10a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z" },
    { c: [12, 10, 3] },
    { d: "M8.5 17h7" },
  ],
  brilho: [
    { d: "M11 3l1.7 5.3L18 10l-5.3 1.7L11 17l-1.7-5.3L4 10l5.3-1.7z" },
    { d: "M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z" },
  ],
  caixa: [{ d: "M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" }, { d: "M3 7.5 12 12l9-4.5" }, { d: "M12 12v9" }],
  carrinho: [{ d: "M3 4h2.5l2.2 11h10.6l2-8H6.3" }, { c: [9.5, 19.5, 1.3] }, { c: [17, 19.5, 1.3] }],
  etiqueta: [{ d: "M3 12V4.5A1.5 1.5 0 0 1 4.5 3H12l9 9-9 9z" }, { c: [7.5, 7.5, 1.3] }],
  espadas: [
    { d: "M14.5 17.5 3 6V3h3l11.5 11.5" },
    { d: "M13 19l6-6" },
    { d: "M16 16l4 4" },
    { d: "M9.5 17.5 21 6V3h-3L6.5 14.5" },
    { d: "M11 19l-6-6" },
    { d: "M8 16l-4 4" },
  ],
  moedas: [
    { d: "M12 3c4.4 0 8 1.3 8 3s-3.6 3-8 3-8-1.3-8-3 3.6-3 8-3z" },
    { d: "M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" },
    { d: "M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" },
  ],
  armazem: [{ d: "M3 9.5 12 3l9 6.5V21H3z" }, { d: "M7 21v-8h10v8" }, { d: "M7 17h10" }],
  recibo: [{ d: "M5 3h14v18l-2.5-1.5L14 21l-2-1.5-2 1.5-2.5-1.5L5 21z" }, { d: "M9 8h6" }, { d: "M9 12h6" }],
  usuarios: [
    { c: [9, 8, 3.2] },
    { d: "M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" },
    { d: "M16 4.8a3.2 3.2 0 0 1 0 6.4" },
    { d: "M18 14.3c1.8.7 3 2.7 3 5.7" },
  ],
  escudo: [{ d: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" }],
  ajustes: [
    { d: "M4 6h16" },
    { d: "M4 12h16" },
    { d: "M4 18h16" },
    { c: [15, 6, 2] },
    { c: [8, 12, 2] },
    { c: [16, 18, 2] },
  ],
  frasco: [
    { d: "M9 3h6" },
    { d: "M10 3v6L5 18a2 2 0 0 0 1.8 3h10.4A2 2 0 0 0 19 18l-5-9V3" },
    { d: "M7.5 14h9" },
  ],
  estrela: [{ d: "M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.6l-5.4 2.9 1.2-6-4.5-4.2 6.1-.7z" }],
  elo: [
    { d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" },
    { d: "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" },
  ],
  busca: [{ c: [11, 11, 7] }, { d: "M20.5 20.5 16 16" }],
  sair: [{ d: "M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" }, { d: "M10 8l-4 4 4 4" }, { d: "M6 12h10" }],
  chama: [{ d: "M12 3c1 3 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.6 2.2-4.6.2 2 1 3 2.3 3.1C11 8.5 10.4 6 12 3z" }],
  cristal: [{ d: "M12 2.5 17 8.5l-2 11.5-6 1.5-4.5-9z" }, { d: "M12 2.5 9 21.5" }, { d: "M4.5 12.5 17 8.5" }],
  po: [
    { d: "M3 19.5h18" },
    { d: "M5 19.5a7 7 0 0 1 14 0" },
    { c: [9, 8, 1.3] },
    { c: [13, 5.5, 1.3] },
    { c: [15.5, 9.5, 1.3] },
  ],
  armadura: [{ d: "M8 3h8l4 3-2 4.5-2-1V21H8V9.5l-2 1L4 6z" }, { d: "M10 3a2 2 0 0 0 4 0" }],
  ampulheta: [
    { d: "M6 3h12" },
    { d: "M6 21h12" },
    { d: "M7 3c0 5 5 6 5 9s-5 4-5 9" },
    { d: "M17 3c0 5-5 6-5 9s5 4 5 9" },
  ],
} as const satisfies Record<string, readonly Forma[]>;

export type NomeIcone = keyof typeof ICONES;

@Component({
  selector: "app-icone",
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg
      [attr.width]="tamanho()"
      [attr.height]="tamanho()"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="traco()"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      @for (f of formas(); track $index) {
        @if (ehCirculo(f)) {
          <svg:circle [attr.cx]="f.c[0]" [attr.cy]="f.c[1]" [attr.r]="f.c[2]" />
        } @else {
          <svg:path [attr.d]="f.d" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      line-height: 0;
    }
  `,
})
export class IconeComponent {
  readonly nome = input.required<NomeIcone>();
  readonly tamanho = input(20);
  readonly traco = input(1.6);
  readonly formas = computed<readonly Forma[]>(() => ICONES[this.nome()]);

  ehCirculo(f: Forma): f is { c: readonly [number, number, number] } {
    return "c" in f;
  }
}
