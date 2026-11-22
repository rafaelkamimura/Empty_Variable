// Simulação de dano (D57, D58): um membro escolhe um chefe da Torre, busca um monstro pelo nome,
// preenche o ataque e vê a estimativa, no computador e no celular.
// D59: com a build importada na ficha, o resultado traz os efeitos dos equipamentos e lista o que
// foi aplicado e o que foi ignorado.
// D61: /simulador abre o simulador completo (a interface da latam-tools servida pelo próprio
// sistema) com a build da ficha, aponta um chefe como alvo e grava a build mudada de volta na ficha.
// A estimativa à mão fica em /simulador/estimativa.
// D62: o membro cola um link de compartilhamento do simulador público e a build abre no simulador
// completo, sem vir de nenhuma ficha; gravar numa ficha pede confirmação.
import { type APIResponse, type Page, type Request, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const ADMIN = { discordId: "900000000000000001", username: "admin-simulador" };
const MEMBRO = { discordId: "900000000000000571", username: "membro-simulador" };
/** Sufixo por execução: o teste pode rodar de novo no mesmo banco. */
const N = String(Date.now()).slice(-6);
const SAGE = { discordId: `9000000059${N}`, username: `sage-simulador-${N}` };
const HUB = { discordId: `9000000061${N}`, username: `hub-simulador-${N}` };
const LINK = { discordId: `9000000062${N}`, username: `link-simulador-${N}` };
const headers = { Origin: ORIGEM };

/** D61: as únicas origens externas do simulador são as das imagens (as mesmas do `img-src`). */
const ORIGENS_DE_IMAGEM = ["https://assets.latam-tools.com.br", "https://www.divine-pride.net"];

/**
 * Diz se o pedido é uma imagem de uma das origens liberadas para o simulador.
 * @param pedido Pedido que o simulador fez para fora do sistema
 * @returns true só para imagem vinda de uma origem de `ORIGENS_DE_IMAGEM`
 */
function imagemLiberada(pedido: Request): boolean {
  return pedido.resourceType() === "image" && ORIGENS_DE_IMAGEM.includes(new URL(pedido.url()).origin);
}

/** Token do link https://short.latam-tools.com.br/Ukxuq4: Feiticeiro 105/50 com Lanças de Fogo nv. 10. */
const TOKEN_FEITICEIRO = [
  "N4Igzg1glgNjBiB7ATgWwK4wIYDUCmyYUiAdiAFwgDG6yyeJALiADTXZhgUAcbMeANzwwKARgAMAVjYArRACMAMoOEVJ4tmEbIxs",
  "hQGVtFAMxssAcyi6Qc.QEFLJtgKjNyovfJyu1bKE2tbAEkA9w0QABM8AA9AhQARGIoAdj50CDildKdwYTwqRjwIu0YIfWg4ChB4K",
  "HoAAgAhRBhGAF5WiVYQAHc8LAAHUjUAFnFxYw8QAAs.iIBZKAiI-jEATgAmYcmZrAjFRF6dcmH1sfGzNBQKYfVxE80pqGEIinXuV",
  "fFJ8yw0BjdT1ajNjyRCINzDZJjUSpEBYKhUABKUHMU3BH0.0hA-TwjH2AE8sC08dcHrsDgB1PqDMjkTaQzFgKZk7p2S5HTYANkBp",
  "IiB30j2er2GXNM4CZvO6TTBQq5DPFBwAoj9kP5zDLVhyeQcAAoMCJYUKc1YwyCwGANdAAM0tcwGFFAAGEDYxEFQDRFFuguORwg7.",
  "Kg-lAsBRwkFUIMiIxiHVbSQvSG2Arov0g1HEAmQA7EOGcYHgz62AjhMjiBmGgwilACuhUBn9IhMHVEJa6gAJPpCEh1d11JXIRhTD",
  "MAFUJUDAqANTZb2uQYPyaZp4RHMDHE67zbqA7wdXJyuIRyXo-Hk43W5jFirQcXbGXq5PLZqQl7-r.3vCrPM6EYXrq3kY.ffZBP2-",
  "MA6iHYQawzGc8DABhQLsKgnjfNgHWQLAAC88TqABVfpZx.DNFCwdB9QsONkJAIiSKwOoESwDAKP0OE0IDJhIILEAAHEYBQIMMzDP",
  "DECfLMSCoP40IXDM7AiegSFHEhtwRL1Bw47UDgIMCpmQL03HCSkBlIOpdWQS152Ia9qiwWosPrTA63lbo6lskQOPgQkqEM5yM045",
  "o8FQJyGxc8IAHkPRIAByUC1MODNbXMON-IaegsAyDiLVEqYpycrSoHDWLQRIFcUUYJyCAYXY8DrbQoGgEg1Q4gB9JjzDwBqakFRr",
  "62QMT6GQBqQiIeK.Mazi8lqAC2H5J4YAiJzsUqNK0MsSKjMQPy626VU6niA0xNivEtCrQk6jscMV0tI7JI4-R5pgXsMudVVYp.Kh",
  "Mo3GdSEKNC6zKuSoiygApLBuisqwOPJR4tBWDi7E4LBOH8OpUMQTgsv0dASFg3S2Dsfp.n4LKggiDGM1bGtUCe1yUG-BSVoAaTHR",
  "iCBcMS6ktFA6gATQbDN4m0-zDLPBosEYRh.AujrwiROqsoAOSgeQILqhh.JIARMAUtD5AJ-QnnMS0VSKDMlMZMDEB3fwIgphbwgV",
  "V7zfrOq6zxcMplILCN32IQDzYeAVXMcwVsd.rwmUNCIhWxJul53bt3JVxMvJdAQ7YEILpIVxtzJ1AKadji5i9I67pCL6YBIyqOKz",
  "AMStO-pjasl4OJ25AICR7Bo6bvB5CtS0msGeok3xlHzONpl.jARAIg9lsFgU7oUAgAhvLwa0GCDOpZddb9kAUjNgok0sOIVFw7uc",
  "pHaFg1XTIKEeOPwEhszqAT6ARoYOJLxBoku2-wgaVwvqRs0Ru4Q1JwBVu-cMhI-J-AzE1FAPUCD9UxsiDOWAGojiAjiBqohYFdQQ",
  "X1AaKCgzoJ.C1RgDV1i4PgWVAhyChpoIwWQhqxgqHdRoUgwaqCSGYPIcMbyaEXD-iuuEBqcw8Bji.g1AAiugFKFcQr8BrE5Xa35a",
  "w.gAL5mBvkIcoZpbR13IKAJAL9kSogzAqEgEpGjYHQvItgihTGMAzjLfYFUfbVFnFoHcVI37hH0OI8cVZvEGQsjULxN1hBBTYHAt",
  "hvUGoKhfEwQkfdag.A0Wwfo8MiA6IqDAb0ABtDQRSWDFNKSU8pGhpClIALoZKyVAHJei7SGMzEAxozRsYeJRiVeIDSl7XSwKZRgW",
  "Fdw2xxhEAQsdZpSlSuEPmFhSDNEQOYYk79LGYBalJL8DtbrmMsQcaxGE7GUUcc48wdRXFRHcX7bpwTqQ-VXEE-S9yOJEUsUZWchQ",
  "ChXHIJiQwKpaopxAL0.ipBZrxB0uYn4A46icQEfI9R6igA",
].join("");

async function entrar(page: Page, usuario = MEMBRO): Promise<void> {
  await page.context().clearCookies();
  const r = await page.request.post("/api/auth/dev-login", { data: usuario, headers });
  expect(r.status()).toBe(204);
}

async function ok<T>(r: Promise<APIResponse>, status: number): Promise<T> {
  const resposta = await r;
  expect(resposta.status(), await resposta.text()).toBe(status);
  return (await resposta.json()) as T;
}

/**
 * Prepara pela API um jogador vinculado ao usuário, com a build do link de exemplo importada na
 * ficha do personagem, e deixa a sessão desse usuário aberta.
 * @returns ID do personagem
 */
async function membroComBuild(
  page: Page,
  usuario: { discordId: string; username: string },
  personagem: string,
): Promise<string> {
  await entrar(page, ADMIN);
  const jogador = await ok<{ id: string }>(
    page.request.post("/api/jogadores", {
      headers,
      data: { apelido: personagem, personagens: [personagem] },
    }),
    201,
  );
  await entrar(page, usuario);
  await ok(page.request.post("/api/vinculo/solicitacoes", { headers, data: { jogadorId: jogador.id } }), 201);
  await entrar(page, ADMIN);
  const pendentes = await ok<{ id: string; jogador: { id: string } | null }[]>(
    page.request.get("/api/vinculo/solicitacoes?status=PENDENTE"),
    200,
  );
  const pedido = pendentes.find((s) => s.jogador?.id === jogador.id);
  if (!pedido) throw new Error("Solicitação de vínculo não encontrada");
  await ok(page.request.post(`/api/vinculo/solicitacoes/${pedido.id}/aprovar`, { headers }), 200);
  await entrar(page, usuario);
  const importada = await ok<{
    classeId: string;
    nivelBase: number;
    equipamentos: Record<string, { id: number; nome: string | null }>;
    atributos: object;
  }>(
    page.request.post("/api/vinculo/build-simulador", {
      headers,
      data: { link: `https://simulador.latam-tools.com.br/s/${TOKEN_FEITICEIRO}/` },
    }),
    200,
  );
  const ficha = (await fichas(page)).find((p) => p.nome === personagem);
  if (!ficha) throw new Error("Personagem não encontrado no vínculo");
  await ok(
    page.request.patch(`/api/vinculo/personagens/${ficha.id}`, {
      headers,
      data: {
        nome: personagem,
        classeId: importada.classeId,
        nivelBase: importada.nivelBase,
        build: "",
        equipamentos: Object.fromEntries(
          Object.entries(importada.equipamentos).map(([slot, item]) => [
            slot,
            { ...item, nome: item.nome ?? `Item ${item.id}` },
          ]),
        ),
        atributos: importada.atributos,
      },
    }),
    200,
  );
  return ficha.id;
}

/**
 * Leva o quadro do simulador ao topo da janela. A lista de uma caixa de seleção dele abre para
 * baixo, e o navegador não rola a página de fora para alcançar o que está dentro do quadro.
 */
async function mostrarQuadro(page: Page): Promise<void> {
  await page.getByTestId("quadro").evaluate((quadro) => quadro.scrollIntoView({ block: "start" }));
}

interface FichaE2e {
  id: string;
  nome: string;
  nivelBase: number | null;
  equipamentos: Record<string, { id: number; refino?: number }>;
  atributos: { token?: string };
}

/** Personagens do vínculo do usuário da sessão. */
async function fichas(page: Page): Promise<FichaE2e[]> {
  const situacao = await ok<{ jogador: { personagens: FichaE2e[] } }>(page.request.get("/api/vinculo"), 200);
  return situacao.jogador.personagens;
}

test("membro simula o dano contra um chefe da Torre e vê a estimativa", async ({ page }, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  const campo = (nome: string) => page.getByRole("spinbutton", { name: nome, exact: true });
  await entrar(page);
  await page.goto("/simulador/estimativa");
  await expect(page.getByRole("heading", { name: "Simulação de dano", level: 1 })).toBeVisible();
  await expect(page.getByTestId("aviso-estimativa")).toContainText("estimativa");

  await page.locator('select[name="instancia"]').selectOption({ label: "Torre da Constelação (27)" });
  await page.locator('select[name="chefe"]').selectOption({ label: "Naght Sieger" });
  await expect(page.getByTestId("observacao-chefe")).toContainText("Andar 25");
  await expect(campo("DEF")).toHaveValue("410");
  await expect(campo("HP")).toHaveValue("300000000");

  await page.getByRole("textbox", { name: "Nome do monstro" }).fill("valquíria rand");
  await page.getByRole("button", { name: "Buscar pelo nome" }).click();
  await page.getByRole("button", { name: "Valquíria Randgris · nv. 141 · ID 1751" }).click();
  await expect(campo("Dano recebido %")).toHaveValue("10");
  await expect(page.getByTestId("nota-alvo")).toContainText("latam-tools");
  await page.locator('select[name="chefe"]').selectOption({ label: "Naght Sieger" });

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

test("membro com a build importada vê o dano com os efeitos dos equipamentos e o que foi aplicado", async ({
  page,
}, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  const fichaId = await membroComBuild(page, SAGE, `Sage${N}`);

  await page.goto(`/simulador/estimativa?personagem=${fichaId}`);
  await expect(page.getByRole("checkbox", { name: /Calcular os efeitos dos equipamentos/ })).toBeChecked();
  await expect(page.getByTestId("nota-efeitos")).toBeVisible();
  await expect(page.getByRole("spinbutton", { name: "FOR", exact: true })).toBeHidden();

  await page.getByRole("textbox", { name: "Nome do monstro" }).fill("zumbi dilacerado");
  await page.getByRole("button", { name: "Buscar pelo nome" }).click();
  await page.getByRole("button", { name: /Zumbi Dilacerado · nv\. 123 · ID 1865/ }).click();
  await expect(page.locator('select[name="racaAlvo"]')).toHaveValue("MORTO_VIVO");
  await page.getByRole("button", { name: "Simular" }).click();

  // Mesmos números do simulador da latam-tools para este link contra o Zumbi Dilacerado (2026-11-21).
  const resultado = page.getByTestId("resultado-build");
  await expect(resultado).toBeVisible();
  await expect(resultado).toContainText("Lanças de Fogo nv. 10");
  await expect(resultado).toContainText("493 a 796");
  await expect(resultado).toContainText("4.930 a 7.960");
  await expect(resultado).toContainText("média 6.440");
  await expect(page.getByTestId("aplicados")).toContainText("Livro Feiticeiro do Éden");
  await expect(page.getByTestId("aplicados")).toContainText("Sombrio: arma");
  await expect(page.getByTestId("aplicados")).toContainText("Conjunto:");
  await expect(page.getByTestId("ignorados")).toContainText("Nada: todos os itens da build foram lidos.");
  await expect(page.getByTestId("origem-motor")).toContainText("licença MIT");
  await expect(page.getByTestId("aviso-estimativa")).toContainText("estimativa");
  await page.screenshot({ path: info.outputPath("simulador-build-desktop.png"), fullPage: true });

  await page.locator('select[name="habilidadeBuild"]').selectOption({ label: "Lanças de Gelo nv. 10" });
  await page.getByRole("button", { name: "Simular" }).click();
  await expect(resultado).toContainText("Lanças de Gelo nv. 10");

  await page.setViewportSize({ width: 390, height: 780 });
  await expect(resultado).toBeVisible();
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largura).toBeLessThanOrEqual(390);
  await page.screenshot({ path: info.outputPath("simulador-build-celular.png"), fullPage: true });

  await page.getByRole("checkbox", { name: /Calcular os efeitos dos equipamentos/ }).uncheck();
  await expect(page.getByRole("spinbutton", { name: "FOR", exact: true })).toBeVisible();
  expect(erros).toEqual([]);
});

test("membro abre a build no simulador completo, troca o alvo, muda o nível e grava na ficha", async ({
  page,
}, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  // O simulador servido pelo sistema não pode depender de outro servidor: qualquer pedido dele para
  // fora é cortado, e só as imagens liberadas na D61 deixam de ser anotadas. O site da latam-tools
  // não participa deste teste.
  const pedidosParaFora: string[] = [];
  await page.route(
    (url) => url.origin !== ORIGEM,
    (rota) => {
      if (rota.request().frame().url().includes("/simulador-latam/") && !imagemLiberada(rota.request()))
        pedidosParaFora.push(rota.request().url());
      return rota.abort();
    },
  );
  const personagem = `Hub${N}`;
  const fichaId = await membroComBuild(page, HUB, personagem);

  await page.goto(`/simulador?personagem=${fichaId}`);
  await expect(page.getByRole("heading", { name: "Simulador de dano", level: 1 })).toBeVisible();
  await expect(page.getByTestId("hub-nota")).toHaveText(`Build de ${personagem} aberta no simulador.`);
  const simulador = page.frameLocator('[data-testid="quadro"]');
  await expect(simulador.locator("#ro-splash")).toHaveCount(0, { timeout: 30_000 });
  await expect(simulador.getByRole("combobox", { name: "Classe" })).toContainText("Feiticeiro");
  await expect(simulador.locator("#level")).toHaveText("105");
  await expect(simulador.locator("body")).toContainText("Livro Feiticeiro do Éden");

  // Mesmos números lidos em https://simulador.latam-tools.com.br/ (0.1.228-beta) em 2026-11-21 para
  // este link contra o Naght Sieger: 75 a 185 de dano e 1.300 por uso.
  await page.locator('select[name="instancia"]').selectOption({ label: "Torre da Constelação" });
  await page.locator('select[name="chefe"]').selectOption({ label: "Naght Sieger" });
  await page.getByTestId("usar-alvo").click();
  await expect(page.getByTestId("hub-nota")).toHaveText("Alvo do simulador: Naght Sieger.");
  await expect(simulador.locator("body")).toContainText("250 Naght Sieger", { timeout: 30_000 });
  await expect(simulador.locator("body")).toContainText("Lanças de Fogo");
  await expect(simulador.locator("body")).toContainText("75 – 185");
  await expect(simulador.locator("body")).toContainText("1.300");
  await page.screenshot({ path: info.outputPath("simulador-hub-desktop.png"), fullPage: true });

  await mostrarQuadro(page);
  await simulador.locator("#level").click();
  await simulador.getByRole("option", { name: "110", exact: true }).click();
  await expect(simulador.locator("#level")).toHaveText("110");
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ro-set") ?? "{}").level))
    .toBe(110);
  await page.getByTestId("salvar-build").click();
  await expect(page.getByTestId("hub-nota")).toContainText(`Ficha de ${personagem} atualizada`);
  await expect(page.getByTestId("hub-nota")).toContainText("nível 110");
  const salva = (await fichas(page)).find((p) => p.id === fichaId);
  expect(salva?.nivelBase).toBe(110);
  expect(salva?.equipamentos["arma"]?.id).toBe(540031);
  expect(salva?.atributos.token).toBeTruthy();

  await page.reload();
  await expect(simulador.locator("#ro-splash")).toHaveCount(0, { timeout: 30_000 });
  await expect(simulador.locator("#level")).toHaveText("110");
  await page.getByRole("link", { name: "estimativa à mão" }).click();
  await expect(page.getByTestId("aviso-estimativa")).toBeVisible();

  expect(pedidosParaFora).toEqual([]);
  expect(erros).toEqual([]);
});

test("membro abre no simulador completo o link do simulador público, muda o nível e grava na ficha", async ({
  page,
}, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  // Como no teste acima, nada sai para outro servidor: o link é o completo, e a API o confere sem
  // consultar o encurtador. O link curto é coberto nos testes da API, com o encurtador de mentira.
  const pedidosParaFora: string[] = [];
  await page.route(
    (url) => url.origin !== ORIGEM,
    (rota) => {
      if (rota.request().frame().url().includes("/simulador-latam/") && !imagemLiberada(rota.request()))
        pedidosParaFora.push(rota.request().url());
      return rota.abort();
    },
  );
  const perguntas: string[] = [];
  let resposta = true;
  page.on("dialog", (dialogo) => {
    perguntas.push(dialogo.message());
    void (resposta ? dialogo.accept() : dialogo.dismiss());
  });
  const personagem = `Link${N}`;
  const fichaId = await membroComBuild(page, LINK, personagem);
  expect((await fichas(page)).find((p) => p.id === fichaId)?.nivelBase).toBe(105);

  await page.goto("/simulador");
  const simulador = page.frameLocator('[data-testid="quadro"]');
  await expect(simulador.locator("#ro-splash")).toHaveCount(0, { timeout: 30_000 });
  await expect(simulador.locator("#level")).toHaveText("99");
  const campo = page.getByRole("textbox", { name: "Link do simulador" });
  const importar = page.getByTestId("simulador-importar-link");

  await campo.fill("https://exemplo.com/s/qualquer/");
  await importar.click();
  await expect(page.getByTestId("simulador-link-erro")).toContainText("não é do simulador");
  await campo.fill("https://simulador.latam-tools.com.br/s/isto-nao-e-uma-build/");
  await campo.press("Enter");
  await expect(page.getByTestId("simulador-link-erro")).toHaveText(
    "Esse link não traz uma build do simulador.",
  );
  await expect(simulador.locator("#level")).toHaveText("99");

  // Navegador sem trabalho no simulador: o link abre direto, sem pergunta.
  await campo.fill(`https://simulador.latam-tools.com.br/s/${TOKEN_FEITICEIRO}/`);
  await importar.click();
  await expect(page.getByTestId("hub-nota")).toContainText("Build do link aberta no simulador.", {
    timeout: 30_000,
  });
  expect(perguntas).toEqual([]);
  await expect(page.getByTestId("simulador-link-erro")).toHaveCount(0);
  await expect(campo).toHaveValue("");
  await expect(simulador.locator("#ro-splash")).toHaveCount(0, { timeout: 30_000 });
  await expect(simulador.getByRole("combobox", { name: "Classe" })).toContainText("Feiticeiro");
  await expect(simulador.locator("#level")).toHaveText("105");
  await expect(simulador.locator("body")).toContainText("Livro Feiticeiro do Éden");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("ro-set") ?? "{}").weapon)).toBe(540031);
  expect(await page.evaluate(() => localStorage.getItem("ev-simulador-personagem"))).toBeNull();
  await page.screenshot({ path: info.outputPath("simulador-link-desktop.png"), fullPage: true });

  await mostrarQuadro(page);
  await simulador.locator("#level").click();
  await simulador.getByRole("option", { name: "110", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.parse(localStorage.getItem("ro-set") ?? "{}").level))
    .toBe(110);

  // Com trabalho não gravado, abrir outro link pergunta antes; recusando, nada muda.
  resposta = false;
  await campo.fill(`https://simulador.latam-tools.com.br/?b=${TOKEN_FEITICEIRO}`);
  await importar.click();
  await expect.poll(() => perguntas.length).toBe(1);
  expect(perguntas[0]).toContain("o que não foi gravado numa ficha se perde");
  await expect(simulador.locator("#level")).toHaveText("110");

  // A build do link não veio de nenhuma ficha: gravar pede a confirmação.
  resposta = true;
  await page.getByTestId("salvar-build").click();
  await expect(page.getByTestId("hub-nota")).toContainText(`Ficha de ${personagem} atualizada`);
  await expect(page.getByTestId("hub-nota")).toContainText("nível 110");
  expect(perguntas).toHaveLength(2);
  expect(perguntas[1]).toContain(`não foi aberta da ficha de ${personagem}`);
  const salva = (await fichas(page)).find((p) => p.id === fichaId);
  expect(salva?.nivelBase).toBe(110);
  expect(salva?.equipamentos["arma"]?.id).toBe(540031);
  expect(salva?.atributos.token).toBeTruthy();

  await page.setViewportSize({ width: 360, height: 780 });
  await expect(campo).toBeVisible();
  const largura = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(largura).toBeLessThanOrEqual(360);
  await page.screenshot({ path: info.outputPath("simulador-link-celular.png"), fullPage: true });

  expect(pedidosParaFora).toEqual([]);
  expect(erros).toEqual([]);
});
