// D61: monta a interface do simulador de dano da latam-tools para ser servida pelo próprio sistema,
// em `web/public/simulador-latam/` (a tela /simulador a abre num iframe de mesma origem).
//
// Origem: https://github.com/adsonpleal/latam-ro-calc, licença MIT, Copyright (c) 2026 Adson Leal.
// A licença e os avisos de terceiros do projeto de origem vão junto com os arquivos gerados, e
// `origem.json` grava o commit e os ajustes aplicados. Nada do código de origem é alterado no
// disco: os ajustes abaixo entram só no empacotamento.
//
// O que NÃO é levado: a configuração do site de origem (endereços dos serviços dele e a chave do
// rastreador de problemas), o encurtador de links, o envio de gravações, o endereço do MCP, o
// histórico de novidades e as traduções para inglês e espanhol. Sem `--imagens`, a interface não
// pede nada a outro servidor (os ícones de itens e os sprites ficam ocultos).
//
// Uso, a partir da raiz do repositório, com um clone do projeto de origem no MESMO commit do motor
// (`packages/motor-latam`) e com as dependências dele instaladas (`pnpm install` dentro do clone):
//   node web/tools/montar-simulador-latam.mjs /caminho/do/clone/latam-ro-calc [--imagens <url>]
//
// `--imagens <url>`: servidor de onde vêm os ícones e sprites (formato do ragassets do projeto de
// origem). Precisa entrar também em `img-src` na política de segurança (Caddyfile e nginx).
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SAIDA = join(RAIZ, "web", "public", "simulador-latam");
const DADOS_DO_MOTOR = join(RAIZ, "packages", "motor-latam", "dados", "latam-ro-calc.json.gz");
const REPOSITORIO = "https://github.com/adsonpleal/latam-ro-calc";
/** Site público do simulador: só aparece no link de compartilhamento, que abre lá. */
const SITE_DE_ORIGEM = "https://simulador.latam-tools.com.br";

/** Dados que a interface em português não usa: outras línguas, o MCP e o histórico de novidades. */
const DADOS_DISPENSADOS = [
  "itemNamesEs",
  "itemNamesEn",
  "itemsDescEs",
  "itemsDescEn",
  "itemsDescMcp",
  "releaseHistory",
];

/** Endereços e chaves do site de origem que não podem aparecer nos arquivos gerados. */
const PROIBIDOS = [
  "assets.latam-tools.com.br",
  "short.latam-tools.com.br",
  "issues.latam-tools.com.br",
  "issues-latam-tools",
  "a.run.app",
  "AIza",
  "/mcp",
];

/**
 * Ajustes no código de origem, cada um com o trecho exato que troca. Um trecho que não aparece
 * exatamente uma vez interrompe a montagem: o código de origem mudou e o ajuste precisa ser revisto.
 * @param {string} imagens Servidor de imagens, ou texto vazio
 * @returns {{ arquivo: string, motivo: string, de: string, para: string }[]} Lista de ajustes
 */
function ajustes(imagens) {
  const semImagens = imagens
    ? []
    : [
        {
          arquivo: "src/react/views/content/item-search.tsx",
          motivo: "Sem servidor de imagens, a busca de itens não pede a figura do item à Divine Pride.",
          de: '{!vm.activeItem?.custom && <img className="item-search-collection"',
          para: '{false && <img className="item-search-collection"',
        },
      ];
  return [
    ...semImagens,
    {
      arquivo: "src/main.ts",
      motivo: "A interface roda numa sub-rota: a troca de endereço na abertura mantém o caminho.",
      de: "history.replaceState(history.state, '', `/${entry.search}${entry.hash || '#/'}`);",
      para: "history.replaceState(history.state, '', `${entry.pathname}${entry.search}${entry.hash || '#/'}`);",
    },
    {
      arquivo: "src/app/core/shorten-url.ts",
      motivo: "Sem encurtador: o link de compartilhamento fica no formato completo.",
      de: "  try {\n    const response = await fetch(`${shortenerUrl}/api/links`, {",
      para: "  if (!shortenerUrl) return url;\n  try {\n    const response = await fetch(`${shortenerUrl}/api/links`, {",
    },
    {
      arquivo: "src/react/state/calculator-session.ts",
      motivo: "O link de compartilhamento abre no site público do simulador, não neste sistema.",
      de: "return `${window.location.origin}${buildSharePath(token)}`;",
      para: `return \`${SITE_DE_ORIGEM}\${buildSharePath(token)}\`;`,
    },
    {
      arquivo: "src/react/controllers/custom-item-studio.ts",
      motivo: "O link de um item personalizado também abre no site público do simulador.",
      de: "const url = `${location.origin}/#/?customItem=${encodeCustomBundle(dependencies)}`;",
      para: `const url = \`${SITE_DE_ORIGEM}/#/?customItem=\${encodeCustomBundle(dependencies)}\`;`,
    },
    {
      arquivo: "src/react/services/locale.ts",
      motivo: "Só o português é levado: a pergunta de idioma da primeira visita não aparece.",
      de: "get chosen(): boolean { return isLocale(this.storage?.getItem(STORAGE_KEY)); }",
      para: "get chosen(): boolean { return true; }",
    },
    {
      arquivo: "src/react/services/assets.ts",
      motivo: "Sem servidor de imagens, ícones numéricos ficam sem endereço em vez de apontar para a raiz.",
      de: "  const key = String(id);\n",
      para: "  const key = String(id);\n  if (!environment.ragassetsUrl && /^\\d+$/.test(key)) return '';\n",
    },
    {
      arquivo: "src/react/services/assets.ts",
      motivo: "Sem servidor de imagens, o sprite do monstro fica sem endereço.",
      de: "return id == null || id === '' ? '' :",
      para: "return id == null || id === '' || !environment.ragassetsUrl ? '' :",
    },
    {
      arquivo: "src/react/services/assets.ts",
      motivo: "Sem servidor de imagens, o ícone trocado de um item personalizado fica sem endereço.",
      de: "  if (override) return `${environment.ragassetsUrl}/icons/item/${override}.png`;",
      para: "  if (override) return environment.ragassetsUrl ? `${environment.ragassetsUrl}/icons/item/${override}.png` : '';",
    },
    {
      arquivo: "src/app/domain/char-sprite-url.ts",
      motivo: "Sem servidor de imagens, o boneco do personagem fica sem endereço.",
      de: "  return `${RAGASSETS}/image?${p.toString()}`;",
      para: "  return RAGASSETS ? `${RAGASSETS}/image?${p.toString()}` : '';",
    },
    {
      arquivo: "src/app/domain/char-sprite-url.ts",
      motivo: "Sem servidor de imagens, o sprite da classe fica sem endereço.",
      de: "  return `${RAGASSETS}/image?job=${spriteJobId(Number(classId))}&action=0&headdir=0`;",
      para: "  return RAGASSETS ? `${RAGASSETS}/image?job=${spriteJobId(Number(classId))}&action=0&headdir=0` : '';",
    },
    {
      arquivo: "src/react/controllers/rotation-list.ts",
      motivo: "O ícone do ataque básico vinha de um endereço fixo do servidor de imagens de origem.",
      de: "export const BASIC_ATTACK_ICON = 'https://assets.latam-tools.com.br/maps/_u/4680d9e5597cb23d.png';",
      para: `export const BASIC_ATTACK_ICON = ${JSON.stringify(imagens ? `${imagens}/maps/_u/4680d9e5597cb23d.png` : "")};`,
    },
  ];
}

/**
 * Configuração que entra no lugar da do site de origem: nenhum serviço dele é usado.
 * @param {string} imagens Servidor de imagens, ou texto vazio
 * @returns {string} Módulo TypeScript
 */
function ambiente(imagens) {
  return `export const environment = {
  production: true,
  roBackendUrl: '',
  ragassetsUrl: ${JSON.stringify(imagens)},
  shortenerUrl: '',
  mcpUrl: '',
  issuesProjectId: '',
  issuesApiKey: '',
  issuesUrl: '',
};
`;
}

/**
 * Regras de estilo que escondem, dentro do sistema, o que depende dos serviços do site de origem
 * ou do que não foi levado: novidades, MCP, relato de problemas, envio de gravações e troca de língua.
 */
const ESTILO = `/* D61: partes do simulador de origem que dependem de serviços que este sistema não usa. */
.topbar-bell,
.topbar-locale,
.layout-topbar a.topbar-nav,
.topbar-actions > button.ui-button-help,
.topbar-menu-row--control,
a.topbar-menu-row,
.topbar-menu-list > button.topbar-menu-row:has(app-icon[style*="bell.svg"]),
.topbar-menu-list > button.topbar-menu-row:has(app-icon[style*="sparkles.svg"]),
.auto-cast-beta-actions {
  display: none !important;
}
/* Sem servidor de imagens os ícones ficam sem endereço: some a figura quebrada, o espaço continua. */
img[src=""],
img:not([src]) {
  visibility: hidden;
}
`;

/**
 * Página que carrega a interface. Sem <base>: os endereços são relativos à pasta em que ela é
 * servida, qualquer que seja a sub-rota do sistema. Sem script embutido, por causa de `script-src 'self'`.
 * @param {string} origem Conteúdo do index.html de origem (dele vem o estilo da tela de abertura)
 * @param {{ estilos: string[], modulos: string[], principal: string }} arquivos Arquivos gerados
 * @returns {string} HTML da página
 */
function pagina(origem, arquivos) {
  const estilo = /<style>[\s\S]*?<\/style>/.exec(origem)?.[0];
  if (!estilo) throw new Error("O index.html de origem não traz o estilo da tela de abertura.");
  const folhas = arquivos.estilos
    .map(
      (nome) =>
        `<link rel="preload" as="style" href="${nome}"><link rel="stylesheet" data-ro-styles media="print" href="${nome}">`,
    )
    .join("\n    ");
  const preloads = arquivos.modulos.map((nome) => `<link rel="modulepreload" href="${nome}">`).join("\n    ");
  return `<!doctype html>
<!-- Simulador de dano da latam-tools (adsonpleal/latam-ro-calc, licença MIT, Copyright (c) 2026 Adson Leal),
     montado por web/tools/montar-simulador-latam.mjs. Licença em LICENSE; commit e ajustes em origem.json. -->
<html lang="pt-BR" class="ro-booting">
  <head>
    <meta charset="utf-8" />
    <title>Simulador de dano</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="robots" content="noindex" />
    ${estilo}
    ${folhas}
    <link rel="stylesheet" href="ev.css">
    ${preloads}
  </head>
  <body>
    <div class="ro-splash" id="ro-splash">
      <div class="ro-splash-ring"></div>
      <div class="ro-splash-text">Carregando o simulador…</div>
    </div>
    <app-root></app-root>
    <script type="module" src="${arquivos.principal}"></script>
  </body>
</html>
`;
}

/**
 * Lê os argumentos da linha de comando.
 * @returns {{ clone: string, imagens: string }} Pasta do clone e servidor de imagens
 */
function argumentos() {
  const resto = process.argv.slice(2);
  const em = resto.indexOf("--imagens");
  const imagens = em < 0 ? "" : (resto.splice(em, 2)[1] ?? "").replace(/\/+$/, "");
  if (em >= 0 && !/^https:\/\/[a-z0-9.-]+(\/[\w./-]*)?$/i.test(imagens)) {
    throw new Error("--imagens pede um endereço https.");
  }
  if (resto.length !== 1) {
    throw new Error("Uso: node web/tools/montar-simulador-latam.mjs /caminho/do/clone [--imagens <url>]");
  }
  return { clone: resolve(resto[0]), imagens };
}

/**
 * Confere o clone: é o projeto de origem, está sem alterações e no mesmo commit dos dados do motor.
 * @param {string} clone Pasta do clone
 * @returns {string} Commit do clone
 */
function conferirClone(clone) {
  const pacote = join(clone, "package.json");
  if (!existsSync(pacote) || JSON.parse(readFileSync(pacote, "utf8")).name !== "ro-calculator") {
    throw new Error(`${clone} não é um clone de ${REPOSITORIO}.`);
  }
  if (!existsSync(join(clone, "node_modules", "esbuild"))) {
    throw new Error("Instale as dependências do clone antes (pnpm install dentro dele).");
  }
  const git = (...args) => execFileSync("git", ["-C", clone, ...args], { encoding: "utf8" }).trim();
  if (git("status", "--porcelain") !== "") throw new Error("O clone tem alterações locais.");
  const commit = git("rev-parse", "HEAD");
  const motor = JSON.parse(gunzipSync(readFileSync(DADOS_DO_MOTOR)).toString("utf8")).origem.commit;
  if (commit !== motor) {
    throw new Error(
      `O clone está em ${commit.slice(0, 7)} e o motor da API em ${motor.slice(0, 7)}. ` +
        "Use o mesmo commit (ou rode antes packages/motor-latam/scripts/sincronizar.mjs).",
    );
  }
  return commit;
}

/**
 * Gera os dados com a ferramenta do projeto de origem e tira os que a interface em português não usa.
 * @param {string} clone Pasta do clone
 */
function montarDados(clone) {
  const pasta = join(SAIDA, "assets", "data");
  mkdirSync(pasta, { recursive: true });
  execFileSync(process.execPath, [join(clone, "tools", "build-web-data.mjs"), "--hash", "--out", pasta], {
    cwd: clone,
    stdio: ["ignore", "ignore", "inherit"],
  });
  const arquivo = join(SAIDA, "assets", "data-manifest.json");
  const manifesto = JSON.parse(readFileSync(arquivo, "utf8"));
  for (const chave of DADOS_DISPENSADOS) {
    const nome = manifesto.files[chave];
    if (!nome) throw new Error(`O manifesto de dados não tem a chave "${chave}".`);
    rmSync(join(pasta, nome));
    delete manifesto.files[chave];
  }
  writeFileSync(arquivo, JSON.stringify(manifesto));
}

/**
 * Empacota a interface com o esbuild do clone, aplicando os ajustes e a configuração neutra.
 * @param {string} clone Pasta do clone
 * @param {string} imagens Servidor de imagens, ou texto vazio
 * @returns {Promise<{ estilos: string[], modulos: string[], principal: string }>} Arquivos gerados
 */
async function empacotar(clone, imagens) {
  const exigir = createRequire(join(clone, "package.json"));
  const { build } = exigir("esbuild");
  const { browserDataPlugin } = await import(pathToFileURL(join(clone, "tools", "browser-data.mjs")).href);
  const { startupOutputs } = await import(pathToFileURL(join(clone, "tools", "web-startup.mjs")).href);
  const porArquivo = new Map();
  for (const ajuste of ajustes(imagens)) {
    porArquivo.set(ajuste.arquivo, [...(porArquivo.get(ajuste.arquivo) ?? []), ajuste]);
  }
  const aplicados = new Set();
  const ajustar = {
    name: "ajustes-do-sistema",
    setup(construtor) {
      construtor.onLoad({ filter: /src[\\/]environments[\\/]environment\.ts$/ }, () => ({
        contents: ambiente(imagens),
        loader: "ts",
      }));
      for (const [arquivo, lista] of porArquivo) {
        const caminho = join(clone, arquivo);
        const filtro = new RegExp(`${arquivo.replace(/[/\\.]/g, (c) => (c === "." ? "\\." : "[\\\\/]"))}$`);
        construtor.onLoad({ filter: filtro }, (args) => {
          if (resolve(args.path) !== caminho) return null;
          let texto = readFileSync(caminho, "utf8");
          for (const ajuste of lista) {
            if (texto.split(ajuste.de).length !== 2) {
              throw new Error(
                `${arquivo}: o trecho do ajuste "${ajuste.motivo}" não aparece exatamente uma vez.`,
              );
            }
            texto = texto.replace(ajuste.de, () => ajuste.para);
            aplicados.add(ajuste);
          }
          return { contents: texto, loader: arquivo.endsWith(".tsx") ? "tsx" : "ts" };
        });
      }
    },
  };
  const resultado = await build({
    absWorkingDir: clone,
    entryPoints: { main: join(clone, "src/main.ts"), styles: join(clone, "src/styles.css") },
    outdir: SAIDA,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    minify: true,
    sourcemap: false,
    metafile: true,
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    entryNames: "[name].[hash]",
    chunkNames: "chunk-[hash]",
    assetNames: "media/[name].[hash]",
    legalComments: "external",
    plugins: [ajustar, browserDataPlugin(clone)],
    logLevel: "warning",
  });
  const faltando = ajustes(imagens).length - aplicados.size;
  if (faltando > 0) throw new Error(`${faltando} ajuste(s) não foram aplicados: o arquivo saiu do pacote.`);
  const saidas = Object.entries(resultado.metafile.outputs);
  const entrada = (ponto) => saidas.find(([, meta]) => meta.entryPoint === ponto);
  const principal = entrada("src/main.ts");
  const estilos = entrada("src/styles.css");
  const inicio = entrada("src/react/bootstrap.tsx");
  if (!principal || !estilos || !inicio) throw new Error("O pacote não gerou os arquivos de abertura.");
  const folhas = [estilos[0], ...(principal[1].cssBundle ? [principal[1].cssBundle] : [])];
  for (const [nome] of saidas) {
    if (nome.endsWith(".css") && !folhas.includes(nome)) rmSync(join(clone, nome));
  }
  const iniciais = startupOutputs(resultado.metafile.outputs, [principal[0], inicio[0], ...folhas]);
  return {
    estilos: folhas.map((nome) => basename(nome)),
    modulos: [...iniciais].filter((nome) => nome.endsWith(".js")).map((nome) => basename(nome)),
    principal: basename(principal[0]),
  };
}

/**
 * Garante que nenhum endereço ou chave do site de origem ficou nos arquivos gerados.
 * @param {string} imagens Servidor de imagens escolhido (liberado, se informado)
 */
function conferirSaida(imagens) {
  const liberado = imagens ? new URL(imagens).host : null;
  const proibidos = imagens ? PROIBIDOS : [...PROIBIDOS, "divine-pride.net/img"];
  for (const nome of readdirSync(SAIDA)) {
    if (!/\.(js|css|html)$/.test(nome)) continue;
    const texto = readFileSync(join(SAIDA, nome), "utf8");
    for (const proibido of proibidos) {
      if (proibido !== liberado && texto.includes(proibido)) {
        throw new Error(`${nome} ainda traz "${proibido}", do site de origem.`);
      }
    }
  }
}

const { clone, imagens } = argumentos();
const commit = conferirClone(clone);
rmSync(SAIDA, { recursive: true, force: true });
mkdirSync(SAIDA, { recursive: true });
montarDados(clone);
const arquivos = await empacotar(clone, imagens);
for (const pasta of ["icons", "layout"]) {
  cpSync(join(clone, "src", "assets", pasta), join(SAIDA, "assets", pasta), { recursive: true });
}
writeFileSync(join(SAIDA, "ev.css"), ESTILO);
writeFileSync(
  join(SAIDA, "index.html"),
  pagina(readFileSync(join(clone, "src", "index.html"), "utf8"), arquivos),
);
for (const nome of ["LICENSE", "THIRD_PARTY_NOTICES.md"]) cpSync(join(clone, nome), join(SAIDA, nome));
writeFileSync(
  join(SAIDA, "origem.json"),
  `${JSON.stringify(
    {
      repositorio: REPOSITORIO,
      commit,
      licenca: "MIT, Copyright (c) 2026 Adson Leal (ver LICENSE)",
      imagens: imagens || null,
      dadosDispensados: DADOS_DISPENSADOS,
      ajustes: ajustes(imagens).map(({ arquivo, motivo }) => ({ arquivo, motivo })),
    },
    null,
    2,
  )}\n`,
);
conferirSaida(imagens);
console.log(`Simulador montado em ${SAIDA} (commit ${commit.slice(0, 7)}).`);
