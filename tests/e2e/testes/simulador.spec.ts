// Simulação de dano (D57): um membro escolhe um chefe de referência da Torre, preenche o ataque e
// vê a estimativa, no computador e no celular.
import { type Page, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const MEMBRO = { discordId: "900000000000000571", username: "membro-simulador" };
const headers = { Origin: ORIGEM };

async function entrar(page: Page): Promise<void> {
  await page.context().clearCookies();
  const r = await page.request.post("/api/auth/dev-login", { data: MEMBRO, headers });
  expect(r.status()).toBe(204);
}

test("membro simula o dano contra um chefe da Torre e vê a estimativa", async ({ page }, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  const campo = (nome: string) => page.getByRole("spinbutton", { name: nome, exact: true });
  await entrar(page);
  await page.goto("/simulador");
  await expect(page.getByRole("heading", { name: "Simulação de dano", level: 1 })).toBeVisible();
  await expect(page.getByTestId("aviso-estimativa")).toContainText("estimativa");

  await page.locator('select[name="instancia"]').selectOption({ label: "Torre da Constelação (2)" });
  await page.locator('select[name="chefe"]').selectOption({ label: "Naght Sieger" });
  await expect(page.getByTestId("observacao-chefe")).toContainText("Andar 25");
  await expect(campo("DEF")).toHaveValue("410");
  await expect(campo("HP")).toHaveValue("300000000");

  await campo("Nível base").fill("250");
  await campo("FOR").fill("200");
  await campo("% da habilidade").fill("1000");
  await campo("Acertos").fill("5");
  await campo("ATQ base da arma").fill("300");
  await page.getByRole("button", { name: "Simular" }).click();

  const resultado = page.getByTestId("resultado");
  await expect(resultado).toBeVisible();
  await expect(resultado).toContainText("Por uso (todos os acertos)");
  await expect(resultado).toContainText("Do HP informado (300.000.000)");
  await page.screenshot({ path: info.outputPath("simulador-desktop.png"), fullPage: true });

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(resultado).toBeVisible();
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largura).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("simulador-celular.png"), fullPage: true });
  expect(erros).toEqual([]);
});
