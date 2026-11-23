// Leitura do valor de controles de formulário a partir do evento (input, change), sem mutação.

/** Valor do `input`, `select` ou `textarea` que disparou o evento. */
export function valorDoEvento(evento: Event): string {
  const alvo = evento.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
  return alvo?.value ?? "";
}

/** Número digitado num campo: vazio ou inválido é null. */
export function numeroOuNulo(texto: string): number | null {
  if (texto.trim() === "") return null;
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

/** Número do controle que disparou o evento (vazio ou inválido é null). */
export function numeroDoEvento(evento: Event): number | null {
  return numeroOuNulo(valorDoEvento(evento));
}
