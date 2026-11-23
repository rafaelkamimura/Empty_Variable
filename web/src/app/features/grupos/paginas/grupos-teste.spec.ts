// Utilitários comuns aos specs das páginas dos grupos (sem testes próprios).
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { Acao } from "../../../core/acao";
import { comReserva, comVaga, type Grupo, type OpcoesGrupos, vagasIniciais } from "../data/grupos.modelos";
import { classesGrupo, personagensGrupo } from "../data/grupos.modelos.spec";

export const esperar = () => new Promise((r) => setTimeout(r));

export const botao = (raiz: ParentNode, texto: string) =>
  Array.from(raiz.querySelectorAll<HTMLButtonElement>("button, a")).find(
    (b) => b.textContent?.trim() === texto,
  ) as HTMLButtonElement;

export const opcoes: OpcoesGrupos = {
  instancias: [{ id: "i-torre", nome: "Torre da Constelação" }],
  classes: classesGrupo,
  personagens: personagensGrupo,
};

/** Grupo aberto com uma obrigatória de Mestre Celestial na vaga 1. */
export const grupoAberto: Grupo = {
  id: "g-1",
  instancia: { id: "i-torre", nome: "Torre da Constelação" },
  agendadoEm: "2026-11-24T23:30:00.000Z",
  fechadoEm: null,
  vagas: comVaga(comReserva(vagasIniciais(), "OBRIGATORIA"), 0, { classeId: "c-mtk", importancia: 5 }),
};

export function configurar() {
  const avisar = jasmine.createSpy("avisar");
  const executar = jasmine
    .createSpy("executar")
    .and.callFake(async (f: () => Promise<unknown>, ok: string) => {
      try {
        await f();
        avisar(ok);
        return true;
      } catch {
        return false;
      }
    });
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      provideNoopAnimations(),
      { provide: Acao, useValue: { executar, avisar } },
    ],
  });
  return { http: TestBed.inject(HttpTestingController), avisar };
}
