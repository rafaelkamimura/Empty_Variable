import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { CartaoComponent } from "./cartao.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CartaoComponent],
  template: `
    <ui-cartao id="simples"><b slot="cabecalho">Topo</b>Corpo</ui-cartao>
    <button uiCartao id="botao">Clique</button>
    <a uiCartao id="link" href="#x" [destaque]="true">Ir</a>
  `,
})
class HospedeiroComponent {}

describe("CartaoComponent", () => {
  it("só <a>/<button> são clicáveis; o botão ganha type=button", () => {
    const fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const simples = el.querySelector("#simples")!;
    const botao = el.querySelector("#botao") as HTMLButtonElement;
    const link = el.querySelector("#link")!;
    expect(simples.classList).not.toContain("clicavel");
    expect(simples.querySelector(".topo b")?.textContent).toBe("Topo");
    expect(botao.classList).toContain("clicavel");
    expect(botao.type).toBe("button");
    expect(link.classList).toContain("clicavel");
    expect(link.classList).toContain("destaque");
    expect(link.hasAttribute("type")).toBeFalse();
  });
});
