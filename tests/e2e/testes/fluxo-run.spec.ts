// T-23: login simulado → registro de run pelo assistente → saldo do membro → correção por estorno.
import { type Page, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const ADMIN = { discordId: "900000000000000001", username: "admin-e2e" };
const MEMBRO = { discordId: "900000000000000002", username: "ana-e2e" };

async function entrar(page: Page, u: { discordId: string; username: string }): Promise<void> {
  const r = await page.request.post("/api/auth/dev-login", { data: u, headers: { Origin: ORIGEM } });
  expect(r.status()).toBe(204);
}

/** Escolhe uma opção num mat-select identificado pelo rótulo (n-ésimo, se houver vários). */
async function escolher(page: Page, rotulo: string, opcao: string, n = 0): Promise<void> {
  await page.getByRole("combobox", { name: rotulo }).nth(n).click();
  await page.getByRole("option", { name: opcao, exact: true }).click();
}

/** O stepper só mostra o passo atual: há um único "Próximo" visível por vez. */
async function proximo(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Próximo" }).click();
}

test.describe.serial("Fluxo completo de uma run", () => {
  let runId = "";

  test("preparação: admin cadastra jogadores; Ana se vincula e o admin aprova", async ({ page }) => {
    await entrar(page, ADMIN);
    const post = (url: string, data: object) => page.request.post(url, { data, headers: { Origin: ORIGEM } });
    for (const [apelido, personagens] of [
      ["Ana", ["Ana-MTK"]],
      ["Beto", ["Beto-GX"]],
      ["Xavi", []],
    ] as const) {
      expect((await post("/api/jogadores", { apelido, personagens })).status()).toBe(201);
    }

    await page.context().clearCookies();
    await entrar(page, MEMBRO);
    await page.goto("/");
    await expect(page).toHaveURL(/\/vinculo$/);
    await escolher(page, "Jogador", "Ana — Ana-MTK");
    await page.getByRole("button", { name: "Enviar solicitação" }).click();
    await expect(page.getByText("Solicitação em análise")).toBeVisible();

    await page.context().clearCookies();
    await entrar(page, ADMIN);
    await page.goto("/gestao/jogadores");
    await page.getByRole("button", { name: "Aprovar" }).click();
    await expect(page.getByText("Vínculo aprovado.")).toBeVisible();
  });

  test("admin registra a run pelo assistente, com prévia dos pontos (T-20)", async ({ page }) => {
    await entrar(page, ADMIN);
    await page.goto("/gestao/runs/nova");

    // 1. Dados: padrão (hoje, Naght, concluída)
    await proximo(page);

    // 2. Participantes
    await escolher(page, "Personagem", "Ana-MTK", 0);
    await escolher(page, "Classe", "MTK", 0);
    await page.getByRole("button", { name: "Adicionar participante" }).click();
    await escolher(page, "Personagem", "Beto-GX", 1);
    await escolher(page, "Classe", "GX", 1);
    await proximo(page);

    // 3. Empréstimo para o Beto: Xavi emprestou uma arma (Essencial, 20%)
    await page.getByRole("button", { name: "Adicionar empréstimo" }).nth(1).click(); // 2º participante (Beto)
    await escolher(page, "Emprestado por", "Xavi");
    await page.getByLabel("Descrição do item").fill("Arma emprestada");
    await escolher(page, "Categoria", "Essencial (20%)");
    await proximo(page);

    // 4. Drops: nenhum
    await proximo(page);

    // 5. Revisão com a prévia calculada pelo motor
    const ganho = page.getByTestId("runs-ganho-por-jogador");
    await expect(ganho).toContainText("Ana: 300");
    await expect(ganho).toContainText("Beto: 160");
    await expect(ganho).toContainText("Xavi: 40");
    await page.getByRole("button", { name: "Registrar run" }).click();

    await expect(page).toHaveURL(/\/gestao\/runs\/[0-9a-f-]{36}$/);
    runId = page.url().split("/").pop() ?? "";
    await expect(page.getByTestId("runs-participacoes")).toContainText("Ana-MTK");
    await expect(page.getByText("Soma: 500 pts")).toBeVisible();
  });

  test("membro vê o próprio saldo e o histórico detalhado (T-22, D14)", async ({ page }) => {
    await entrar(page, MEMBRO);
    await page.goto("/");
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByTestId("saldo")).toHaveText("300");
    await expect(page.getByTestId("historico")).toContainText("Ana-MTK · MTK (Padrão) · rank 5");

    // CT-E4: membro não acessa a área de runs (a tela redireciona e a API recusa)
    await page.goto("/admin/runs");
    await expect(page).toHaveURL(/\/me$/);
    expect((await page.request.get("/api/runs")).status()).toBe(403);
  });

  test("admin corrige a run: estorna e registra de novo (US-07, T-21)", async ({ page }) => {
    await entrar(page, ADMIN);
    // Entra pela URL antiga do detalhe: redireciona para a Gestão mantendo o id (CT-136)
    await page.goto(`/admin/runs/${runId}`);
    await expect(page).toHaveURL(new RegExp(`/gestao/runs/${runId}$`));
    await page.getByRole("link", { name: "Corrigir" }).click();
    await expect(page.getByRole("heading", { name: "Corrigir run" })).toBeVisible();

    // A Ana estava de Cardeal (rank 3), não de MTK.
    await page.getByLabel("Motivo da correção").fill("Ana jogou de Cardeal");
    await proximo(page);
    await escolher(page, "Classe", "Cardeal", 0);
    for (let i = 0; i < 3; i++) await proximo(page);
    await expect(page.getByTestId("runs-ganho-por-jogador")).toContainText("Ana: 200");
    await page.getByRole("button", { name: "Registrar correção" }).click();

    await expect(page).toHaveURL(/\/gestao\/runs\/[0-9a-f-]{36}$/);
    expect(page.url()).not.toContain(runId);
    await expect(page.getByText("Esta run corrige")).toBeVisible();

    await page.goto(`/gestao/runs/${runId}`);
    await expect(page.getByTestId("runs-resumo")).toContainText("Estornada");
    await expect(page.getByRole("link", { name: "Corrigir" })).toHaveCount(0);

    await page.context().clearCookies();
    await entrar(page, MEMBRO);
    await page.goto("/me");
    await expect(page.getByTestId("saldo")).toHaveText("200");
    await expect(page.getByTestId("historico")).toContainText("Estorno");
  });
});
