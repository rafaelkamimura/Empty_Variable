import { computed, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { AppComponent } from "../app.component";
import { routes } from "../app.routes";
import { AuthService } from "./auth.service";
import type { UsuarioMe } from "./modelos";
import { SaldoService } from "./saldo.service";
import { telaLiberada } from "./telas-liberadas";

describe("Telas liberadas", () => {
  const liberadas = routes.map((r) => r.path);

  it("libera a revisão dos rascunhos de run: lista, assistente e detalhe", () => {
    expect(liberadas).toEqual(
      jasmine.arrayContaining(["gestao/runs", "gestao/runs/nova", "gestao/runs/:id"]),
    );
  });

  it("mantém de fora a correção de run e as demais telas de gestão", () => {
    for (const path of [
      "gestao",
      "gestao/runs/:id/corrigir",
      "gestao/saldos",
      "gestao/jogadores",
      "gestao/classes",
      "gestao/instancias",
      "gestao/parametros",
      "gestao/receitas",
      "admin/runs/:id",
      "me",
    ]) {
      expect(liberadas).withContext(path).not.toContain(path);
    }
  });

  it("telaLiberada reconhece parâmetros e ignora a rota coringa", () => {
    expect(telaLiberada("/gestao/runs")).toBeTrue();
    expect(telaLiberada("/gestao/runs/nova?rascunho=abc")).toBeTrue();
    expect(telaLiberada("/gestao/runs/0b8e6a1c-0000-4000-8000-000000000000")).toBeTrue();
    expect(telaLiberada("/gestao/runs/0b8e6a1c/corrigir")).toBeFalse();
    expect(telaLiberada("/gestao/jogadores")).toBeFalse();
    expect(telaLiberada("/qualquer/coisa")).toBeFalse();
  });
});

describe("Menu do perfil", () => {
  function montar(papel: UsuarioMe["papel"]): HTMLElement {
    const usuario = signal<UsuarioMe | null>({
      id: "u1",
      discordUsername: "gestora",
      globalName: null,
      avatarUrl: null,
      papel,
      jogador: null,
      vinculoPendente: false,
    });
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: {
            usuario,
            ehAdmin: computed(() => usuario()?.papel === "ADMIN"),
            ehGestor: computed(() => usuario()?.papel !== "MEMBRO"),
          },
        },
        { provide: SaldoService, useValue: { saldo: signal(null), limpar: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>("button.avatar")?.click();
    fixture.detectChanges();
    return document.body;
  }

  afterEach(() => {
    document.querySelectorAll(".cdk-overlay-container").forEach((e) => e.remove());
  });

  it("o gestor chega à lista de runs pelo menu", () => {
    const corpo = montar("GESTOR");
    const link = corpo.querySelector<HTMLAnchorElement>('a[href="/gestao/runs"]');
    expect(link?.textContent).toContain("Runs");
  });

  it("o membro não vê o item Runs", () => {
    expect(montar("MEMBRO").querySelector('a[href="/gestao/runs"]')).toBeNull();
  });
});
