// Simulação de dano (D57, D58): um membro escolhe um chefe da Torre, busca um monstro pelo nome,
// preenche o ataque e vê a estimativa, no computador e no celular.
// D59: com a build importada na ficha, o resultado traz os efeitos dos equipamentos e lista o que
// foi aplicado e o que foi ignorado.
import { type APIResponse, type Page, expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const ADMIN = { discordId: "900000000000000001", username: "admin-simulador" };
const MEMBRO = { discordId: "900000000000000571", username: "membro-simulador" };
/** Sufixo por execução: o teste pode rodar de novo no mesmo banco. */
const N = String(Date.now()).slice(-6);
const SAGE = { discordId: `9000000059${N}`, username: `sage-simulador-${N}` };
const headers = { Origin: ORIGEM };

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

test("membro simula o dano contra um chefe da Torre e vê a estimativa", async ({ page }, info) => {
  const erros: string[] = [];
  page.on("pageerror", (erro) => erros.push(erro.message));
  const campo = (nome: string) => page.getByRole("spinbutton", { name: nome, exact: true });
  await entrar(page);
  await page.goto("/simulador");
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
  const personagem = `Sage${N}`;

  // Preparação pela API: jogador vinculado, com a build do link importada na ficha.
  await entrar(page, ADMIN);
  const jogador = await ok<{ id: string }>(
    page.request.post("/api/jogadores", {
      headers,
      data: { apelido: `Sage${N}`, personagens: [personagem] },
    }),
    201,
  );
  await entrar(page, SAGE);
  await ok(page.request.post("/api/vinculo/solicitacoes", { headers, data: { jogadorId: jogador.id } }), 201);
  await entrar(page, ADMIN);
  const pendentes = await ok<{ id: string; jogador: { id: string } | null }[]>(
    page.request.get("/api/vinculo/solicitacoes?status=PENDENTE"),
    200,
  );
  const pedido = pendentes.find((s) => s.jogador?.id === jogador.id);
  if (!pedido) throw new Error("Solicitação de vínculo não encontrada");
  await ok(page.request.post(`/api/vinculo/solicitacoes/${pedido.id}/aprovar`, { headers }), 200);
  await entrar(page, SAGE);
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
  const situacao = await ok<{ jogador: { personagens: { id: string; nome: string }[] } }>(
    page.request.get("/api/vinculo"),
    200,
  );
  const ficha = situacao.jogador.personagens.find((p) => p.nome === personagem);
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

  await page.goto(`/simulador?personagem=${ficha.id}`);
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
