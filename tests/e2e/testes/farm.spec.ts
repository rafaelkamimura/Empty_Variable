// Diário de farm (D48–D54): o membro vinculado cadastra uma instância com um drop, faz o check-in
// (o card fica verde), vê os totais e importa o backup do artefato antigo.
import { type APIResponse, type Page, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const ADMIN = { discordId: "900000000000000001", username: "admin-farm" };
/** Sufixo por execução: o teste pode rodar de novo no mesmo banco. */
const N = String(Date.now()).slice(-6);
const LIA = { discordId: `9000000002${N}`, username: `lia-farm-${N}` };
const PERSONAGEM = `LiaFarm${N}`;
const headers = { Origin: ORIGEM };

async function entrar(page: Page, u: { discordId: string; username: string }): Promise<void> {
  await page.context().clearCookies();
  const r = await page.request.post("/api/auth/dev-login", { data: u, headers });
  expect(r.status()).toBe(204);
}

async function ok<T>(r: Promise<APIResponse>, status: number): Promise<T> {
  const resposta = await r;
  expect(resposta.status(), await resposta.text()).toBe(status);
  return (await resposta.json()) as T;
}

test("membro cadastra, faz o check-in, vê os totais e importa o backup do artefato", async ({ page }) => {
  // Preparação pela API: Lia vinculada a um jogador com um personagem.
  await entrar(page, ADMIN);
  const jogador = await ok<{ id: string }>(
    page.request.post("/api/jogadores", { headers, data: { apelido: `Lia${N}`, personagens: [PERSONAGEM] } }),
    201,
  );
  await entrar(page, LIA);
  await ok(page.request.post("/api/vinculo/solicitacoes", { headers, data: { jogadorId: jogador.id } }), 201);
  await entrar(page, ADMIN);
  const pendentes = await ok<{ id: string; jogador: { id: string } | null }[]>(
    page.request.get("/api/vinculo/solicitacoes?status=PENDENTE"),
    200,
  );
  const pedido = pendentes.find((s) => s.jogador?.id === jogador.id);
  if (!pedido) throw new Error("Solicitação de vínculo da Lia não encontrada");
  await ok(page.request.post(`/api/vinculo/solicitacoes/${pedido.id}/aprovar`, { headers }), 200);
  await entrar(page, LIA);

  await test.step("Cadastrar uma instância de 3 dias com um item e preço", async () => {
    await page.goto("/farm");
    await expect(page.getByRole("heading", { name: "Diário de farm", level: 1 })).toBeVisible();
    await page.getByRole("button", { name: "Ir para o cadastro" }).click();
    await page.getByRole("textbox", { name: "Nome da nova instância" }).fill("Cripta");
    await page.getByRole("combobox", { name: "Recarga da nova instância" }).selectOption("TRES_DIAS");
    await page.getByRole("button", { name: "Adicionar instância" }).click();
    await page.getByRole("combobox", { name: "Adicionar item aos drops" }).fill("Oridecon");
    await page.getByRole("combobox", { name: "Adicionar item aos drops" }).press("Enter");
    const preco = page.getByRole("textbox", { name: "Preço de Oridecon" }).first();
    await preco.fill("1,5kk");
    await preco.press("Tab");
    await expect(page.getByRole("textbox", { name: "Preço de Oridecon" }).first()).toHaveValue("1.500.000");
  });

  await test.step("Fazer o check-in com 2 drops: o card fica verde", async () => {
    await page.getByRole("tab", { name: "Hoje" }).click();
    await page.getByTestId("personagens-farm").getByRole("button", { name: PERSONAGEM }).click();
    const card = page.getByTestId("inst-Cripta");
    await card.getByRole("button", { name: "Check-in" }).click();
    await card.getByRole("button", { name: "Mais Oridecon" }).click();
    await card.getByRole("button", { name: "Mais Oridecon" }).click();
    await card.getByRole("button", { name: "Confirmar check-in" }).click();
    await expect(card.getByText("✓ Feita hoje")).toBeVisible();
    await expect(card).toHaveClass(/feita/);
    await expect(card.getByText("Oridecon ×2")).toBeVisible();
  });

  await test.step("Totais da semana mostram os itens e o valor", async () => {
    await page.getByRole("tab", { name: "Totais" }).click();
    await expect(page.getByTestId("total-itens")).toHaveText("2");
    await expect(page.getByTestId("total-zeny")).toHaveText("3kk");
  });

  await test.step("Importar o backup do artefato", async () => {
    const backup = {
      kind: "diario-instancias-backup",
      v: 1,
      exportadoEm: new Date().toISOString(),
      personagens: [{ id: "c1", nome: PERSONAGEM, classe: "" }],
      instancias: [{ id: "n1", nome: "Torre", recarga: "SEMANAL", personagens: ["c1"], drops: ["i1"] }],
      itens: [{ id: "i1", nome: "Elunium", precoZeny: 20000 }],
      checkins: [
        {
          id: "k1",
          personagem: "c1",
          instancia: "n1",
          nomeInstancia: "Torre",
          feitoEm: Date.now() - 30 * 86_400_000,
          drops: [{ item: "i1", quantidade: 3, nome: "Elunium" }],
        },
      ],
    };
    await page.getByRole("tab", { name: "Importar" }).click();
    await page.getByRole("textbox", { name: "Ou cole o texto do backup" }).fill(JSON.stringify(backup));
    await page.getByRole("button", { name: "Ler backup" }).click();
    await expect(page.getByTestId("previa-importacao")).toContainText("1 check-in(s)");
    await expect(page.getByRole("combobox", { name: `Personagem para ${PERSONAGEM}` })).toHaveValue(/.+/);
    await page.getByRole("button", { name: "Importar", exact: true }).click();
    await expect(page.getByTestId("resultado-importacao")).toContainText("1 check-in(s) importado(s)");
    await page.getByRole("button", { name: "Ver o dia" }).click();
    await expect(page.getByTestId("inst-Torre")).toBeVisible();
  });
});
