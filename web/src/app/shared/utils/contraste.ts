// Contraste de cor (WCAG 2.x) para cores que vêm de dados, e não dos tokens: o componente não
// escolhe a cor, só garante que ela continua legível sobre a superfície em que aparece.

export type Rgb = readonly [r: number, g: number, b: number];

/** Lê `#RGB` ou `#RRGGBB` (com ou sem `#`). Qualquer outra coisa devolve null. */
export function lerHex(cor: string): Rgb | null {
  const hex = cor.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return null;
  const cheio = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return [
    Number.parseInt(cheio.slice(0, 2), 16),
    Number.parseInt(cheio.slice(2, 4), 16),
    Number.parseInt(cheio.slice(4, 6), 16),
  ];
}

export function emHex([r, g, b]: Rgb): string {
  const par = (n: number): string => Math.round(n).toString(16).padStart(2, "0");
  return `#${par(r)}${par(g)}${par(b)}`.toUpperCase();
}

/** Luminância relativa (WCAG 2.x), de 0 (preto) a 1 (branco). */
export function luminancia([r, g, b]: Rgb): number {
  const canal = (v: number): number => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/** Razão de contraste entre duas cores, de 1 a 21. */
export function contraste(a: Rgb, b: Rgb): number {
  const la = luminancia(a);
  const lb = luminancia(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

const PASSOS = 20;

/**
 * A cor mais próxima da pedida que atinge o contraste mínimo sobre o fundo: clareia em direção ao
 * branco num fundo escuro, ou escurece em direção ao preto num fundo claro, só o quanto precisar.
 * Cor ou fundo que não sejam hex voltam como vieram.
 *
 * @param cor Cor do texto, em hex.
 * @param fundo Cor da superfície, em hex.
 * @param minimo Razão mínima (4,5 para texto normal, WCAG 1.4.3).
 */
export function corLegivel(cor: string, fundo: string, minimo = 4.5): string {
  const rgb = lerHex(cor);
  const rgbFundo = lerHex(fundo);
  if (rgb === null || rgbFundo === null) return cor;
  if (contraste(rgb, rgbFundo) >= minimo) return emHex(rgb);
  const alvo = luminancia(rgbFundo) < 0.5 ? 255 : 0;
  for (let passo = 1; passo <= PASSOS; passo++) {
    const t = passo / PASSOS;
    const misturada: Rgb = [
      rgb[0] + (alvo - rgb[0]) * t,
      rgb[1] + (alvo - rgb[1]) * t,
      rgb[2] + (alvo - rgb[2]) * t,
    ];
    if (contraste(misturada, rgbFundo) >= minimo) return emHex(misturada);
  }
  return emHex([alvo, alvo, alvo]);
}
