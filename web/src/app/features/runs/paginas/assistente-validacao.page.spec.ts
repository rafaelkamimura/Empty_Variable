import type { ComponentFixture } from "@angular/core/testing";
import { TestBed } from "@angular/core/testing";
import { cat, classes } from "../data/runs.modelos.spec";
import { AssistenteRunPage } from "./assistente-run.page";
import { botao, configurar, esperar, parametros, passoAtual, torreComFuncoes } from "./runs-teste.spec";

/** Assistente de run nova, já carregado e no passo "Participantes". */
async function noPassoParticipantes(): Promise<{ f: ComponentFixture<AssistenteRunPage>; el: HTMLElement }> {
  const { http } = configurar();
  const f = TestBed.createComponent(AssistenteRunPage);
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  f.autoDetectChanges();
  http.expectOne("/api/jogadores").flush(cat.jogadores);
  http.expectOne("/api/instancias").flush([torreComFuncoes]);
  http.expectOne("/api/itens").flush([]);
  http.expectOne("/api/config-pontuacao").flush([parametros]);
  await esperar();
  http.expectOne((r) => r.url === "/api/classes").flush(classes);
  await esperar();
  botao(el.querySelector("app-acoes-passo")!, "Próximo").click();
  await esperar();
  expect(passoAtual(el)).toBe("Participantes");
  return { f, el };
}

const participantes = (el: HTMLElement) => el.querySelector<HTMLElement>("app-passo-participantes")!;
const proximoDe = (passo: HTMLElement) =>
  botao(passo.closest(".passo")!.querySelector("app-acoes-passo")!, "Próximo");
const selectPersonagem = (el: HTMLElement, linha = 0) =>
  participantes(el).querySelectorAll<HTMLSelectElement>("[data-linha]")[linha]!.querySelector("select")!;

describe("AssistenteRunPage: validação e foco", () => {
  afterEach(() => document.querySelectorAll("app-assistente-run-page").forEach((e) => e.remove()));

  it("o erro do campo só aparece depois de sair dele", async () => {
    const { el } = await noPassoParticipantes();
    const select = selectPersonagem(el);
    expect(participantes(el).querySelector(".ui-campo-erro")).toBeNull();
    expect(select.getAttribute("aria-invalid")).toBeNull();

    select.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await esperar();
    const erro = participantes(el).querySelector(".ui-campo-erro")!;
    expect(erro.textContent).toContain("Escolha o personagem.");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    expect(select.getAttribute("aria-describedby")).toContain(erro.id);
  });

  it("teclado: o Próximo é alcançável pelo Tab; com pendência não avança e o foco vai ao campo inválido", async () => {
    const { el } = await noPassoParticipantes();
    const proximo = proximoDe(participantes(el));
    expect(proximo.disabled).toBeFalse();
    expect(proximo.tabIndex).toBe(0);

    proximo.focus();
    // Enter num <button> dispara o clique (o navegador faz isso; aqui, o clique direto).
    proximo.click();
    await esperar();
    expect(passoAtual(el)).toBe("Participantes");
    expect(document.activeElement).toBe(selectPersonagem(el));
    const erros = Array.from(participantes(el).querySelectorAll(".ui-campo-erro")).map((e) => e.textContent);
    expect(erros).toEqual(["Escolha o personagem.", "Escolha a classe."]);
    expect(el.querySelector("[data-pendencias=participantes]")?.textContent).toContain(
      "Participante 1: escolha o personagem.",
    );
  });

  it("sem participante nenhum, o foco vai ao resumo de pendências", async () => {
    const { el } = await noPassoParticipantes();
    botao(participantes(el), "Remover").click();
    await esperar();
    proximoDe(participantes(el)).click();
    await esperar();
    const resumo = el.querySelector<HTMLElement>("[data-pendencias=participantes]")!;
    expect(document.activeElement).toBe(resumo);
    expect(resumo.textContent).toContain("Adicione ao menos um participante.");
  });

  it("adicionar leva o foco ao primeiro campo da linha nova; remover, ao Remover da seguinte ou ao Adicionar", async () => {
    const { el } = await noPassoParticipantes();
    botao(participantes(el), "Adicionar participante").click();
    await esperar();
    expect(document.activeElement).toBe(selectPersonagem(el, 1));

    const remover = () =>
      Array.from(participantes(el).querySelectorAll<HTMLButtonElement>("[data-acao=remover]"));
    remover()[0]!.click();
    await esperar();
    expect(remover().length).toBe(1);
    expect(document.activeElement).toBe(remover()[0]!);

    remover()[0]!.click();
    await esperar();
    expect(document.activeElement).toBe(botao(participantes(el), "Adicionar participante"));
  });
});
