import { TestBed } from "@angular/core/testing";
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Confirmacao } from "./confirmacao";
import { sairSemSalvarGuard } from "./sair-sem-salvar.guard";

const pergunta = { titulo: "Descartar?", descricao: "Será perdido.", confirmar: "Descartar", perigo: true };

function sair(alterado: boolean, confirma: boolean) {
  const perguntar = jasmine.createSpy("perguntar").and.resolveTo(confirma);
  TestBed.configureTestingModule({ providers: [{ provide: Confirmacao, useValue: { perguntar } }] });
  const resultado = TestBed.runInInjectionContext(() =>
    sairSemSalvarGuard(
      { alterado: () => alterado, confirmacaoDeSaida: () => pergunta },
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  );
  return { resultado, perguntar };
}

describe("Guarda de saída sem salvar", () => {
  it("sem alteração, sai sem perguntar", () => {
    const { resultado, perguntar } = sair(false, false);
    expect(resultado).toBeTrue();
    expect(perguntar).not.toHaveBeenCalled();
  });

  it("com alteração, faz a pergunta da tela; a resposta decide", async () => {
    const { resultado, perguntar } = sair(true, false);
    expect(await resultado).toBeFalse();
    expect(perguntar).toHaveBeenCalledWith(pergunta);
  });
});
