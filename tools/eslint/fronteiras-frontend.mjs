// Regra ESLint local: fronteiras entre camadas do frontend (docs/frontend/diretrizes.md §3.1).
// Resolve cada import relativo a partir do arquivo e confere a tabela de dependências.
// Imports de pacotes (@angular/*, @betel/*) não são conferidos aqui; HttpClient tem regra própria
// (no-restricted-imports em eslint.config.mjs).
import path from "node:path";

const RAIZ_APP = ["web", "src", "app"];

/**
 * Classifica um caminho absoluto dentro de web/src/app: { camada, feature?, parte? } ou null.
 * Acha web/src/app no próprio caminho (a última ocorrência), sem depender da pasta de onde o
 * ESLint foi chamado: rodar de dentro de web/, como alguns editores fazem, dá o mesmo resultado.
 */
export function classificar(caminhoAbsoluto) {
  const partes = path.resolve(caminhoAbsoluto).split(path.sep);
  let i = -1;
  for (let k = partes.length - RAIZ_APP.length; k >= 0; k--) {
    if (RAIZ_APP.every((p, j) => partes[k + j] === p)) {
      i = k + RAIZ_APP.length;
      break;
    }
  }
  if (i < 0) return null;
  const [topo, a, b] = partes.slice(i);
  if (topo === "shared") return { camada: "shared", parte: a };
  if (topo === "features") return { camada: "features", feature: a, parte: b };
  if (topo === "core" || topo === "layout") return { camada: topo };
  return { camada: "outro" };
}

/** Mensagem de violação para importar `alvo` a partir de `origem`, ou null quando permitido. */
export function violacao(origem, alvo) {
  if (!origem || !alvo) return null;
  const outraFeature = alvo.camada === "features" && alvo.feature !== origem.feature;

  if (origem.camada === "shared") {
    if (["core", "features", "layout"].includes(alvo.camada))
      return `shared/ não pode importar ${alvo.camada}/ (§3.1).`;
  }
  if (origem.camada === "core" && alvo.camada === "features") {
    return "core/ não pode importar features/ (§3.1).";
  }
  if (origem.camada === "features") {
    if (origem.parte === "componentes" && outraFeature) {
      return `Componente de ${origem.feature} não pode importar a feature ${alvo.feature} (§3.1).`;
    }
    if (origem.parte === "componentes" && ["core", "layout"].includes(alvo.camada)) {
      return `Componente de domínio não pode importar ${alvo.camada}/: recebe tudo por input() (§3.1, §4.2).`;
    }
    if (origem.parte === "paginas" && outraFeature && ["paginas", "componentes"].includes(alvo.parte)) {
      return `Página de ${origem.feature} não pode importar ${alvo.parte}/ de ${alvo.feature} (§3.1).`;
    }
    if (
      origem.parte === "data" &&
      alvo.camada === "features" &&
      ["paginas", "componentes"].includes(alvo.parte)
    ) {
      return `data/ não pode importar componentes nem páginas (§3.1).`;
    }
  }
  return null;
}

/** @type {import("eslint").ESLint.Plugin} */
export default {
  rules: {
    fronteiras: {
      meta: {
        type: "problem",
        docs: { description: "Fronteiras entre camadas do frontend (diretrizes §3.1)." },
        schema: [],
      },
      create(contexto) {
        const arquivo = contexto.filename;
        const origem = classificar(arquivo);
        if (!origem) return {};
        const conferir = (no, fonte) => {
          if (typeof fonte !== "string" || !fonte.startsWith(".")) return;
          const alvo = classificar(path.resolve(path.dirname(arquivo), fonte));
          const msg = violacao(origem, alvo);
          if (msg) contexto.report({ node: no, message: msg });
        };
        return {
          ImportDeclaration: (no) => conferir(no.source, no.source.value),
          ImportExpression: (no) => conferir(no.source, no.source.value),
          ExportNamedDeclaration: (no) => no.source && conferir(no.source, no.source.value),
          ExportAllDeclaration: (no) => conferir(no.source, no.source.value),
        };
      },
    },
  },
};
