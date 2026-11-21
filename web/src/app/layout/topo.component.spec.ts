import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import type { UsuarioMe } from "../core/modelos";
import { TopoComponent } from "./topo.component";

const usuario = (jogador: boolean): UsuarioMe => ({
  id: "u1",
  discordUsername: "ana",
  globalName: "Ana",
  avatarUrl: null,
  papel: "MEMBRO",
  jogador: jogador ? ({ id: "j1", apelido: "Ana" } as UsuarioMe["jogador"]) : null,
  vinculoPendente: false,
});

describe("TopoComponent", () => {
  function montar() {
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideNoopAnimations()] });
    const f = TestBed.createComponent(TopoComponent);
    return { f, el: f.nativeElement as HTMLElement };
  }

  it("saldo em pt-BR para quem tem vínculo; 'Sem vínculo' para quem não tem", () => {
    const { f, el } = montar();
    f.componentRef.setInput("usuario", usuario(true));
    f.componentRef.setInput("saldo", 1234);
    f.detectChanges();
    expect(el.querySelector("[data-testid=saldo-topo]")?.textContent).toContain("1.234 pts");
    expect(el.querySelector("[aria-label='Menu do perfil']")?.textContent?.trim()).toBe("A");
    expect(el.querySelector("a[aria-label='Empty Variable, início']")).not.toBeNull();

    f.componentRef.setInput("usuario", usuario(false));
    f.detectChanges();
    expect(el.querySelector("[data-testid=saldo-topo]")?.textContent).toContain("Sem vínculo");
  });
});
