import { TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { GestaoGruposPage } from "./gestao-grupos.page";
import { botao, configurar, esperar, grupoAberto, opcoes } from "./grupos-teste.spec";

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

function iniciar(grupo?: string) {
  const ctx = configurar();
  const f = TestBed.createComponent(GestaoGruposPage);
  if (grupo) f.componentRef.setInput("grupo", grupo);
  const el = f.nativeElement as HTMLElement;
  document.body.appendChild(el);
  f.autoDetectChanges();
  ctx.http.expectOne("/api/gestao/grupos").flush([grupoAberto]);
  ctx.http.expectOne("/api/gestao/grupos/opcoes").flush(opcoes);
  return { ...ctx, f, el };
}

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
});
