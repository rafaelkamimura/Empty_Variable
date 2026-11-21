import { defineConfig } from "@playwright/test";

const PORTA = Number(process.env["E2E_PORTA"] ?? 4310);
export const ORIGEM = `http://127.0.0.1:${PORTA}`;

/**
 * T-23: testes ponta a ponta. `servidor.mjs` sobe Postgres, API e frontend já compilados.
 * Usa o Google Chrome instalado na máquina (channel "chrome"), sem baixar navegadores.
 * No runner da VPS não há Chrome: o CI define E2E_CANAL=chromium e usa o Chromium do Playwright.
 */
export default defineConfig({
  testDir: "testes",
  // Só as telas liberadas nesta etapa: estoque e a revisão dos rascunhos de run do nag4eyes.
  testMatch: ["estoque.spec.ts", "rascunho-run.spec.ts"],
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: process.env["CI"] ? "list" : [["list"]],
  use: {
    baseURL: ORIGEM,
    channel: process.env["E2E_CANAL"] ?? "chrome",
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node servidor.mjs",
    url: `${ORIGEM}/api/saude`,
    timeout: 120_000,
    reuseExistingServer: false,
    stdout: "pipe",
    stderr: "pipe",
  },
});
