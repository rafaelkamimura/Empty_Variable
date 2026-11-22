// Rascunho de run do nag4eyes: chega pela integração, o gestor revisa pelas telas de runs,
// confirma pelo assistente pré-preenchido (pontua) ou descarta (não pontua).
import { type APIResponse, type Page, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const ADMIN = { discordId: "900000000000000001", username: "admin-rascunho" };
/** Sufixo por execução: o teste pode rodar de novo no mesmo banco (--repeat-each). */
const N = String(Date.now()).slice(-6);
const ANA = { discordId: `9000000001${N}`, username: `ana-rascunho-${N}` };
const GESTORA = { discordId: "900000000000000012", username: "gestora-rascunho" };
const TOKEN = "token-de-integracao-dos-testes-e2e-com-32-caracteres";
const GUILD = "910000000000000001";
const headers = { Origin: ORIGEM };
const PERSONAGEM = `Cardeal${N}`;

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

/** Envia um rascunho como o nag4eyes faria ao encerrar um grupo. */
function enviarRascunho(page: Page, idOrigem: string, participantes: object[]) {
  return ok<{ id: string; pendentes: number }>(
    page.request.post("/api/integracao/rascunhos-run", {
      headers: { Authorization: `Bearer ${TOKEN}` },
      data: {
        idOrigem,
        partyId: idOrigem.split(":")[1],
        guildId: GUILD,
        data: "2026-11-20",
        instancia: { nome: "Torre da Constelação", nomeIngles: "Constellation Tower" },
        participantes,
      },
    }),
    201,
  );
}

test("gestor revisa rascunhos do nag4eyes: confirma um pelo assistente e descarta outro", async ({
  page,
}) => {
  // Preparação pela API: Ana vinculada com um personagem; a gestora com o papel GESTOR.
  await entrar(page, ADMIN);
  const ana = await ok<{ id: string }>(
    page.request.post("/api/jogadores", {
      headers,
      data: { apelido: `AnaR${N}`, personagens: [PERSONAGEM] },
    }),
    201,
  );
  await entrar(page, ANA);
  await ok(page.request.post("/api/vinculo/solicitacoes", { headers, data: { jogadorId: ana.id } }), 201);
  await entrar(page, GESTORA);
  await entrar(page, ADMIN);
  const pendentes = await ok<{ id: string; jogador: { id: string } | null }[]>(
    page.request.get("/api/vinculo/solicitacoes?status=PENDENTE"),
    200,
  );
  const solicitacao = pendentes.find((s) => s.jogador?.id === ana.id);
  if (!solicitacao) throw new Error("Solicitação de vínculo da Ana não encontrada");
  await ok(page.request.post(`/api/vinculo/solicitacoes/${solicitacao.id}/aprovar`, { headers }), 200);
  const usuarios = await ok<{ id: string; discordUsername: string }[]>(
    page.request.get("/api/usuarios"),
    200,
  );
  const gestora = usuarios.find((u) => u.discordUsername === GESTORA.username);
  if (!gestora) throw new Error("Gestora não encontrada");
  await ok(page.request.patch(`/api/usuarios/${gestora.id}`, { headers, data: { papel: "GESTOR" } }), 200);

  const aConfirmar = await enviarRascunho(page, `party:${N}1`, [
    { discordId: ANA.discordId, personagem: PERSONAGEM, classe: { nome: "Cardeal", nomeIngles: "Cardinal" } },
    { discordId: "900000000000000099", personagem: "Ninguem", classe: { nome: "Cientista" } },
  ]);
  expect(aConfirmar.pendentes).toBe(1);
  const aDescartar = await enviarRascunho(page, `party:${N}2`, [
    { discordId: ANA.discordId, personagem: PERSONAGEM, classe: { nome: "Cardeal" } },
  ]);

  // A gestora chega às runs pelo menu do perfil, sem digitar endereço.
  await entrar(page, GESTORA);
  await page.goto("/");
  await expect(page).toHaveURL(/\/loja$/);
  await page.getByRole("button", { name: "Menu do perfil" }).click();
  await page.getByRole("menuitem", { name: "Runs" }).click();
  await expect(page).toHaveURL(/\/gestao\/runs$/);
  const rascunhos = page.getByTestId("runs-rascunhos");
  await expect(rascunhos.getByRole("row")).toHaveCount(3);
  await expect(rascunhos).toContainText("1 sem correspondência");

  // Descarta o segundo, confirmando no diálogo.
  await rascunhos
    .getByRole("row")
    .filter({ hasNotText: "sem correspondência" })
    .getByRole("button", { name: "Descartar" })
    .click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Descartar rascunho" }).click();
  await expect(page.getByText("Rascunho descartado.")).toBeVisible();
  await expect(rascunhos.getByRole("row")).toHaveCount(2);

  // Revisa o primeiro: o assistente abre com a data e a Ana; quem não casou aparece à parte.
  await rascunhos.getByRole("link", { name: "Revisar" }).click();
  await expect(page).toHaveURL(/\/gestao\/runs\/nova\?rascunho=/);
  const origem = page.getByTestId("runs-origem-rascunho");
  await expect(origem).toContainText(`Rascunho do nag4eyes (grupo ${N}1)`);
  await expect(origem).toContainText("Ninguem");
  await expect(origem).toContainText("Discord sem usuário neste sistema");
  await expect(page.getByLabel("Data")).toHaveValue("2026-11-20");
  // Cada passo do stepper tem o seu "Próximo"; clica no do painel ativo e espera o seguinte abrir.
  for (const [passo, seguinte] of [
    ["Dados da run", "Participantes"],
    ["Participantes", "Empréstimos"],
    ["Empréstimos", "Itens obtidos"],
    ["Itens obtidos", "Revisão"],
  ] as const) {
    await page.getByRole("tabpanel", { name: passo }).getByRole("button", { name: "Próximo" }).click();
    await expect(page.getByRole("tab", { selected: true })).toContainText(seguinte);
  }
  await expect(page.getByTestId("runs-ganho-por-jogador")).toContainText(`AnaR${N}`);
  await page.getByRole("button", { name: "Registrar run" }).click();

  // A run foi registrada, com o detalhe liberado e sem o botão da correção (tela não liberada).
  await expect(page).toHaveURL(/\/gestao\/runs\/[0-9a-f-]{36}$/);
  const runId = page.url().split("/").pop() ?? "";
  await expect(page.getByTestId("runs-participacoes")).toContainText(PERSONAGEM);
  await expect(page.getByRole("link", { name: "Corrigir" })).toHaveCount(0);
  await page.getByRole("link", { name: "Voltar à lista" }).click();
  await expect(page.getByTestId("runs-rascunhos")).toHaveCount(0);

  const confirmado = await ok<{ status: string; runId: string }>(
    page.request.get(`/api/rascunhos-run/${aConfirmar.id}`),
    200,
  );
  expect(confirmado).toEqual(expect.objectContaining({ status: "CONFIRMADO", runId }));
  const descartado = await ok<{ status: string; runId: string | null }>(
    page.request.get(`/api/rascunhos-run/${aDescartar.id}`),
    200,
  );
  expect(descartado).toEqual(expect.objectContaining({ status: "DESCARTADO", runId: null }));
  const extrato = await ok<{ saldo: number; lancamentos: { tipo: string; run: { id: string } | null }[] }>(
    page.request.get(`/api/extrato/${ana.id}`),
    200,
  );
  expect(extrato.lancamentos.filter((l) => l.run?.id === runId).map((l) => l.tipo)).toEqual(["PARTICIPACAO"]);
  expect(extrato.saldo).toBeGreaterThan(0);
});
