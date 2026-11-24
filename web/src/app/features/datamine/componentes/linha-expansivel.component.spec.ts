import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CorpoDaLinhaDirective, LinhaExpansivelComponent } from "./linha-expansivel.component";

@Component({
  selector: "app-anfitriao-linha",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CorpoDaLinhaDirective, LinhaExpansivelComponent],
  template: `
    <app-linha-expansivel>
      <a slot="codigo" class="codigo" href="https://exemplo.test/300500">300500</a>
      <strong>Carta Agnes</strong>
      <ng-template appCorpoDaLinha><p class="detalhe">Descrição da carta.</p></ng-template>
    </app-linha-expansivel>
  `,
})
class AnfitriaoLinhaComponent {}

describe("LinhaExpansivelComponent", () => {
  function montar() {
    const fixture = TestBed.createComponent(AnfitriaoLinhaComponent);
    fixture.autoDetectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const botao = el.querySelector<HTMLButtonElement>("button")!;
    return { fixture, el, botao };
  }
  const esperar = () => new Promise((r) => setTimeout(r));

  it("o cabeçalho é um botão fechado, e o corpo ainda não existe no DOM", () => {
    const { el, botao } = montar();
    expect(botao.type).toBe("button");
    expect(botao.textContent).toContain("Carta Agnes");
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(botao.hasAttribute("aria-controls")).toBeFalse();
    expect(el.querySelector(".detalhe")).toBeNull();
  });

  it("o clique abre o corpo, ligado ao botão por aria-controls, e o segundo clique fecha", async () => {
    const { el, botao } = montar();
    botao.click();
    await esperar();
    expect(botao.getAttribute("aria-expanded")).toBe("true");
    const corpo = el.querySelector(".corpo")!;
    expect(botao.getAttribute("aria-controls")).toBe(corpo.id);
    expect(corpo.querySelector(".detalhe")?.textContent).toBe("Descrição da carta.");

    botao.click();
    await esperar();
    expect(botao.getAttribute("aria-expanded")).toBe("false");
    expect(el.querySelector(".detalhe")).toBeNull();
  });

  it("o slot de código fica antes do botão e fora dele, para um link não ir dentro de um botão", () => {
    const { el, botao } = montar();
    const link = el.querySelector<HTMLAnchorElement>("a.codigo")!;
    expect(botao.contains(link)).toBeFalse();
    expect(botao.textContent).not.toContain("300500");
    expect(link.compareDocumentPosition(botao) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("cada linha tem o próprio id de corpo", async () => {
    const a = montar();
    const b = montar();
    a.botao.click();
    b.botao.click();
    await esperar();
    expect(a.botao.getAttribute("aria-controls")).not.toBe(b.botao.getAttribute("aria-controls"));
  });
});
