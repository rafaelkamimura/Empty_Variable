import { ApplicationRef, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter, Router } from "@angular/router";
import { AppComponent } from "./app.component";
import { AuthService } from "./core/auth.service";
import { SaldoService } from "./core/saldo.service";

/** Página antiga: detecção padrão e um campo comum (não signal), alterado depois de renderizar. */
// eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection -- é o caso testado
@Component({ template: `<p id="texto">{{ texto }}</p>` })
class PaginaAntigaComponent {
  static ultima: PaginaAntigaComponent | null = null;
  texto = "antes";
  constructor() {
    PaginaAntigaComponent.ultima = this;
  }
}

describe("AppComponent", () => {
  it("páginas antigas (sem OnPush) redesenham depois de mudanças assíncronas", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([{ path: "antiga", component: PaginaAntigaComponent }]),
        provideNoopAnimations(),
        {
          provide: AuthService,
          useValue: { usuario: signal(null), ehAdmin: signal(false), ehGestor: signal(false) },
        },
        { provide: SaldoService, useValue: { saldo: signal(null), limpar: () => undefined } },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl("/antiga");
    // Rodadas de detecção da aplicação, como as do Zone. (O fixture.detectChanges() não serve:
    // ele força a checagem da raiz mesmo com OnPush e esconderia o problema.)
    const app = TestBed.inject(ApplicationRef);
    app.attachView(fixture.componentRef.hostView);
    app.tick();
    const texto = () => (fixture.nativeElement as HTMLElement).querySelector("#texto")?.textContent;
    expect(texto()).toBe("antes");

    // Como depois de um await: campo comum alterado, nova rodada de detecção.
    PaginaAntigaComponent.ultima!.texto = "depois";
    app.tick();
    expect(texto()).toBe("depois");
  });
});
