// Pendências de formulários em passos (diretrizes §6.4): cada uma diz o campo e como corrigir.
// Puro (sem Angular): as regras em features/x/data devolvem estes tipos. Quando mostrar os erros e
// para onde levar o foco ficam em shared/ui/formulario/validacao-passos.ts.

export interface Pendencia {
  /** Campo com o problema (`data-campo` do controle), ou o nome da lista quando não há campo. */
  readonly campo: string;
  /** Como corrigir, para aparecer junto do campo ("Escolha o personagem."). */
  readonly mensagem: string;
  /** De qual linha é ("Participante 2"), para o resumo do passo. */
  readonly contexto?: string;
}

/** Pendências de cada passo de um formulário em passos. */
export type PendenciasPorPasso<P extends string> = Readonly<Record<P, readonly Pendencia[]>>;

/** Texto da pendência no resumo do passo: "Participante 2: escolha a classe." */
export function textoPendencia(p: Pendencia): string {
  if (p.contexto === undefined) return p.mensagem;
  return `${p.contexto}: ${p.mensagem.charAt(0).toLowerCase()}${p.mensagem.slice(1)}`;
}
