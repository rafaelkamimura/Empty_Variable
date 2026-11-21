// T-46: Nebula ponta a ponta — o admin valida, precifica e abre a receita e estoca os materiais;
// o membro vê "pode solicitar", passa o mouse nos detalhes e solicita trazendo a peça; o admin entrega;
// uma segunda solicitação é rejeitada com motivo e os pontos voltam.
import { type Page, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const ADMIN = { discordId: "900000000000000001", username: "admin-e2e" };
const EVA = { discordId: "900000000000000021", username: "eva-e2e" };
const POD = "Armadura Nebulosa POD";

async function entrar(page: Page, u: { discordId: string; username: string }): Promise<void> {
  await page.context().clearCookies();
  const r = await page.request.post("/api/auth/dev-login", { data: u, headers: { Origin: ORIGEM } });
  expect(r.status()).toBe(204);
}

async function json<T>(page: Page, metodo: "get" | "post" | "patch", url: string, data?: object): Promise<T> {
  const r = await page.request[metodo](url, {
    ...(data === undefined ? {} : { data }),
    headers: { Origin: ORIGEM },
  });
  expect(r.ok(), `${metodo.toUpperCase()} ${url} → ${r.status()} ${await r.text()}`).toBe(true);
  return (r.status() === 204 ? undefined : await r.json()) as T;
}

test.describe.serial("Nebula", () => {
  test("preparação: receita aberta, materiais para duas e Eva vinculada com 600 pontos", async ({ page }) => {
    await entrar(page, ADMIN);
    const receitas = await json<{ id: string; nome: string }[]>(page, "get", "/api/receitas");
    const pod = receitas.find((r) => r.nome === POD)!;
    await json(page, "post", `/api/receitas/${pod.id}/precos`, { precoComPeca: 450, precoTrazendoPeca: 300 });
    await json(page, "patch", `/api/receitas/${pod.id}`, { ativa: true });

    const itens = await json<{ id: string; nome: string }[]>(page, "get", "/api/itens");
    for (const [nome, qtd] of [
      ["Fragmento de Meteorito", 100],
      ["Pó de Meteorito do Poder", 60],
      ["Alma de Betelgeuse", 20],
    ] as const) {
      const id = itens.find((i) => i.nome === nome)!.id;
      await json(page, "patch", `/api/itens/${id}`, { negociavel: true, vinculadoConta: false });
      await json(page, "post", "/api/estoque/entradas", { itemId: id, quantidade: qtd });
    }

    const jogador = await json<{ id: string; personagens: { id: string }[] }>(
      page,
      "post",
      "/api/jogadores",
      {
        apelido: "Eva",
        personagens: ["Eva-MTK"],
      },
    );
    const classes = await json<{ apelidoGrupo: string; funcoes: { id: string }[] }[]>(
      page,
      "get",
      "/api/classes",
    );
    const mtk = classes.find((c) => c.apelidoGrupo === "MTK")!.funcoes[0]!.id;
    await json(page, "post", "/api/runs", {
      data: "2026-11-15",
      chefe: "BETELGEUSE_75",
      status: "CONCLUIDA",
      participantes: [{ personagemId: jogador.personagens[0]!.id, funcaoId: mtk }],
    });
    await entrar(page, EVA);
    const sol = await json<{ id: string }>(page, "post", "/api/vinculo/solicitacoes", {
      jogadorId: jogador.id,
    });
    await entrar(page, ADMIN);
    await json(page, "post", `/api/vinculo/solicitacoes/${sol.id}/aprovar`, {});
  });

  test("Eva vê os detalhes e solicita trazendo a peça; o admin entrega", async ({ page }) => {
    await entrar(page, EVA);
    await page.goto("/nebula");
    await expect(page.getByTestId("saldo-topo")).toContainText("600 pts");
    const cartao = page.getByRole("button", { name: `Ver ${POD}` });
    await expect(cartao).toContainText("Pode solicitar");
    // O cartão já traz preço e disponibilidade de cada modalidade (antes ficava numa dica no hover).
    await expect(cartao).toContainText("300 pts · 2 disponível(is)");
    await cartao.click();
    // Sem Armadura Astral no estoque, a tela já começa em "trago minha peça".
    await expect(page.getByRole("switch", { name: /Trago minha Armadura Astral/ })).toBeChecked();
    await expect(page.getByTestId("materiais")).toContainText("100/50");
    await page.getByRole("button", { name: "Solicitar" }).click();
    await expect(page.getByText("Solicitação registrada")).toBeVisible();
    await expect(page.getByTestId("saldo-topo")).toContainText("300 pts");

    await page.goto("/nebula/solicitacoes");
    await expect(page.getByTestId("solicitacoes")).toContainText("Aguardando entrega");

    await entrar(page, ADMIN);
    await page.goto("/admin/nebula");
    await expect(page.getByTestId("solicitacoes")).toContainText("Eva");
    await expect(page.getByTestId("solicitacoes")).toContainText("50× Fragmento de Meteorito");
    await page.getByRole("button", { name: "Entreguei os materiais" }).click();
    await expect(page.getByText("Entrega registrada.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entreguei os materiais" })).toHaveCount(0);
  });

  test("a segunda é rejeitada com motivo e os pontos voltam", async ({ page }) => {
    await entrar(page, EVA);
    await page.goto("/nebula");
    await page.getByRole("button", { name: `Ver ${POD}` }).click();
    await page.getByRole("button", { name: "Solicitar" }).click();
    await expect(page.getByTestId("saldo-topo")).toContainText("0 pts");

    await entrar(page, ADMIN);
    await page.goto("/admin/nebula");
    // O motivo é pedido no próprio cartão (antes era um window.prompt).
    await page.getByRole("button", { name: "Rejeitar" }).click();
    await page.getByRole("textbox", { name: "Motivo da rejeição" }).fill("Guardião ausente esta semana");
    await page.getByRole("button", { name: "Confirmar rejeição" }).click();
    await expect(page.getByText("Solicitação rejeitada")).toBeVisible();

    await entrar(page, EVA);
    await page.goto("/nebula/solicitacoes");
    await expect(page.getByTestId("solicitacoes")).toContainText("Rejeitada");
    await expect(page.getByTestId("solicitacoes")).toContainText("Guardião ausente esta semana");
    await expect(page.getByTestId("saldo-topo")).toContainText("300 pts");
  });
});
