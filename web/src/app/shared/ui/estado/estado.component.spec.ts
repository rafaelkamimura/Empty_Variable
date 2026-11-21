import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { type Carregavel, carregando, comErro, pronto } from "../../utils/carregavel";
import { EstadoComponent, EstadoProntoDirective } from "./estado.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EstadoComponent, EstadoProntoDirective],
  template: `
    <ui-estado [valor]="valor()" mensagemVazio="Vazio." (tentarNovamente)="tentativas = tentativas + 1">
      @if (podeCriar()) {
        <a slot="vazio-acao" href="#novo">Nova entrada</a>
      }
      <ng-template uiEstadoPronto [tipo]="valor()" let-lista>
        <span class="item">{{ lista.length }} itens</span>
      </ng-template>
    </ui-estado>
  `,
})
class HospedeiroComponent {
  readonly valor = signal<Carregavel<string[]>>(carregando());
  // Um @if antes do template de dados também é um TemplateRef: o ui-estado não pode confundi-los.
  readonly podeCriar = signal(true);
  tentativas = 0;
}

describe("EstadoComponent", () => {
  function montar() {
    const fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const mudar = (v: Carregavel<string[]>) => {
      fixture.componentInstance.valor.set(v);
      fixture.detectChanges();
    };
    return { fixture, el, mudar };
  }

  it("carregando: skeleton e anúncio para leitores de tela, sem texto visível", () => {
    const { el } = montar();
    expect(el.querySelector("ui-skeleton")).not.toBeNull();
    expect(el.querySelector("[role=status]")?.textContent).toContain("Carregando");
  });

  it("erro: aviso com a mensagem e Tentar novamente", () => {
    const { el, mudar, fixture } = montar();
    mudar(comErro("Falhou a API"));
    const aviso = el.querySelector("ui-aviso")!;
    expect(aviso.getAttribute("role")).toBe("alert");
    expect(aviso.textContent).toContain("Falhou a API");
    (aviso.querySelector("button") as HTMLButtonElement).click();
    expect(fixture.componentInstance.tentativas).toBe(1);
  });

  it("vazio: marca, frase e a ação projetada", () => {
    const { el, mudar } = montar();
    mudar(pronto([]));
    expect(el.querySelector("ui-vazio .frase")?.textContent).toBe("Vazio.");
    expect(el.querySelector("ui-vazio a")?.textContent).toBe("Nova entrada");
    expect(el.querySelector(".item")).toBeNull();
  });

  it("pronto: renderiza o template com os dados", () => {
    const { el, mudar } = montar();
    mudar(pronto(["a", "b"]));
    expect(el.querySelector(".item")?.textContent).toBe("2 itens");
    expect(el.querySelector("ui-skeleton, ui-aviso, ui-vazio")).toBeNull();
  });
});
