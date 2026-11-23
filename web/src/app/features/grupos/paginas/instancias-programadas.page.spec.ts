import { TestBed } from "@angular/core/testing";
import type { AgendaProgramada, VagaProgramada } from "../data/programadas.modelos";
import { InstanciasProgramadasPage } from "./instancias-programadas.page";
import { botao, configurar, esperar } from "./grupos-teste.spec";

const livre: VagaProgramada = {
  tipo: "LIVRE",
  classeId: null,
  classe: null,
  importancia: null,
  ocupada: false,
  meuPersonagem: null,
};
const agenda: AgendaProgramada = {
  personagens: [{ id: "p-ana", nome: "Ana-MTK", classeId: "c-mtk" }],
  grupos: [
    {
      id: "g-1",
      instancia: { nome: "Torre da Constelação" },
      agendadoEm: "2026-11-24T23:30:00.000Z",
      fechadoEm: null,
      vagas: [
        { ...livre, tipo: "OBRIGATORIA", classeId: "c-mtk", classe: "Mestre Celestial", importancia: 5 },
        ...Array.from({ length: 11 }, () => livre),
      ],
    },
  ],
};

describe("InstanciasProgramadasPage", () => {
  afterEach(() => document.querySelectorAll("app-instancias-programadas-page").forEach((e) => e.remove()));

  it("abre as vagas, valida a escolha e entra na vaga; depois recarrega a agenda", async () => {
    const { http, avisar } = configurar();
    const f = TestBed.createComponent(InstanciasProgramadasPage);
    const el = f.nativeElement as HTMLElement;
    document.body.appendChild(el);
    f.autoDetectChanges();
    http.expectOne("/api/instancias-programadas").flush(agenda);
    await esperar();
    expect(el.textContent).toContain("0/12 preenchidas");

    const ver = botao(el, "Ver vagas");
    ver.click();
    await esperar();
    expect(ver.getAttribute("aria-expanded")).toBe("true");
    const vagas = el.querySelectorAll("[aria-label='Vagas do grupo'] > li");
    expect(vagas.length).toBe(12);

    botao(vagas[0]!, "Entrar na vaga").click();
    await esperar();
    const select = vagas[0]!.querySelector("select")!;
    expect(document.activeElement).toBe(select);
    // Sem escolher: o botão não fica desabilitado; mostra o erro e volta o foco ao campo.
    botao(vagas[0]!, "Confirmar vaga").click();
    await esperar();
    expect(vagas[0]!.textContent).toContain("Escolha o personagem.");
    expect(select.getAttribute("aria-invalid")).toBe("true");
    http.expectNone("/api/instancias-programadas/g-1/participar");

    select.value = "p-ana";
    select.dispatchEvent(new Event("change"));
    botao(vagas[0]!, "Confirmar vaga").click();
    const req = http.expectOne("/api/instancias-programadas/g-1/participar");
    expect(req.request.body).toEqual({ personagemId: "p-ana", vaga: 1 });
    req.flush({ vaga: 1 });
    await esperar();
    expect(avisar).toHaveBeenCalledWith("Vaga confirmada.");
    const g = agenda.grupos[0]!;
    http.expectOne("/api/instancias-programadas").flush({
      ...agenda,
      grupos: [
        { ...g, vagas: [{ ...g.vagas[0]!, ocupada: true, meuPersonagem: "Ana-MTK" }, ...g.vagas.slice(1)] },
      ],
    });
    await esperar();
    expect(el.textContent).toContain("Você · Ana-MTK");
    expect(el.textContent).toContain("1/12 preenchidas");
  });

  it("sem personagem vinculado, avisa e mostra o caminho para o vínculo; sem grupos, o vazio", async () => {
    const { http } = configurar();
    const f = TestBed.createComponent(InstanciasProgramadasPage);
    f.autoDetectChanges();
    http.expectOne("/api/instancias-programadas").flush({ ...agenda, personagens: [] });
    await esperar();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector("a[href='/vinculo']")).not.toBeNull();

    const f2 = TestBed.createComponent(InstanciasProgramadasPage);
    f2.autoDetectChanges();
    http.expectOne("/api/instancias-programadas").flush({ grupos: [], personagens: [] });
    await esperar();
    expect((f2.nativeElement as HTMLElement).textContent).toContain("Nenhuma instância programada.");
  });
});
