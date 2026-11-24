import { registerLocaleData } from "@angular/common";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import localePt from "@angular/common/locales/pt";
import { LOCALE_ID } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import type { PatchResumido } from "../data/datamine.modelos";
import { RELATORIO_EXEMPLO } from "../data/relatorio.exemplo";
import { PatchPage } from "./patch.page";

const esperar = () => new Promise((r) => setTimeout(r));

const ID = "11111111-1111-4111-8111-111111111111";
const URL_PATCH = `/api/datamine/patches/${ID}`;
const URL_DADOS = `${URL_PATCH}/dados`;

const patch = (extra: Partial<PatchResumido> = {}): PatchResumido => ({
  id: ID,
  chave: "2026-11-24_live_client_2170_2171_1795480754.rgz",
  titulo: "Patch LATAM 2026-11-24",
  dataPatch: "2026-11-24",
  patches: ["1601 a.gpf", "1604 b.rgz"],
  resumo: { contagens: { itensNovos: 230, itensAlterados: 122, caixas: 40 }, ragexe: true },
  bytesHtml: 1_000,
  bytesJson: 2_000,
  publicadoEm: "2026-11-24T01:00:00.000Z",
  atualizadoEm: "2026-11-24T01:00:00.000Z",
  ...extra,
});

registerLocaleData(localePt);

function montar() {
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      { provide: LOCALE_ID, useValue: "pt-BR" },
    ],
  });
  const http = TestBed.inject(HttpTestingController);
  const f = TestBed.createComponent(PatchPage);
  f.componentRef.setInput("id", ID);
  f.autoDetectChanges();
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  return { http, el };
}

/** Monta a página com o resumo e o relatório de exemplo já carregados. */
async function montarPronta(relatorio: object = RELATORIO_EXEMPLO) {
  const tela = montar();
  await esperar();
  tela.http.expectOne(URL_PATCH).flush(patch());
  tela.http.expectOne(URL_DADOS).flush(relatorio);
  await esperar();
  return tela;
}

const textos = (el: Element, seletor: string): string[] =>
  Array.from(el.querySelectorAll(seletor)).map((e) => e.textContent?.replace(/\s+/g, " ").trim() ?? "");

async function abrirAba(el: HTMLElement, chave: string): Promise<HTMLElement> {
  el.querySelector<HTMLElement>(`[data-testid=datamine-aba-${chave}]`)
    ?.closest<HTMLElement>("[role=tab]")
    ?.click();
  await esperar();
  return el.querySelector<HTMLElement>(`[data-testid=datamine-conteudo-${chave}]`)!;
}

const linhas = (aba: Element): HTMLElement[] =>
  Array.from(aba.querySelectorAll<HTMLElement>("[data-testid=datamine-linhas] > li"));

async function abrirLinha(linha: Element): Promise<void> {
  linha.querySelector<HTMLButtonElement>("button[aria-expanded]")?.click();
  await esperar();
}

async function buscar(aba: Element, termo: string): Promise<void> {
  const campo = aba.querySelector<HTMLInputElement>("[data-testid=datamine-busca]")!;
  campo.value = termo;
  campo.dispatchEvent(new Event("input"));
  await esperar();
}

describe("PatchPage", () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    document.querySelectorAll("app-patch-page").forEach((e) => e.remove());
  });

  it("mostra o resumo primeiro e, quando o relatório chega, as abas com as contagens; sem iframe", async () => {
    const { http, el } = montar();
    await esperar();
    expect(el.querySelector("ui-skeleton")).not.toBeNull();

    http.expectOne(URL_PATCH).flush(patch());
    await esperar();
    expect(el.querySelector("h1")?.textContent).toBe("Patch LATAM 2026-11-24");
    expect(el.querySelector("ui-pagina header p")?.textContent).toContain("24/11/2026");
    expect(textos(el, "[data-testid=datamine-selos] li")).toEqual(["Ragexe novo"]);
    expect(textos(el, "[data-testid=datamine-indicadores] ui-resumo .indicador-valor")).toEqual([
      "230",
      "122",
      "40",
    ]);
    expect(el.querySelector("[data-testid=datamine-relatorio] ui-skeleton")).not.toBeNull();
    expect(el.querySelector("[data-testid=datamine-abas]")).toBeNull();

    http.expectOne(URL_DADOS).flush(RELATORIO_EXEMPLO);
    await esperar();
    expect(textos(el, "[data-testid=datamine-selos] li")).toEqual(["Ragexe novo", "GRF reempacotado"]);
    expect(textos(el, "[data-testid=datamine-abas] [role=tab] .rotulo")).toEqual([
      "Itens novos",
      "Itens alterados",
      "Caixas e ovos",
      "Monstros e skills",
      "Mapas e quests",
      "Arquivos do GRF",
      "Tabelas Lua",
      "Textos",
    ]);
    expect(textos(el, "[data-testid=datamine-abas] [role=tab] ui-badge")).toEqual([
      "9",
      "3",
      "2",
      "5",
      "4",
      "5",
      "4",
      "1",
    ]);
    expect(el.querySelector("[data-testid=datamine-abas] [role=tab]")?.getAttribute("aria-label")).toBe(
      "Itens novos: 9",
    );
    expect(el.querySelector("iframe")).toBeNull();
    expect(el.textContent).not.toContain("Abrir em outra aba");
    expect(el.querySelector("[data-testid=datamine-arquivos]")?.textContent).toContain("data.grf");
  });

  it("só a aba aberta vai para o DOM, com as descrições fechadas", async () => {
    const { el } = await montarPronta();
    expect(el.querySelector("[data-testid=datamine-conteudo-itens-novos]")).not.toBeNull();
    expect(el.querySelector("[data-testid=datamine-conteudo-grf]")).toBeNull();
    expect(el.querySelector("app-detalhe-item")).toBeNull();
    expect(el.querySelectorAll("ui-texto-colorido").length).toBe(0);
  });

  it("itens novos: busca, chip de categoria e a descrição ao abrir a linha", async () => {
    const { el } = await montarPronta();
    const aba = el.querySelector<HTMLElement>("[data-testid=datamine-conteudo-itens-novos]")!;
    expect(linhas(aba).length).toBe(9);
    expect(aba.querySelector("[data-testid=datamine-contagem]")?.textContent).toBe("9 resultados.");

    await buscar(aba, "TIARA");
    expect(linhas(aba).length).toBe(1);
    expect(aba.querySelector("[data-testid=datamine-contagem]")?.textContent).toBe("1 de 9 resultados.");
    expect(linhas(aba)[0]!.textContent).toContain("[Visual] Tiara da Nevasca");
    expect(textos(linhas(aba)[0]!, "ui-badge")).toEqual(["Visual", "Traje", "Efeito 1186"]);
    const link = linhas(aba)[0]!.querySelector<HTMLAnchorElement>("app-link-item a")!;
    expect(link.getAttribute("href")).toBe("https://www.divine-pride.net/database/item/31588");
    expect([link.target, link.rel]).toEqual(["_blank", "noopener noreferrer"]);
    expect(link.getAttribute("aria-label")).toBe(
      "[Visual] Tiara da Nevasca (item 31588) na Divine Pride, abre em outra aba",
    );
    expect(link.closest("button")).toBeNull();

    await buscar(aba, "nada disso existe");
    expect(aba.querySelector("ui-vazio")?.textContent).toContain("Nada encontrado");

    await buscar(aba, "");
    const chips = Array.from(aba.querySelectorAll<HTMLButtonElement>("ui-chips-filtro button"));
    expect(chips.map((c) => c.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "Todos 9",
      "Armas 1",
      "Armaduras 1",
      "Visuais 1",
      "Encantos 1",
      "Sombrios 1",
      "Caixas 1",
      "Materiais 1",
      "Pets 1",
      "Outros 1",
    ]);
    chips.find((c) => c.textContent?.includes("Pets"))?.click();
    await esperar();
    expect(linhas(aba).length).toBe(1);

    const ovo = linhas(aba)[0]!;
    expect(ovo.querySelector("button")?.getAttribute("aria-expanded")).toBe("false");
    await abrirLinha(ovo);
    expect(ovo.querySelector("button")?.getAttribute("aria-expanded")).toBe("true");
    expect(ovo.querySelector("app-detalhe-item")?.textContent).toContain(
      "Pode ser chocado usando uma [Incubadora].",
    );
    const colorido = Array.from(ovo.querySelectorAll<HTMLElement>("ui-texto-colorido span")).find(
      (s) => s.textContent === "Ovo de Monstro",
    );
    expect(colorido?.style.color).not.toBe("");
  });

  it("itens alterados: campos com antes e depois, linhas da descrição marcadas e os removidos", async () => {
    const { el } = await montarPronta();
    const aba = await abrirAba(el, "itens-alterados");
    const [capelo, pocao] = linhas(aba);
    expect(textos(capelo!, "ui-badge")).toEqual(["Descrição"]);

    await abrirLinha(capelo!);
    expect(capelo!.querySelector("app-diff-descricao .resumo")?.textContent).toBe(
      "2 linhas adicionadas (+) e 1 linha removida (−).",
    );
    const removida = capelo!.querySelector("[data-mudanca=removida]")!;
    expect(removida.querySelector(".marca")?.textContent).toBe("−");
    expect(removida.querySelector(".sr-only")?.textContent).toBe("Removida:");
    expect(capelo!.querySelectorAll("[data-mudanca=adicionada]").length).toBe(2);
    expect(capelo!.querySelectorAll("[data-mudanca=igual]").length).toBe(3);

    await abrirLinha(pocao!);
    expect(textos(pocao!, ".campos dt")).toEqual(["Nome", "Nome não identificado", "Slots", "Traje"]);
    expect(pocao!.querySelector(".campos dd")?.textContent?.replace(/\s+/g, " ")).toContain(
      "antes: Poção Gelada → , agora: Poção Invernal",
    );

    const removidos = aba.querySelector("[data-testid=datamine-itens-removidos]")!;
    expect(removidos.querySelector("h2")?.textContent).toBe("Itens removidos");
    expect(removidos.textContent).toContain("Bilhete Antigo");
  });

  it("caixas: tabela do mais provável para o menos, bônus garantido e o que mudou na caixa alterada", async () => {
    const { el } = await montarPronta();
    const aba = await abrirAba(el, "caixas");
    const [nova, alterada] = linhas(aba);

    await abrirLinha(nova!);
    const linhasNova = Array.from(nova!.querySelectorAll("tbody tr"));
    expect(linhasNova.map((tr) => tr.querySelector("td")?.textContent?.trim())).toEqual([
      "50,00%",
      "49,70%",
      "0,300%",
      "Sempre",
    ]);
    expect(linhasNova[3]!.textContent).toContain("Bônus garantido");
    expect(linhasNova[0]!.querySelector("app-link-item a")?.getAttribute("href")).toBe(
      "https://www.divine-pride.net/database/item/31588",
    );
    expect(nova!.querySelector("app-link-item a")?.getAttribute("href")).toBe(
      "https://www.divine-pride.net/database/item/108642",
    );
    expect(nova!.querySelector(".nota")?.textContent).toContain(
      "3 itens sorteáveis, soma dos pesos 1.000; 1 item garantido",
    );

    await abrirLinha(alterada!);
    expect(textos(alterada!, "tbody tr td:last-child")).toEqual([
      "Entrou",
      "Chance alterada antes 50,00%",
      "Entrou",
      "Saiu",
    ]);
  });

  it("monstros e skills, mapas e quests: linhas simples e linhas que abrem", async () => {
    const { el } = await montarPronta();
    const combate = await abrirAba(el, "monstros-skills");
    expect(linhas(combate).length).toBe(5);
    expect(linhas(combate)[2]!.textContent).toContain("antes: JT_PORING, sprite poring");
    const skill = linhas(combate)[4]!;
    await abrirLinha(skill);
    expect(skill.querySelectorAll("[data-mudanca=adicionada]").length).toBe(1);
    expect(skill.textContent).toContain("/name: Poema do Submundo → Poema de Niflheim");

    const mundo = await abrirAba(el, "mapas-quests");
    expect(linhas(mundo).length).toBe(4);
    expect(linhas(mundo)[0]!.textContent).toContain("Livro de Ilusões - Palácio Lilium");
    const quest = linhas(mundo)[3]!;
    await abrirLinha(quest);
    expect(quest.querySelector(".troca")?.textContent?.replace(/\s+/g, " ")).toContain(
      "antes: [Espera] Investigar a Tartaruga → , agora: [Espera] Investigar a Ilha da Tartaruga",
    );
    expect(quest.textContent).toContain("[Orian] (tur_d03_i 125,186)");
  });

  it("GRF, tabelas Lua e textos", async () => {
    const { el } = await montarPronta();
    const grf = await abrirAba(el, "grf");
    expect(textos(grf, "[data-testid=datamine-grf-resumo] tbody tr td:first-child")).toEqual([
      "Sprite de capa",
      "Mapa",
      "Sprite de item",
    ]);
    expect(linhas(grf).length).toBe(5);
    expect(textos(linhas(grf)[2]!, "ui-badge, .nome, .meta")).toEqual([
      "Alterado",
      "data\\alberta.gnd",
      "2,5 MB → 2,5 MB · Mapa",
    ]);
    expect(grf.querySelectorAll("ui-chips-filtro").length).toBe(2);

    const lua = await abrirAba(el, "lua");
    const [mapInfo, cortada, , quebrada] = linhas(lua);
    await abrirLinha(mapInfo!);
    expect(textos(mapInfo!, ".mudanca .op")).toEqual(["Adicionado", "Alterado", "Removido"]);
    expect(textos(mapInfo!, ".mudanca .marca")).toEqual(["+", "~", "−"]);
    await abrirLinha(cortada!);
    expect(cortada!.querySelector("ui-aviso")?.textContent).toContain("primeiras 1 de 2.510 mudanças");
    await abrirLinha(quebrada!);
    expect(quebrada!.querySelector("ui-aviso")?.textContent).toContain("unexpected symbol");

    const textosAba = await abrirAba(el, "textos");
    const [arquivo] = linhas(textosAba);
    await abrirLinha(arquivo!);
    expect(textos(arquivo!, ".diff .adicionada")).toEqual(["+1@vrcas.rsw##"]);
    expect(textos(arquivo!, ".diff .removida")).toEqual(["-velho.rsw##"]);
    expect(arquivo!.querySelectorAll(".diff .linha").length).toBe(6);
  });

  it("a busca e as linhas abertas de uma aba continuam lá depois de ir a outra e voltar", async () => {
    const { el } = await montarPronta();
    const itens = el.querySelector<HTMLElement>("[data-testid=datamine-conteudo-itens-novos]")!;
    await buscar(itens, "adaga");
    await abrirAba(el, "caixas");
    const deVolta = await abrirAba(el, "itens-novos");
    expect(deVolta.querySelector<HTMLInputElement>("[data-testid=datamine-busca]")?.value).toBe("adaga");
    expect(linhas(deVolta).length).toBe(1);
  });

  it("erro no relatório não derruba o resumo, e tentar de novo pede só o relatório", async () => {
    const { http, el } = montar();
    await esperar();
    http.expectOne(URL_PATCH).flush(patch());
    http
      .expectOne(URL_DADOS)
      .flush({ message: "Relatório não encontrado." }, { status: 404, statusText: "Not Found" });
    await esperar();
    expect(el.querySelector("[data-testid=datamine-indicadores]")).not.toBeNull();
    const aviso = el.querySelector("[data-testid=datamine-relatorio] ui-aviso")!;
    expect(aviso.textContent).toContain("Não foi possível carregar o relatório do patch.");
    expect(aviso.textContent).toContain("Relatório não encontrado.");

    aviso.querySelector<HTMLButtonElement>("button")?.click();
    http.expectNone(URL_PATCH);
    http.expectOne(URL_DADOS).flush(RELATORIO_EXEMPLO);
    await esperar();
    expect(el.querySelector("[data-testid=datamine-abas]")).not.toBeNull();
  });

  it("erro no resumo mostra a mensagem da API e tenta de novo", async () => {
    const { http, el } = montar();
    await esperar();
    http
      .expectOne(URL_PATCH)
      .flush({ message: "Patch não encontrado." }, { status: 404, statusText: "Not Found" });
    http.expectOne(URL_DADOS).flush(RELATORIO_EXEMPLO);
    await esperar();
    expect(el.querySelector("ui-aviso")?.textContent).toContain("Patch não encontrado.");
    expect(el.querySelector("[data-testid=datamine-abas]")).toBeNull();

    el.querySelector<HTMLButtonElement>("ui-aviso button")?.click();
    http.expectOne(URL_PATCH).flush(patch());
    await esperar();
    expect(el.querySelector("[data-testid=datamine-abas]")).not.toBeNull();
  });

  it("relatório sem nenhuma mudança mostra o estado vazio no lugar das abas", async () => {
    const { el } = await montarPronta({ meta: { title: "Patch LATAM 2026-11-24" } });
    expect(el.querySelector("[data-testid=datamine-relatorio] ui-vazio")?.textContent).toContain(
      "sem nenhuma mudança para mostrar",
    );
    expect(el.querySelector("[data-testid=datamine-abas]")).toBeNull();
  });

  it("aba sem nada mostra o próprio estado vazio", async () => {
    const { el } = await montarPronta({ grf: { added: [["data\\a.txt", 1, "text"]] } });
    const aba = el.querySelector<HTMLElement>("[data-testid=datamine-conteudo-itens-novos]")!;
    expect(aba.querySelector("ui-vazio")?.textContent).toContain("Este patch não trouxe itens novos.");
    expect(aba.querySelector("[data-testid=datamine-contagem]")?.textContent).toBe("Nada nesta lista.");
  });
});
