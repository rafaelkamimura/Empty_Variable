import { Pipe, type PipeTransform } from "@angular/core";

/** "1234" → "1.234 pts" (pt-BR, diretrizes §6.5). null/undefined viram "—". */
export function formatarPontos(valor: number | null | undefined): string {
  return valor == null ? "—" : `${valor.toLocaleString("pt-BR")} pts`;
}

/** Pontos em pt-BR com o sufixo "pts". Na tela, use junto de `tabular-nums` (§2.3). */
@Pipe({ name: "pontos" })
export class PontosPipe implements PipeTransform {
  transform(valor: number | null | undefined): string {
    return formatarPontos(valor);
  }
}
