// T-23: login simulado → registro de run pelo assistente → saldo do membro → correção por estorno.
import { type Page, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const ADMIN = { discordId: "900000000000000001", username: "admin-e2e" };
/** Sufixo por execução: o teste pode rodar de novo no mesmo banco. */
const N = String(Date.now()).slice(-6);
const MEMBRO = { discordId: `9000000003${N}`, username: `ana-e2e-${N}` };
const [ANA, BETO, XAVI] = [`Ana${N}`, `Beto${N}`, `Xavi${N}`];
const headers = { Origin: ORIGEM };

async function entrar(page: Page, u: { discordId: string; username: string }): Promise<void> {
  await page.context().clearCookies();
  const r = await page.request.post("/api/auth/dev-login", { data: u, headers });
  expect(r.status()).toBe(204);
}

/** Escolhe uma opção num <select> nativo (assistente de run) pelo rótulo (n-ésimo, se houver vários). */
async function selecionar(page: Page, rotulo: string, opcao: string, n = 0): Promise<void> {
  await page.getByRole("combobox", { name: rotulo }).nth(n).selectOption({ label: opcao });
}

/** O stepper só mostra o passo atual: há um único "Próximo" visível por vez. */
async function proximo(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Próximo" }).click();
}

test.describe.serial("Fluxo completo de uma run", () => {
  let runId = "";

  test("preparação: admin cadastra jogadores; Ana se vincula e o admin aprova", async ({ page }) => {
    // Pela API: as telas de cadastro de jogadores e de vínculo têm os próprios testes.
    await entrar(page, ADMIN);
    const jogadores: Record<string, string> = {};
    for (const [apelido, personagens] of [
      [ANA, [`${ANA}-MTK`]],
      [BETO, [`${BETO}-GX`]],
      [XAVI, []],
    ] as const) {
      const r = await page.request.post("/api/jogadores", { data: { apelido, personagens }, headers });
      expect(r.status(), await r.text()).toBe(201);
      jogadores[apelido] = ((await r.json()) as { id: string }).id;
    }
    await entrar(page, MEMBRO);
    const pedido = await page.request.post("/api/vinculo/solicitacoes", {
      data: { jogadorId: jogadores[ANA] },
      headers,
    });
    expect(pedido.status(), await pedido.text()).toBe(201);
    await entrar(page, ADMIN);
    const pendentes = (await (
      await page.request.get("/api/vinculo/solicitacoes?status=PENDENTE")
    ).json()) as {
      id: string;
      jogador: { id: string } | null;
    }[];
    const daAna = pendentes.find((x) => x.jogador?.id === jogadores[ANA]);
    expect(daAna).toBeDefined();
    const aprovar = await page.request.post(`/api/vinculo/solicitacoes/${daAna!.id}/aprovar`, { headers });
    expect(aprovar.status()).toBe(200);
  });

  test("admin registra a run pelo assistente, com prévia dos pontos (T-20)", async ({ page }) => {
    await entrar(page, ADMIN);
    await page.goto("/gestao/runs/nova");
    await expect(page.getByRole("heading", { name: "Nova run", level: 1 })).toBeVisible();

    // 1. Dados: padrão (hoje, Naght, concluída)
    await proximo(page);

    // 2. Participantes. Só com o teclado: o Tab chega no "Próximo"; com pendência, Enter não avança
    // e o foco vai ao primeiro campo inválido, já com o erro.
    const personagem = page.getByRole("combobox", { name: "Personagem" }).first();
    const proximoVisivel = page.getByRole("button", { name: "Próximo" });
    await personagem.focus();
    for (let i = 0; i < 15 && !(await proximoVisivel.evaluate((b) => b === document.activeElement)); i++) {
      await page.keyboard.press("Tab");
    }
    await expect(proximoVisivel).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(personagem).toBeFocused();
    await expect(personagem).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("alert").filter({ hasText: "Escolha o personagem." })).toBeVisible();
    await selecionar(page, "Personagem", `${ANA}-MTK`, 0);
    await selecionar(page, "Classe", "MTK", 0);
    await page.getByRole("button", { name: "Adicionar participante" }).click();
    await selecionar(page, "Personagem", `${BETO}-GX`, 1);
    await selecionar(page, "Classe", "GX", 1);
    await proximo(page);

    // 3. Empréstimo para o Beto: Xavi emprestou uma arma (Essencial, 20%)
    await page.getByRole("button", { name: "Adicionar empréstimo" }).nth(1).click(); // 2º participante (Beto)
    await selecionar(page, "Emprestado por", XAVI);
    await page.getByLabel("Descrição do item").fill("Arma emprestada");
    await selecionar(page, "Categoria", "Essencial (20%)");
    await proximo(page);

    // 4. Drops: nenhum
    await proximo(page);

    // 5. Revisão com a prévia calculada pelo motor
    const ganho = page.getByTestId("runs-ganho-por-jogador");
    await expect(ganho).toContainText(`${ANA}: 300 pts`);
    await expect(ganho).toContainText(`${BETO}: 160 pts`);
    await expect(ganho).toContainText(`${XAVI}: 40 pts`);
    await page.getByRole("button", { name: "Registrar run" }).click();

    await expect(page).toHaveURL(/\/gestao\/runs\/[0-9a-f-]{36}$/);
    runId = page.url().split("/").pop() ?? "";
    await expect(page.getByTestId("runs-participacoes")).toContainText(`${ANA}-MTK`);
    await expect(page.getByText("Soma: 500 pts")).toBeVisible();
  });

  // A Minha área (/me) e a correção de run ainda não foram liberadas (core/telas-liberadas.ts):
  // sem elas, estes dois testes não têm tela para abrir. Voltam quando as telas forem liberadas.
  test.fixme("membro vê o próprio saldo e o histórico detalhado (T-22, D14)", async ({ page }) => {
    await entrar(page, MEMBRO);
    await page.goto("/");
    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByTestId("saldo")).toHaveText("300");
    await expect(page.getByTestId("historico")).toContainText(`${ANA}-MTK · MTK (Padrão) · rank 5`);

    // CT-E4: membro não acessa a área de runs (a tela redireciona e a API recusa)
    await page.goto("/admin/runs");
    await expect(page).toHaveURL(/\/me$/);
    expect((await page.request.get("/api/runs")).status()).toBe(403);
  });

  test.fixme("admin corrige a run: estorna e registra de novo (US-07, T-21)", async ({ page }) => {
    await entrar(page, ADMIN);
    // Entra pela URL antiga do detalhe: redireciona para a Gestão mantendo o id (CT-136)
    await page.goto(`/admin/runs/${runId}`);
    await expect(page).toHaveURL(new RegExp(`/gestao/runs/${runId}$`));
    await page.getByRole("link", { name: "Corrigir" }).click();
    await expect(page.getByRole("heading", { name: "Corrigir run" })).toBeVisible();

    // A Ana estava de Cardeal (rank 3), não de MTK.
    await page.getByLabel("Motivo da correção").fill("Ana jogou de Cardeal");
    await proximo(page);
    await selecionar(page, "Classe", "Cardeal", 0);
    for (let i = 0; i < 3; i++) await proximo(page);
    await expect(page.getByTestId("runs-ganho-por-jogador")).toContainText(`${ANA}: 200 pts`);
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
