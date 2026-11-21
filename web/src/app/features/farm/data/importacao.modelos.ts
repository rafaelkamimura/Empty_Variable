// Importação do backup do artefato Diário de Instâncias (D54): regras puras.
import type { PersonagemFarm, ResultadoImportacao } from "./farm.modelos";

/** Check-ins por requisição: cada pedaço cabe com folga no limite do corpo da API. */
export const PEDACO_IMPORTACAO = 250;

/** Sugere, para cada personagem do artefato, o personagem do vínculo de mesmo nome. */
export function mapaSugerido(
  doArtefato: readonly { id: string; nome: string }[],
  meus: readonly PersonagemFarm[],
): Record<string, string> {
  const mapa: Record<string, string> = {};
  for (const p of doArtefato) {
    const igual = meus.find((m) => m.nome.toLowerCase() === p.nome.toLowerCase());
    if (igual) mapa[p.id] = igual.id;
  }
  return mapa;
}

export const RESULTADO_VAZIO: ResultadoImportacao = {
  itensCriados: 0,
  instanciasCriadas: 0,
  checkinsImportados: 0,
  checkinsJaImportados: 0,
  checkinsSemPersonagem: 0,
};

export function somarResultados(a: ResultadoImportacao, b: ResultadoImportacao): ResultadoImportacao {
  return {
    itensCriados: a.itensCriados + b.itensCriados,
    instanciasCriadas: a.instanciasCriadas + b.instanciasCriadas,
    checkinsImportados: a.checkinsImportados + b.checkinsImportados,
    checkinsJaImportados: a.checkinsJaImportados + b.checkinsJaImportados,
    checkinsSemPersonagem: a.checkinsSemPersonagem + b.checkinsSemPersonagem,
  };
}
