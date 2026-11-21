// Transferência de pontos entre jogadores: tipos e regras puras.

export interface Destinatario {
  id: string;
  apelido: string;
}

/** Pedido de transferência. O `id` vem do cliente e torna o envio idempotente (repetir não duplica). */
export interface PedidoTransferencia {
  id: string;
  destinatarioId: string;
  pontos: number;
}

/** Maior inteiro que a API aceita em pontos (int4). */
export const MAXIMO_PONTOS = 2_147_483_647;

/** Os pontos são um inteiro de 1 até o saldo (e até o limite da API). */
export function pontosValidos(pontos: number | null, saldo: number): boolean {
  return (
    pontos !== null && Number.isInteger(pontos) && pontos >= 1 && pontos <= Math.min(saldo, MAXIMO_PONTOS)
  );
}

/** Id da transferência no formato UUID v4. getRandomValues funciona também em HTTP na rede local. */
export function idTransferencia(
  aleatorio: (n: number) => Uint8Array = (n) => crypto.getRandomValues(new Uint8Array(n)),
): string {
  const bytes = aleatorio(16);
  bytes[6] = ((bytes[6] ?? 0) & 15) | 64;
  bytes[8] = ((bytes[8] ?? 0) & 63) | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}
