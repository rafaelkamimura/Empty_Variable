import { expect, test } from "@playwright/test";
import { ORIGEM } from "../playwright.config";

const headers = { Origin: ORIGEM };

test("estoque registra as entradas e a Loja mostra o saldo do catálogo", async ({ page }) => {
  expect(
    (
      await page.request.post("/api/auth/dev-login", {
        headers,
        data: { discordId: "900000000000000001", username: "admin-estoque" },
      })
    ).status(),
  ).toBe(204);
  const itens = (await (await page.request.get("/api/itens")).json()) as { id: string; nome: string }[];
  const nome = "Fragmento de Meteorito";
  const item = itens.find((i) => i.nome === nome);
  if (!item) throw new Error("Fragmento ausente do catálogo");
  const astral = itens.find((i) => i.nome === "Armadura Astral");
  if (!astral) throw new Error("Armadura Astral ausente do catálogo");
  expect(
    (
      await page.request.patch(`/api/itens/${astral.id}`, {
        headers,
        data: { negociavel: true, vinculadoConta: false },
      })
    ).status(),
  ).toBe(200);
  const rejeitada = await page.request.post("/api/estoque/entradas", {
    headers,
    data: {
      origem: (await (await page.request.get("/api/estoque/origens")).json())[0].id,
      itemId: astral.id,
      quantidade: 1,
      precoPontos: 50,
    },
  });
  expect(rejeitada.status()).toBe(400);

  await page.goto("/");
  await expect(page).toHaveURL(/\/admin\/estoque$/);
  await expect(page.getByRole("navigation", { name: "Menu principal" }).getByRole("link")).toHaveText([
    "Loja",
    "Instâncias",
    "Diário de farm",
    "Simulação de dano",
  ]);
  await page.getByRole("button", { name: "Menu do perfil" }).click();
  await page.getByRole("menuitem", { name: "Estoque" }).click();
  for (const origem of ["Torre da Constelação", "Drop Solto"]) {
    await page.getByRole("button", { name: "Nova entrada" }).click();
    const itemCampo = page.getByRole("combobox", { name: "Item", exact: true });
    const quantidade = page.getByRole("spinbutton", { name: "Quantidade", exact: true });
    await expect(itemCampo).toBeDisabled();
    await expect(quantidade).toBeDisabled();
    await page.getByRole("combobox", { name: "Instância", exact: true }).click();
    await page.getByRole("option", { name: origem, exact: true }).click();
    await itemCampo.click();
    const outra = page.getByRole("option", { name: "Armadura Astral", exact: true });
    if (origem === "Drop Solto") {
      await expect(outra).toBeVisible();
      await expect(page.getByRole("option", { name: nome, exact: true })).toHaveCount(0);
      await outra.click();
      await page.getByRole("button", { name: "Fechar", exact: true }).click();
      break;
    }
    await expect(outra).toHaveCount(0);
    await page.getByRole("option", { name: new RegExp(nome) }).click();
    if (origem === "Torre da Constelação") {
      await expect(quantidade).toBeDisabled();
      await page.getByRole("button", { name: "Confirmar: item negociável e sem vínculo à conta" }).click();
    }
    await expect(quantidade).toBeEnabled();
    await quantidade.fill("4");
    await page.getByRole("spinbutton", { name: "Preço de venda por unidade (pts)" }).fill("50");
    await page.getByRole("button", { name: "Registrar entrada" }).click();
    await expect(page.getByRole("button", { name: "Registrar entrada" })).toBeHidden();
  }
  await page.getByRole("tab", { name: "Movimentos" }).click();
  const historico = page.getByTestId("movimentos");
  await expect(historico).toContainText("Torre da Constelação");

  await page.getByRole("tab", { name: "Resumo" }).click();
  await expect(page.getByTestId("resumo-estoque")).toContainText("50 pts");
  await page.getByRole("button", { name: "Ajuste", exact: true }).click();
  await page.getByRole("combobox", { name: "Lote", exact: true }).click();
  await page
    .getByRole("option", { name: /Fragmento de Meteorito/ })
    .first()
    .click();
  await page.getByRole("combobox", { name: "Operação", exact: true }).click();
  await page.getByRole("option", { name: "Retirar unidades" }).click();
  await page.getByRole("textbox", { name: "Motivo", exact: true }).fill("Conferência de saldo");
  const qtdAjuste = page.getByRole("spinbutton", { name: "Quantidade do ajuste" });
  const registrar = page.getByRole("button", { name: "Registrar ajuste" });
  await qtdAjuste.fill("5");
  await expect(registrar).toBeDisabled();
  await qtdAjuste.fill("2");
  await expect(page.getByText("Saldo do lote após o ajuste: 2 un.")).toBeVisible();
  await registrar.click();
  await expect(registrar).toBeHidden();
  await page.getByRole("tab", { name: "Movimentos" }).click();
  await expect(historico.getByRole("row").filter({ hasText: "Conferência de saldo" })).toContainText("-2");

  await page.context().clearCookies();
  expect(
    (
      await page.request.post("/api/auth/dev-login", {
        headers,
        data: { discordId: "900000000000000040", username: "membro-estoque" },
      })
    ).status(),
  ).toBe(204);
  await page.goto("/admin/estoque");
  await expect(page).toHaveURL(/\/loja$/);
  await expect(page.getByRole("navigation", { name: "Menu principal" }).getByRole("link")).toHaveText([
    "Loja",
    "Instâncias",
    "Diário de farm",
    "Simulação de dano",
  ]);
  await page.getByRole("button", { name: "Menu do perfil" }).click();
  await expect(page.getByRole("menuitem", { name: "Estoque" })).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Loja de Pontos" })).toBeVisible();
  const catalogo = page.getByTestId("catalogo-loja");
  const cartao = catalogo.getByRole("article").filter({ hasText: nome });
  await expect(cartao).toContainText("2 em estoque");
  await expect(cartao).toContainText("50 pts");
  await cartao.getByRole("button", { name: nome }).click();
  await expect(page.getByRole("dialog")).toContainText("É necessário ter um personagem vinculado");
  await page.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect(catalogo.getByText("Armadura Astral")).toHaveCount(0);
  await page.getByRole("searchbox", { name: "Buscar item" }).fill("inexistente");
  await expect(catalogo.getByText("Nenhum item encontrado.")).toBeVisible();
  expect((await page.request.get("/api/estoque")).status()).toBe(403);
  const membroId = "900000000000000040";
  const login = async (discordId: string) => {
    await page.context().clearCookies();
    expect(
      (
        await page.request.post("/api/auth/dev-login", {
          headers,
          data: { discordId, username: discordId === "900000000000000041" ? "Recebedor" : "teste-compra" },
        })
      ).status(),
    ).toBe(204);
  };
  const post = async (url: string, data: object) => {
    const resposta = await page.request.post(url, { headers, data });
    expect(resposta.ok()).toBe(true);
    return resposta;
  };
  const adminId = "900000000000000001";
  await login(adminId);
  await page.goto("/admin/estoque");
  await page.getByRole("button", { name: "50 pts · Editar", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Preço por unidade (pts)" }).fill("75");
  await page.getByRole("button", { name: "Salvar preço" }).click();
  await expect(page.getByRole("button", { name: "75 pts · Editar" })).toBeVisible();

  const jogador = (await (
    await post("/api/jogadores", { apelido: "Cliente", personagens: ["Cliente-MTK"] })
  ).json()) as { id: string; personagens: { id: string }[] };
  const classes = (await (await page.request.get("/api/classes")).json()) as {
    apelidoGrupo: string;
    funcoes: { id: string }[];
  }[];
  const mtk = classes.find((classe) => classe.apelidoGrupo === "MTK")?.funcoes[0];
  const personagem = jogador.personagens[0];
  if (!mtk || !personagem) throw new Error("Jogador ou função MTK ausente.");
  await post("/api/runs", {
    data: "2026-11-14",
    chefe: "BETELGEUSE_75",
    status: "CONCLUIDA",
    participantes: [{ personagemId: personagem.id, funcaoId: mtk.id }],
  });
  await login(membroId);
  const vinculo = (await (await post("/api/vinculo/solicitacoes", { jogadorId: jogador.id })).json()) as {
    id: string;
  };
  await login(adminId);
  await post(`/api/vinculo/solicitacoes/${vinculo.id}/aprovar`, {});
  await login(membroId);
  await page.goto("/loja");
  const tituloLoja = page.getByRole("heading", { name: "Loja de Pontos" });
  const buscaLoja = page.getByRole("searchbox", { name: "Buscar item" });
  await expect(tituloLoja).toBeVisible();
  await expect(buscaLoja).toBeVisible();
  const tituloCaixa = await tituloLoja.boundingBox();
  const buscaCaixa = await buscaLoja.boundingBox();
  expect(buscaCaixa!.y).toBeGreaterThan(tituloCaixa!.y + tituloCaixa!.height);

  const carteira = page.getByTestId("saldo-topo");
  await expect(carteira).toContainText("600 pts");
  await expect(cartao).toContainText("75 pts");
  await cartao.getByRole("button", { name: nome }).click();
  await expect(page.getByRole("dialog")).toContainText("Total: 75 pts");
  await page.getByRole("button", { name: "Confirmar solicitação" }).click();
  await expect(page.getByRole("dialog")).toContainText("Solicitação registrada");
  await expect(carteira).toContainText("525 pts");
  const recebedorId = "900000000000000041";
  await login(recebedorId);
  await page.goto("/loja");
  await page.getByRole("button", { name: "Menu do perfil" }).click();
  await page.getByRole("menuitem", { name: "Vínculo de jogador" }).click();
  await expect(page.getByLabel("Apelido no grupo")).toHaveCount(0);
  await expect(page.getByRole("radiogroup")).toHaveCount(0);
  await expect(page.getByLabel("Nickname do personagem")).toHaveCount(0);
  await page.getByRole("button", { name: "Adicionar personagem" }).click();
  const ficha = page.getByRole("dialog", { name: "Adicionar personagem" });
  await expect(ficha).toBeVisible();
  await page.getByLabel("Nickname do personagem").fill("Receb\u00eador-MTK");
  const seletorClasses = page.getByRole("combobox", { name: "Classe", exact: true });
  await expect(seletorClasses.locator("optgroup")).toHaveCount(7);
  expect(
    await seletorClasses
      .locator("optgroup")
      .evaluateAll((grupos) => grupos.map((g) => g.getAttribute("label"))),
  ).toEqual(["1-1", "1-2", "2-1", "2-2", "3", "4", "Outras"]);
  await expect(seletorClasses.locator('optgroup[label="4"] option')).toHaveCount(20);
  await seletorClasses.selectOption({ label: "Mestre Celestial · MTK" });
  const nivelBase = ficha.locator('input[type="number"]');
  const salvarPersonagem = ficha.getByRole("button", { name: "Salvar personagem" });
  await nivelBase.fill("0");
  await expect(salvarPersonagem).toBeDisabled();
  await nivelBase.fill("251");
  await expect(salvarPersonagem).toBeDisabled();
  await nivelBase.fill("250");
  await page.getByRole("tab", { name: "Equipamentos", exact: true }).click();
  await expect(ficha.getByRole("group", { name: "Slots de equipamento" }).getByRole("button")).toHaveCount(
    10,
  );
  await page.getByRole("button", { name: "Arma", exact: true }).click();
  await page.getByRole("searchbox", { name: "Buscar Arma", exact: true }).fill("Adaga TE");
  await page.getByRole("combobox", { name: "Arma", exact: true }).selectOption("13083");
  await salvarPersonagem.click();
  await expect(ficha).toHaveCount(0);
  await expect(page.getByText("Solicitação em análise")).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("vinculo-pendente")).toContainText("Receb\u00eador-MTK");
  const pendente = page.getByTestId("vinculo-pendente");
  await pendente.getByRole("button", { name: "Editar ficha de Receb\u00eador-MTK" }).click();
  const edicao = page.getByRole("dialog", { name: "Editar personagem" });
  await edicao.locator('input[type="number"]').fill("249");
  await edicao.getByRole("button", { name: "Salvar personagem" }).click();
  await expect(pendente).toContainText("249");
  await pendente.getByRole("button", { name: "Adicionar personagem" }).click();
  await ficha.getByLabel("Nickname do personagem").fill("Recebedor-Animista");
  await seletorClasses.selectOption({ label: "Animista" });
  await nivelBase.fill("1");
  await salvarPersonagem.click();
  await expect(pendente.getByRole("button", { name: "Editar ficha de Recebedor-Animista" })).toBeVisible();
  await login(adminId);
  await page.goto("/vinculo/aprovacoes");
  await expect(page.getByText("Receb\u00eador-MTK · Mestre Celestial · Nível 249")).toBeVisible();
  await page.getByRole("button", { name: "Aprovar vínculo", exact: true }).click();
  await expect(page.getByRole("button", { name: "Aprovar vínculo", exact: true })).toHaveCount(0);
  await login(recebedorId);
  await page.goto("/vinculo");
  const cartaoPersonagem = page.getByRole("button", { name: "Editar ficha de Receb\u00eador-MTK" });
  await expect(cartaoPersonagem).toContainText("Mestre Celestial");
  const icone = cartaoPersonagem.locator("img");
  await expect(icone).toHaveAttribute("src", "icones-classes/4302.png");
  await expect.poll(() => icone.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  await cartaoPersonagem.click();
  await expect(page.getByRole("dialog", { name: "Editar personagem" })).toBeVisible();
  const fichaEditavel = page.getByRole("dialog", { name: "Editar personagem" });
  const viewportAnterior = page.viewportSize();
  await page.setViewportSize({ width: 390, height: 650 });
  const retrato = fichaEditavel.getByTestId("vinculo-retrato");
  await expect
    .poll(() =>
      retrato.evaluate(
        (quadro) => (quadro.querySelector("img")?.getBoundingClientRect().width ?? 0) / quadro.clientWidth,
      ),
    )
    .toBeGreaterThan(0.8);
  // No celular, a ficha cabe na tela: o botão de salvar aparece sem rolar, em cada aba.
  const salvarVisivel = fichaEditavel.getByRole("button", { name: "Salvar personagem" });
  await expect(salvarVisivel).toBeInViewport();
  await page.getByRole("tab", { name: "Equipamentos", exact: true }).click();
  await page.getByRole("button", { name: "Arma", exact: true }).click();
  await expect(page.getByRole("combobox", { name: "Arma", exact: true })).toHaveValue("13083");
  await expect(salvarVisivel).toBeInViewport();
  await page.getByRole("tab", { name: "Build", exact: true }).click();
  await expect(fichaEditavel.getByRole("textbox", { name: "Importar do simulador" })).toBeVisible();
  await expect(fichaEditavel.getByRole("button", { name: "Importar build" })).toBeDisabled();
  await expect(salvarVisivel).toBeInViewport();
  if (viewportAnterior) await page.setViewportSize(viewportAnterior);
  expect((await page.request.get("/api/gestao/grupos")).status()).toBe(403);
  await login(adminId);
  await page.goto("/gestao/grupos");
  await page
    .getByRole("combobox", { name: "Instância", exact: true })
    .selectOption({ label: "Torre da Constelação" });
  const continuarGrupo = page.getByRole("button", { name: "Continuar" });
  const adicionarVaga = page.getByRole("button", { name: "Adicionar vaga" });
  await continuarGrupo.click();
  await adicionarVaga.click();
  const classesReserva = page.getByRole("combobox", { name: "Classe", exact: true });
  expect(
    await classesReserva
      .locator("optgroup")
      .evaluateAll((grupos) => grupos.map((g) => g.getAttribute("label"))),
  ).toEqual(["1-1", "1-2", "2-1", "2-2", "3", "4", "Outras"]);
  await classesReserva.selectOption({ label: "Mestre Celestial" });
  await page.getByRole("radio", { name: "5 de 5", exact: true }).check();
  await continuarGrupo.click();
  await expect(page.getByRole("region", { name: "Classes obrigatórias já escolhidas" })).toContainText(
    "Mestre Celestial",
  );
  await adicionarVaga.click();
  await page.getByRole("combobox", { name: "Classe", exact: true }).selectOption({ label: "Animista" });
  await page.getByRole("radio", { name: "2 de 5", exact: true }).check();
  await continuarGrupo.click();
  const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
  await page.getByLabel("Data e hora (São Paulo)").fill(amanha);
  await continuarGrupo.click();
  await expect(page.getByRole("heading", { name: "Revisão" })).toBeVisible();
  await expect(page.getByText("10 de 12 vagas")).toBeVisible();
  const novaRun = page.waitForResponse(
    (resposta) => resposta.request().method() === "POST" && resposta.url().endsWith("/api/gestao/grupos"),
  );
  await page.getByRole("button", { name: "Confirmar e criar grupo" }).click();
  const respostaGrupo = await novaRun;
  expect(respostaGrupo.status()).toBe(201);
  const grupo = (await respostaGrupo.json()) as { id: string; vagas: { personagemId: string | null }[] };
  const fecharGrupo = page.getByRole("button", { name: "Fechar grupo" });
  await expect(fecharGrupo).toBeDisabled();
  const fechamentoVazio = await page.request.patch("/api/gestao/grupos/" + grupo.id, {
    headers,
    data: {
      fechar: true,
      vagas: grupo.vagas,
      ocupacaoAnterior: grupo.vagas.map((vaga) => vaga.personagemId),
    },
  });
  expect(fechamentoVazio.status()).toBe(409);
  await login(recebedorId);
  await page.goto("/instancias-programadas");
  await page.getByRole("button", { name: "Ver vagas" }).click();
  const listaDeVagas = page.getByRole("list", { name: "Vagas do grupo" });
  await expect(listaDeVagas.getByRole("listitem")).toHaveCount(12);
  const vagaDoMembro = listaDeVagas.getByRole("listitem").first();
  await vagaDoMembro.getByRole("button", { name: "Entrar na vaga" }).click();
  await vagaDoMembro.getByRole("combobox", { name: "Personagem" }).selectOption({ label: "Recebêdor-MTK" });
  await vagaDoMembro.getByRole("button", { name: "Confirmar vaga" }).click();
  await expect(page.getByText("Vaga confirmada.")).toBeVisible();
  await expect(vagaDoMembro).toContainText("Recebêdor-MTK");
  await login(adminId);
  const escalaAntiga = await page.request.patch("/api/gestao/grupos/" + grupo.id, {
    headers,
    data: { vagas: grupo.vagas, ocupacaoAnterior: grupo.vagas.map((vaga) => vaga.personagemId) },
  });
  expect(escalaAntiga.status()).toBe(409);
  await page.goto("/gestao/grupos");
  await page.getByRole("button", { name: /Torre da Constela.*Aberto/ }).click();
  await fecharGrupo.click();
  await expect(page.getByRole("button", { name: /Torre da Constela.*Fechado/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: /Torre da Constela.*Fechado/ })).toBeVisible();
  await login(membroId);
  await page.goto("/loja");
  await page.getByRole("button", { name: "Menu do perfil" }).click();
  await page.getByRole("menuitem", { name: "Carteira" }).click();
  await expect(page.getByTestId("saldo-carteira")).toHaveText("525 pts");
  await page.getByRole("tab", { name: "Créditos" }).click();
  await expect(page.getByTestId("historico")).toContainText("+600");
  await page.getByRole("tab", { name: "Compras" }).click();
  await expect(page.getByTestId("compras-carteira")).toContainText(nome);
  await page.getByRole("button", { name: "Transferir pontos" }).click();
  const modalTransferencia = page.getByRole("dialog", { name: "Transferir pontos" });
  await expect(modalTransferencia).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(modalTransferencia).not.toBeVisible();
  await page.getByRole("button", { name: "Transferir pontos" }).click();
  await modalTransferencia.getByLabel("Destinatário").selectOption({ label: "Recebedor" });
  await modalTransferencia.getByLabel("Pontos", { exact: true }).fill("526");
  const revisar = modalTransferencia.getByRole("button", { name: "Revisar transferência" });
  await expect(revisar).toBeDisabled();
  await modalTransferencia.getByLabel("Pontos", { exact: true }).fill("100");
  await revisar.click();
  await expect(modalTransferencia.getByText("Saldo após o envio: 425 pts.")).toBeVisible();
  const requisicao = page.waitForRequest(
    (req) => req.method() === "POST" && req.url().endsWith("/api/carteira/transferencias"),
  );
  await modalTransferencia.getByRole("button", { name: "Confirmar transferência" }).click();
  await expect(modalTransferencia).not.toBeVisible();
  const corpo = (await requisicao).postDataJSON() as { id: string; destinatarioId: string; pontos: number };
  await expect(page.getByTestId("saldo-carteira")).toHaveText("425 pts");
  await post("/api/carteira/transferencias", corpo);
  await page.getByRole("tab", { name: "Movimentos" }).click();
  await expect(page.getByTestId("historico").getByText("Enviada para Recebedor")).toHaveCount(1);
  await login(recebedorId);
  await page.goto("/carteira");
  await expect(page.getByTestId("saldo-carteira")).toHaveText("100 pts");
  await expect(page.getByTestId("historico")).toContainText("Recebida de Cliente");
});
