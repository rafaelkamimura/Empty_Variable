// Copia do projeto adsonpleal/latam-ro-calc (licença MIT, Copyright (c) 2026 Adson Leal) o motor de
// cálculo e os dados que `src/index.ts` usa. Os arquivos vão para `vendor/latam-ro-calc/` sem
// alteração, com a licença ao lado, e os dados para `dados/latam-ro-calc.json.gz`.
//
// Uso (a partir de packages/motor-latam), com um clone do projeto em que os dados já foram gerados
// (`node tools/build-web-data.mjs` dentro do clone):
//   node scripts/sincronizar.mjs /caminho/do/clone/latam-ro-calc
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const PACOTE = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const VENDOR = join(PACOTE, "vendor", "latam-ro-calc");
const DADOS = join(PACOTE, "dados", "latam-ro-calc.json.gz");

/** Arquivos do projeto de origem que `src/index.ts` importa; o resto vem pelas importações deles. */
const ENTRADAS = [
  "mcp/src/engine/derive.ts",
  "mcp/src/engine/preset.ts",
  "mcp/src/data/class-registry.ts",
  "src/app/core/calculator.ts",
  "src/app/core/calculator-controller.ts",
  "src/app/core/option-scripts.ts",
  "src/app/core/custom-attachments.ts",
  "src/app/core/share-codec.ts",
  "src/app/constants/job-buffs.ts",
  "src/app/core/bonus-key-label.ts",
  "src/app/constants/item-type.enum.ts",
  "src/app/constants/monster-i18n.ts",
  "src/app/skills/index.ts",
  "src/app/utils/index.ts",
];

/**
 * Configuração do site de origem (endereços e chaves dos serviços dele). Não é copiada: o motor só
 * lê `production`, que `src/ambiente.ts` fornece no lugar.
 */
const AMBIENTE_DA_ORIGEM = "src/environments/environment";

/** Arquivos de dados gerados pelo projeto de origem → chave no pacote de dados. */
const ARQUIVOS_DE_DADOS = {
  itens: "items-core.json",
  monstros: "monsters.json",
  hpSp: "hpsp.json",
  classes: "classes.json",
  itensSemRegistro: "latam-extra.json",
};

const IMPORTACAO =
  /(?:import|export)\s[^;]*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

/**
 * Resolve uma importação do projeto de origem para o arquivo no disco.
 * @param {string} origem Raiz do clone
 * @param {string} de Arquivo que importa
 * @param {string} alvo Texto da importação
 * @returns {string | null} Caminho do arquivo, ou null para a configuração do site, que não é copiada
 */
function resolver(origem, de, alvo) {
  let base;
  if (alvo === AMBIENTE_DA_ORIGEM) return null;
  if (alvo.startsWith("src/")) base = join(origem, alvo);
  else if (alvo.startsWith(".")) base = resolve(dirname(de), alvo);
  else throw new Error(`${relative(origem, de)} importa o pacote externo "${alvo}".`);
  for (const candidato of [base, `${base}.ts`, join(base, "index.ts"), `${base}.json`]) {
    if (existsSync(candidato) && statSync(candidato).isFile()) return candidato;
  }
  throw new Error(`${relative(origem, de)} importa "${alvo}", que não foi encontrado.`);
}

/**
 * Junta as entradas e tudo o que elas importam, direta ou indiretamente.
 * @param {string} origem Raiz do clone
 * @returns {string[]} Caminhos relativos ao clone, em ordem alfabética
 */
function fechamento(origem) {
  const vistos = new Set();
  const fila = ENTRADAS.map((entrada) => join(origem, entrada));
  while (fila.length > 0) {
    const arquivo = fila.pop();
    if (vistos.has(arquivo)) continue;
    vistos.add(arquivo);
    if (arquivo.endsWith(".json")) continue;
    const fonte = readFileSync(arquivo, "utf8");
    for (const achado of fonte.matchAll(IMPORTACAO)) {
      const importado = resolver(origem, arquivo, achado[1] ?? achado[2] ?? achado[3]);
      if (importado !== null) fila.push(importado);
    }
  }
  return [...vistos].map((arquivo) => relative(origem, arquivo)).sort();
}

const origem = process.argv[2] ? resolve(process.argv[2]) : null;
if (origem === null || !existsSync(join(origem, "LICENSE"))) {
  console.error("Informe a pasta de um clone de adsonpleal/latam-ro-calc.");
  process.exit(1);
}
const commit = execFileSync("git", ["-C", origem, "rev-parse", "HEAD"], { encoding: "utf8" }).trim();

rmSync(VENDOR, { recursive: true, force: true });
const arquivos = fechamento(origem);
for (const arquivo of arquivos) {
  const destino = join(VENDOR, arquivo);
  mkdirSync(dirname(destino), { recursive: true });
  cpSync(join(origem, arquivo), destino);
}
for (const aviso of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) {
  if (existsSync(join(origem, aviso))) cpSync(join(origem, aviso), join(VENDOR, aviso));
}

const dados = { origem: { repositorio: "https://github.com/adsonpleal/latam-ro-calc", commit } };
for (const [chave, arquivo] of Object.entries(ARQUIVOS_DE_DADOS)) {
  const caminho = join(origem, "src", "assets", "data", arquivo);
  if (!existsSync(caminho)) {
    console.error(`Falta ${caminho}: rode "node tools/build-web-data.mjs" no clone.`);
    process.exit(1);
  }
  dados[chave] = JSON.parse(readFileSync(caminho, "utf8"));
}
mkdirSync(dirname(DADOS), { recursive: true });
writeFileSync(DADOS, gzipSync(JSON.stringify(dados), { level: 9 }));

console.log(`${arquivos.length} arquivos do commit ${commit} em ${relative(PACOTE, VENDOR)}.`);
console.log(`Dados: ${relative(PACOTE, DADOS)} (${statSync(DADOS).size} bytes).`);
