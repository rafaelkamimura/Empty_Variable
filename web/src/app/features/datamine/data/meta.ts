// Os "arquivos principais" do cliente num patch: o que mudou no GRF, no Ragexe e nas pastas soltas,
// em frases prontas para a tela.
import { formatarBytes, type MetaPatch, type PastaDoCliente } from "./relatorio.modelos";

export interface LinhaDoCliente {
  readonly rotulo: string;
  readonly valor: string;
}

const inteiro = (n: number): string => n.toLocaleString("pt-BR");

/** `2026-11-23 21:48:42` vira `23/11/2026 21:48`. Texto em outro formato volta como veio. */
export function dataHoraBr(tirado: string): string {
  const partes = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(tirado);
  if (partes === null) return tirado;
  const [, ano, mes, dia, hora, minuto] = partes;
  return `${dia}/${mes}/${ano} ${hora}:${minuto}`;
}

function contagemDaPasta(p: PastaDoCliente): string {
  const partes = [
    `${p.alterados.length} ${p.alterados.length === 1 ? "alterado" : "alterados"}`,
    `${p.novos.length} ${p.novos.length === 1 ? "novo" : "novos"}`,
    `${p.removidos.length} ${p.removidos.length === 1 ? "removido" : "removidos"}`,
  ];
  return partes.join(", ");
}

/**
 * As linhas do quadro "arquivos principais": os dois snapshots comparados, o data.grf (tamanho,
 * quantidade de arquivos e se foi reempacotado), o Ragexe.exe e cada pasta solta. Só entram as
 * linhas que o relatório trouxe.
 */
export function linhasDoCliente(meta: MetaPatch): LinhaDoCliente[] {
  const linhas: LinhaDoCliente[] = [];
  if (meta.snapshotAntes?.tirado && meta.snapshotDepois?.tirado) {
    linhas.push({
      rotulo: "Comparação",
      valor: `cliente de ${dataHoraBr(meta.snapshotAntes.tirado)} com o de ${dataHoraBr(meta.snapshotDepois.tirado)}`,
    });
  }
  if (meta.grfAntes !== null && meta.grfDepois !== null) {
    const tamanho = `${formatarBytes(meta.grfAntes.tamanho)} → ${formatarBytes(meta.grfDepois.tamanho)}`;
    const entradas = `${inteiro(meta.grfAntes.entradas)} → ${inteiro(meta.grfDepois.entradas)} arquivos`;
    const reempacotado = meta.grfReempacotado ? " (tabela movida: GRF reempacotado)" : "";
    linhas.push({ rotulo: "data.grf", valor: `${tamanho}, ${entradas}${reempacotado}` });
  }
  if (meta.ragexeAntes !== null && meta.ragexeDepois !== null) {
    linhas.push({
      rotulo: "Ragexe.exe",
      valor: meta.ragexeNovo
        ? `executável novo: ${formatarBytes(meta.ragexeAntes.tamanho)} → ${formatarBytes(meta.ragexeDepois.tamanho)}`
        : "inalterado",
    });
  }
  for (const pasta of meta.pastas) linhas.push({ rotulo: pasta.nome, valor: contagemDaPasta(pasta) });
  return linhas;
}
