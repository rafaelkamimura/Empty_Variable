// Liberação incremental das telas: só estas rotas existem nesta etapa; as demais voltam ao início.

/**
 * Caminhos de rota (como em app.routes.ts) das telas liberadas. As de runs atendem a revisão dos
 * rascunhos do nag4eyes: lista (com os rascunhos pendentes), assistente (pré-preenchido pelo
 * rascunho) e detalhe (para onde o assistente leva depois do registro). A correção de run fica
 * de fora. O Diário de farm (D48) é a tela pessoal de check-in das instâncias. O simulador de dano
 * (D61) abre a build de um personagem no simulador completo, e a estimativa à mão (D57) continua
 * em "simulador/estimativa".
 */
export const TELAS_LIBERADAS: ReadonlySet<string> = new Set([
  "",
  "login",
  "loja",
  "carteira",
  "vinculo",
  "vinculo/aprovacoes",
  "gestao/grupos",
  "gestao/runs",
  "gestao/runs/nova",
  "gestao/runs/:id",
  "instancias-programadas",
  "farm",
  "simulador",
  "simulador/estimativa",
  "admin/estoque",
  "**",
]);

/**
 * true se o endereço (ex.: "/gestao/runs/abc/corrigir") cai numa tela liberada. Serve para não
 * mostrar links que levariam ao início. Segmentos ":param" valem qualquer valor; "**" não conta.
 */
export function telaLiberada(endereco: string): boolean {
  const segmentos = (endereco.split(/[?#]/)[0] ?? "").split("/").filter((s) => s !== "");
  for (const rota of TELAS_LIBERADAS) {
    if (rota === "**") continue;
    const partes = rota.split("/").filter((s) => s !== "");
    if (
      partes.length === segmentos.length &&
      partes.every((p, i) => p.startsWith(":") || p === segmentos[i])
    ) {
      return true;
    }
  }
  return false;
}
