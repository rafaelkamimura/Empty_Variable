import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { GestaoGruposPage } from "./gestao-grupos.page";
import { botao, configurar, esperar, grupoAberto, opcoes, outroGrupo } from "./grupos-teste.spec";

const passoAtual = (el: HTMLElement) =>
  el
    .querySelector(".mat-step-header[aria-selected=true]")
    ?.textContent?.trim()
    .replace(/^\d+\s*/, "");
const proximoDoPasso = (el: HTMLElement) => {
  const cabecalhos = Array.from(el.querySelectorAll(".mat-step-header"));
  const atual = cabecalhos.findIndex((c) => c.getAttribute("aria-selected") === "true");
  const acoes = el.querySelectorAll("ui-acoes-passo")[atual]!;
  return acoes.querySelector<HTMLButtonElement>("button:not([matStepperPrevious])")!;
};

function iniciar(grupo?: string, confirma = true) {
  const ctx = configurar(confirma);
  const f = TestBed.createComponent(GestaoGruposPage);
  if (grupo) f.componentRef.setInput("grupo", grupo);
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  f.autoDetectChanges();
  ctx.http.expectOne("/api/gestao/grupos").flush([grupoAberto, outroGrupo]);
  ctx.http.expectOne("/api/gestao/grupos/opcoes").flush(opcoes);
  return { ...ctx, f, el };
}

const linkDoGrupo = (el: HTMLElement, nome: string) =>
  Array.from(el.querySelectorAll<HTMLAnchorElement>("[data-testid='grupos-lista'] a")).find((a) =>
    a.textContent?.includes(nome),
  )!;

describe("GestaoGruposPage", () => {
  afterEach(() => document.querySelectorAll("app-gestao-grupos-page").forEach((e) => e.remove()));

  it("novo grupo: o Próximo não avança com pendência, mostra o erro e foca o campo; cria o grupo no fim", async () => {
    const { http, el, avisar } = iniciar();
    const navegar = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    await esperar();
    expect(el.querySelector("[data-testid='grupos-lista']")?.textContent).toContain("Torre da Constelação");

    proximoDoPasso(el).click();
    await esperar();
    expect(passoAtual(el)).toBe("Instância");
    const instancia = el.querySelector<HTMLSelectElement>("app-novo-grupo select")!;
    expect(document.activeElement).toBe(instancia);
    expect(instancia.getAttribute("aria-invalid")).toBe("true");

    instancia.value = "i-torre";
    instancia.dispatchEvent(new Event("change"));
    proximoDoPasso(el).click();
    await esperar();
    expect(passoAtual(el)).toBe("Classes obrigatórias");

    // Reserva sem classe: o foco vai à classe dela.
    botao(el, "Adicionar vaga").click();
    await esperar();
    const reservas = () => el.querySelectorAll("app-reservas-grupo")[0]!;
    const classe = reservas().querySelector<HTMLSelectElement>("select")!;
    expect(document.activeElement).toBe(classe);
    proximoDoPasso(el).click();
    await esperar();
    expect(passoAtual(el)).toBe("Classes obrigatórias");
    expect(document.activeElement).toBe(classe);
    classe.value = "c-mtk";
    classe.dispatchEvent(new Event("change"));
    proximoDoPasso(el).click();
    await esperar();
    // Ainda falta a importância: o foco vai à primeira estrela.
    const estrelas = reservas().querySelectorAll<HTMLInputElement>("input[type=radio]");
    expect(document.activeElement).toBe(estrelas[0]!);
    estrelas[4]!.click();
    await esperar();
    proximoDoPasso(el).click();
    await esperar();
    expect(passoAtual(el)).toBe("Classes secundárias");
    expect(el.querySelector("[aria-label='Classes obrigatórias já escolhidas']")?.textContent).toContain(
      "Mestre Celestial (importância 5)",
    );
    proximoDoPasso(el).click();
    await esperar();

    const horario = el.querySelector<HTMLInputElement>("input[type=datetime-local]")!;
    horario.value = new Date(Date.now() + 86_400_000).toISOString().slice(0, 16);
    horario.dispatchEvent(new Event("input"));
    proximoDoPasso(el).click();
    await esperar();
    expect(passoAtual(el)).toBe("Revisão");
    expect(el.textContent).toContain("11 de 12 vagas");

    botao(el, "Confirmar e criar grupo").click();
    const req = http.expectOne((r) => r.method === "POST" && r.url === "/api/gestao/grupos");
    expect(req.request.body.instanciaId).toBe("i-torre");
    expect(req.request.body.vagas.length).toBe(12);
    expect(req.request.body.agendadoEm).toMatch(/-03:00$/);
    req.flush({ ...grupoAberto, id: "g-2" });
    await esperar();
    expect(avisar).toHaveBeenCalledWith("Grupo criado. Agora escale os personagens.");
    expect(navegar).toHaveBeenCalledWith(["/gestao/grupos"], { queryParams: { grupo: "g-2" } });
  });

  it("reservas: remover do meio e adicionar mantém a ordem, foca a nova e não herda o erro de outra", async () => {
    const { el } = iniciar();
    await esperar();
    const instancia = el.querySelector<HTMLSelectElement>("app-novo-grupo select")!;
    instancia.value = "i-torre";
    instancia.dispatchEvent(new Event("change"));
    proximoDoPasso(el).click();
    await esperar();
    const obrigatorias = () => el.querySelectorAll("app-reservas-grupo")[0]!;
    const linhas = () => Array.from(obrigatorias().querySelectorAll<HTMLElement>("[data-linha]"));
    const adicionar = () => botao(obrigatorias(), "Adicionar vaga");
    for (let i = 0; i < 3; i++) {
      adicionar().click();
      await esperar();
    }
    const [a, b, c] = linhas().map((l) => l.getAttribute("data-chave"));
    // A pessoa mexe na 2ª e sai do campo: o erro dela aparece.
    const classeB = linhas()[1]!.querySelector("select")!;
    classeB.dispatchEvent(new FocusEvent("focusout", { bubbles: true }));
    await esperar();
    expect(linhas()[1]!.textContent).toContain("Escolha a classe.");

    botao(linhas()[1]!, "Remover").click();
    await esperar();
    adicionar().click();
    await esperar();
    const chaves = linhas().map((l) => l.getAttribute("data-chave"));
    expect(chaves.slice(0, 2)).toEqual([a, c]);
    expect(chaves[2]).not.toBe(b);
    expect(linhas().map((l) => l.querySelector("legend")?.textContent)).toEqual([
      "Reserva 1",
      "Reserva 2",
      "Reserva 3",
    ]);
    // Foco no primeiro campo da reserva nova, que nasce sem erro.
    expect(document.activeElement).toBe(linhas()[2]!.querySelector("select"));
    expect(linhas()[2]!.querySelector(".ui-campo-erro")).toBeNull();

    // Uma obrigatória removida e uma secundária adicionada não compartilham o estado "tocado".
    botao(linhas()[0]!, "Remover").click();
    botao(linhas()[0]!, "Remover").click();
    botao(linhas()[0]!, "Remover").click();
    await esperar();
    proximoDoPasso(el).click();
    await esperar();
    const secundarias = el.querySelectorAll("app-reservas-grupo")[1]!;
    botao(secundarias, "Adicionar vaga").click();
    await esperar();
    expect(secundarias.querySelector(".ui-campo-erro")).toBeNull();
  });

  it("escala: Fechar grupo sem a obrigatória mostra o erro e foca a vaga; com ela, salva e fecha", async () => {
    const { http, el, avisar } = iniciar("g-1");
    await esperar();
    expect(el.querySelector("[data-testid='grupos-editor'] h2")?.textContent).toContain(
      "Torre da Constelação",
    );

    botao(el, "Fechar grupo").click();
    await esperar();
    const vaga1 = el.querySelector<HTMLSelectElement>("[data-vaga='0']")!;
    expect(document.activeElement).toBe(vaga1);
    expect(el.textContent).toContain("Preencha 1 vaga(s) obrigatória(s) para fechar o grupo.");
    http.expectNone((r) => r.method === "PATCH");

    // Só personagens da classe da reserva aparecem na obrigatória.
    const opcoesVaga = Array.from(vaga1.options).map((o) => o.textContent?.trim());
    expect(opcoesVaga).toEqual(["Vaga em aberto", "Ana-MTK · Ana", "Beto-MTK · Beto"]);
    vaga1.value = "p-ana";
    vaga1.dispatchEvent(new Event("change"));
    await esperar();
    botao(el, "Fechar grupo").click();
    const req = http.expectOne((r) => r.method === "PATCH" && r.url === "/api/gestao/grupos/g-1");
    expect(req.request.body.fechar).toBeTrue();
    expect(req.request.body.vagas[0].personagemId).toBe("p-ana");
    expect(req.request.body.ocupacaoAnterior[0]).toBeNull();
    req.flush({ ...grupoAberto, fechadoEm: "2026-11-23T15:00:00.000Z", vagas: req.request.body.vagas });
    await esperar();
    expect(avisar).toHaveBeenCalledWith("Grupo fechado.");
    expect(el.querySelector("[data-testid='grupos-lista']")?.textContent).toContain("Fechado");
    expect(el.querySelector("[data-vaga='0']")?.hasAttribute("disabled")).toBeTrue();
  });

  it("escala que mudou no servidor: mostra o erro e mantém as escolhas até recarregar", async () => {
    const { http, el } = iniciar("g-1");
    await esperar();
    const vaga2 = el.querySelector<HTMLSelectElement>("[data-vaga='1']")!;
    vaga2.value = "p-beto";
    vaga2.dispatchEvent(new Event("change"));
    botao(el, "Salvar escala").click();
    http
      .expectOne((r) => r.method === "PATCH")
      .flush(
        { mensagem: "A escala mudou. Atualize a página antes de salvar." },
        { status: 409, statusText: "Conflict" },
      );
    await esperar();
    expect(el.textContent).toContain("A escala não foi salva");
    expect(el.querySelector<HTMLSelectElement>("[data-vaga='1']")!.value).toBe("p-beto");
    botao(el, "Recarregar a escala").click();
    http.expectOne("/api/gestao/grupos").flush([grupoAberto]);
    http.expectOne("/api/gestao/grupos/opcoes").flush(opcoes);
    await esperar();
    expect(el.querySelector<HTMLSelectElement>("[data-vaga='1']")!.value).toBe("");
  });

  it("lista de grupos: links com aria-current; sem alteração, navega sem perguntar", async () => {
    const { el, perguntar } = iniciar("g-1");
    const navegar = spyOn(TestBed.inject(Router), "navigateByUrl").and.resolveTo(true);
    await esperar();
    const atual = linkDoGrupo(el, "Torre da Constelação");
    const outro = linkDoGrupo(el, "Torre (ontem)");
    expect(atual.getAttribute("aria-current")).toBe("page");
    expect(outro.getAttribute("aria-current")).toBeNull();
    expect(outro.getAttribute("href")).toBe("/gestao/grupos?grupo=g-0");
    outro.click();
    await esperar();
    expect(perguntar).not.toHaveBeenCalled();
    expect(navegar).toHaveBeenCalled();
  });

  it("escala alterada: trocar de grupo pergunta; recusando, fica no grupo com as escolhas", async () => {
    const { el, perguntar } = iniciar("g-1", false);
    const router = TestBed.inject(Router);
    const navegarUrl = spyOn(router, "navigateByUrl").and.resolveTo(true);
    const navegar = spyOn(router, "navigate").and.resolveTo(true);
    await esperar();
    const vaga2 = el.querySelector<HTMLSelectElement>("[data-vaga='1']")!;
    vaga2.value = "p-beto";
    vaga2.dispatchEvent(new Event("change"));
    await esperar();

    linkDoGrupo(el, "Torre (ontem)").click();
    await esperar();
    expect(perguntar).toHaveBeenCalledWith(
      jasmine.objectContaining({
        descricao: "As mudanças na escala de Torre da Constelação serão perdidas.",
        confirmar: "Descartar mudanças",
      }),
    );
    expect(navegarUrl).not.toHaveBeenCalled();
    expect(navegar).not.toHaveBeenCalled();
    expect(el.querySelector<HTMLSelectElement>("[data-vaga='1']")!.value).toBe("p-beto");

    // Também pelo "Novo grupo".
    botao(el, "Novo grupo").click();
    await esperar();
    expect(perguntar).toHaveBeenCalledTimes(2);
    expect(navegarUrl).not.toHaveBeenCalled();
  });

  it("escala alterada: o beforeunload avisa; aceitando a pergunta, troca de grupo", async () => {
    const { el, f, perguntar } = iniciar("g-1", true);
    const navegar = spyOn(TestBed.inject(Router), "navigate").and.resolveTo(true);
    await esperar();
    const antesDeSair = (e: BeforeUnloadEvent) =>
      (f.componentInstance as unknown as { avisarAntesDeSair(e: BeforeUnloadEvent): void }).avisarAntesDeSair(
        e,
      );
    const semAlteracao = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    antesDeSair(semAlteracao);
    expect(semAlteracao.defaultPrevented).toBeFalse();

    const vaga2 = el.querySelector<HTMLSelectElement>("[data-vaga='1']")!;
    vaga2.value = "p-beto";
    vaga2.dispatchEvent(new Event("change"));
    await esperar();
    // Disparar o evento de verdade recarregaria o Karma: chama o handler do host.
    const comAlteracao = new Event("beforeunload", { cancelable: true }) as BeforeUnloadEvent;
    antesDeSair(comAlteracao);
    expect(comAlteracao.defaultPrevented).toBeTrue();

    linkDoGrupo(el, "Torre (ontem)").click();
    await esperar();
    expect(perguntar).toHaveBeenCalled();
    expect(navegar).toHaveBeenCalledWith(["/gestao/grupos"], { queryParams: { grupo: "g-0" } });
  });

  it("enquanto salva, os links da lista ficam aria-disabled e não navegam", async () => {
    const { el, http } = iniciar("g-1");
    const navegarUrl = spyOn(TestBed.inject(Router), "navigateByUrl").and.resolveTo(true);
    await esperar();
    botao(el, "Salvar escala").click();
    await esperar();
    const outro = linkDoGrupo(el, "Torre (ontem)");
    expect(outro.getAttribute("aria-disabled")).toBe("true");
    outro.click();
    await esperar();
    expect(navegarUrl).not.toHaveBeenCalled();
    http.expectOne((r) => r.method === "PATCH").flush(grupoAberto);
    await esperar();
    expect(outro.getAttribute("aria-disabled")).toBeNull();
  });
});
