// Catálogo vivo de shared/ui (docs/frontend/diretrizes.md §8.2): tipos e regras puras.
import type { Type } from "@angular/core";

/** Níveis do Atomic Design (§3.3), na ordem em que aparecem no catálogo. */
export const NIVEIS = ["tokens", "atomo", "molecula", "organismo", "template"] as const;
export type NivelCatalogo = (typeof NIVEIS)[number];

export const ROTULO_NIVEL: Record<NivelCatalogo, string> = {
  tokens: "Tokens",
  atomo: "Átomos",
  molecula: "Moléculas",
  organismo: "Organismos",
  template: "Templates",
};

/**
 * Uma entrada do catálogo. `carregar` devolve um componente standalone que mostra o componente
 * real em todas as variantes e estados (padrão, desabilitado, carregando, erro, texto longo).
 */
export interface EntradaCatalogo {
  /** Identificador na URL (/dev/catalogo/<id>), em kebab-case. Ex.: "resumo". */
  readonly id: string;
  /** Nome exibido. Para componentes, o seletor: "ui-resumo", "button[uiBotao]". */
  readonly nome: string;
  readonly nivel: NivelCatalogo;
  /** Uma frase: o que o componente faz. */
  readonly descricao: string;
  readonly carregar: () => Promise<Type<unknown>>;
}

export interface GrupoCatalogo {
  readonly nivel: NivelCatalogo;
  readonly rotulo: string;
  readonly entradas: readonly EntradaCatalogo[];
}

/** Agrupa as entradas por nível, na ordem de NIVEIS e por nome dentro do nível; omite níveis vazios. */
export function agruparPorNivel(entradas: readonly EntradaCatalogo[]): GrupoCatalogo[] {
  return NIVEIS.map((nivel) => ({
    nivel,
    rotulo: ROTULO_NIVEL[nivel],
    entradas: entradas.filter((e) => e.nivel === nivel).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
  })).filter((g) => g.entradas.length > 0);
}

/** A entrada do id pedido; sem id (ou id desconhecido), a primeira do catálogo. */
export function entradaSelecionada(
  entradas: readonly EntradaCatalogo[],
  id: string | undefined,
): EntradaCatalogo | undefined {
  return entradas.find((e) => e.id === id) ?? agruparPorNivel(entradas)[0]?.entradas[0];
}
