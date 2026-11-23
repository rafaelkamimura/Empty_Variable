import { TestBed } from "@angular/core/testing";
import type { ActivatedRouteSnapshot, RouterStateSnapshot } from "@angular/router";
import { Confirmacao } from "../../core/confirmacao";
import { sairDoAssistenteGuard } from "./sair-do-assistente.guard";

function sair(alterado: boolean, confirma: boolean) {
  const perguntar = jasmine.createSpy("perguntar").and.resolveTo(confirma);
  TestBed.configureTestingModule({ providers: [{ provide: Confirmacao, useValue: { perguntar } }] });
  const resultado = TestBed.runInInjectionContext(() =>
    sairDoAssistenteGuard(
      { alterado: () => alterado },
      {} as ActivatedRouteSnapshot,
      {} as RouterStateSnapshot,
      {} as RouterStateSnapshot,
    ),
  );
  return { resultado, perguntar };
}

describe("Guarda de saída do assistente de run", () => {
  it("sem alteração, sai sem perguntar", () => {
    const { resultado, perguntar } = sair(false, false);
    expect(resultado).toBeTrue();
    expect(perguntar).not.toHaveBeenCalled();
  });

  it("com alteração, pergunta se descarta; a resposta decide", async () => {
    const { resultado, perguntar } = sair(true, false);
    expect(await resultado).toBeFalse();
    expect(perguntar).toHaveBeenCalledWith(
      jasmine.objectContaining({ confirmar: "Descartar", perigo: true }),
    );
  });
});
