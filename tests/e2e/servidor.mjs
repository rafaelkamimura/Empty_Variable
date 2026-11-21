// Sobe o ambiente dos testes e2e: Postgres → migrations → API → frontend estático com proxy de /api.
// Pré-requisito: `pnpm build` (usa backend/dist e web/dist).
// - Com TEST_DATABASE_URL: usa esse banco (vazio). Sem ele: Postgres local com os binários do embedded-postgres.
// - A API sobe com AUTH_DEV_LOGIN=true (login simulado) e cookies sem Secure (HTTP local).
import { execFileSync, spawn } from "node:child_process";
import {
  cpSync,
  createReadStream,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import http from "node:http";
import net from "node:net";
import { createRequire } from "node:module";
import { arch, platform, tmpdir } from "node:os";
import { dirname, extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(aqui, "..", "..");
const require = createRequire(import.meta.url);
const EXE = platform() === "win32" ? ".exe" : "";
const PORTA_WEB = Number(process.env.E2E_PORTA ?? 4310);
const PORTA_API = PORTA_WEB + 1;
const ORIGEM = `http://127.0.0.1:${PORTA_WEB}`;
const WEB = join(raiz, "web", "dist", "web", "browser");
const API = join(raiz, "backend", "dist", "main.js");

for (const caminho of [WEB, API]) {
  if (!existsSync(caminho)) {
    console.error(`Falta ${caminho}. Rode "pnpm build" antes dos testes e2e.`);
    process.exit(1);
  }
}

const limpezas = [];
function encerrar(codigo = 0) {
  for (const f of limpezas.reverse()) {
    try {
      f();
    } catch {
      /* segue encerrando */
    }
  }
  process.exit(codigo);
}
process.on("SIGINT", () => encerrar(0));
process.on("SIGTERM", () => encerrar(0));

async function bancoLocal() {
  const pacote = `@embedded-postgres/${platform() === "win32" ? "windows" : platform()}-${arch()}`;
  const { pg_ctl } = await import(pacote);
  const nativo = dirname(dirname(pg_ctl));
  const versao = JSON.parse(readFileSync(join(nativo, "..", "package.json"), "utf8")).version;
  // Caminho curto: o initdb falha com caminhos acima de 260 caracteres no Windows.
  const bin = join(tmpdir(), `betel-pg-${versao}`);
  if (!existsSync(join(bin, "bin", `pg_ctl${EXE}`))) cpSync(nativo, bin, { recursive: true });
  // Restos de execuções interrompidas (o Playwright encerra este processo à força).
  for (const nome of readdirSync(tmpdir())) {
    if (nome.startsWith("emptyvariable-e2e-")) rmSync(join(tmpdir(), nome), { recursive: true, force: true });
  }
  const pasta = mkdtempSync(join(tmpdir(), "emptyvariable-e2e-"));
  const dados = join(pasta, "dados");
  const porta = 56_000 + Math.floor(Math.random() * 3_000);
  execFileSync(
    join(bin, "bin", `initdb${EXE}`),
    ["-D", dados, "-U", "betel", "--auth=trust", "-E", "UTF8", "--no-locale"],
    {
      stdio: "pipe",
    },
  );
  // Filho direto (sem pg_ctl): assim o Postgres morre junto com a árvore de processos quando o
  // Playwright encerra o servidor, em vez de ficar órfão.
  const pg = spawn(
    join(bin, "bin", `postgres${EXE}`),
    ["-D", dados, "-p", String(porta), "-c", "listen_addresses=127.0.0.1"],
    {
      stdio: "ignore",
    },
  );
  limpezas.push(() => pg.kill());
  await aguardarPorta(porta);
  return `postgresql://betel@127.0.0.1:${porta}/postgres`;
}

async function aguardarPorta(porta, limiteMs = 30_000) {
  const inicio = Date.now();
  while (Date.now() - inicio < limiteMs) {
    const ok = await new Promise((resolver) => {
      const s = net.connect(porta, "127.0.0.1");
      s.once("connect", () => {
        s.destroy();
        resolver(true);
      });
      s.once("error", () => resolver(false));
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Postgres não respondeu na porta ${porta}.`);
}

const databaseUrl = process.env.TEST_DATABASE_URL || (await bancoLocal());
execFileSync(
  process.execPath,
  [
    require.resolve("prisma/build/index.js"),
    "migrate",
    "deploy",
    "--schema",
    "../database/prisma/schema.prisma",
  ],
  {
    cwd: join(raiz, "backend"),
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: "pipe",
  },
);

const api = spawn(process.execPath, [API], {
  cwd: join(raiz, "backend"),
  env: {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: databaseUrl,
    PORT: String(PORTA_API),
    APP_ORIGIN: ORIGEM,
    SESSION_SECRET: "segredo-dos-testes-e2e-com-mais-de-32-caracteres",
    COOKIE_SECURE: "false",
    AUTH_DEV_LOGIN: "true",
    ADMIN_DISCORD_IDS: "900000000000000001",
    // Integração com o nag4eyes (rascunhos de run): token de serviço e servidor do Discord atendido.
    INTEGRACAO_TOKEN: "token-de-integracao-dos-testes-e2e-com-32-caracteres",
    DISCORD_GUILD_ID: "910000000000000001",
  },
  stdio: ["ignore", "inherit", "inherit"],
});
limpezas.push(() => api.kill());
api.on("exit", (codigo) => {
  console.error(`A API encerrou (código ${codigo}).`);
  encerrar(1);
});

const TIPOS = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};

const servidor = http.createServer((req, res) => {
  const url = req.url ?? "/";
  if (url.startsWith("/api/")) {
    const proxy = http.request(
      { host: "127.0.0.1", port: PORTA_API, path: url, method: req.method, headers: req.headers },
      (r) => {
        res.writeHead(r.statusCode ?? 502, r.headers);
        r.pipe(res);
      },
    );
    proxy.on("error", () => {
      res.writeHead(502);
      res.end("API indisponível");
    });
    req.pipe(proxy);
    return;
  }
  // Arquivos estáticos; rotas do Angular caem no index.html (SPA).
  const caminho = normalize(join(WEB, decodeURIComponent(url.split("?")[0] ?? "/")));
  const arquivo =
    caminho.startsWith(WEB) && existsSync(caminho) && statSync(caminho).isFile()
      ? caminho
      : join(WEB, "index.html");
  res.writeHead(200, { "Content-Type": TIPOS[extname(arquivo)] ?? "application/octet-stream" });
  createReadStream(arquivo).pipe(res);
});
servidor.listen(PORTA_WEB, "127.0.0.1", () => console.log(`e2e: ${ORIGEM} (API em ${PORTA_API})`));
limpezas.push(() => servidor.close());
