import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { BotaoComponent } from "../botao/botao.component";
import { PaginaComponent } from "./pagina.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PaginaComponent, BotaoComponent],
  template: `
    <ui-pagina titulo="Estoque" subtitulo="Itens do grupo.">
      <button uiBotao variante="principal">Nova entrada</button>
      <nav slot="abas">abas</nav>
      <p id="corpo">corpo</p>
    </ui-pagina>
  `,
})
class HospedeiroComponent {}

describe("PaginaComponent", () => {
  it("título vira h1 e a ação principal vai para o cabeçalho", () => {
    const fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll("h1").length).toBe(1);
    expect(el.querySelector("h1")?.textContent).toBe("Estoque");
    expect(el.querySelector("header p")?.textContent).toBe("Itens do grupo.");
    expect(el.querySelector("header .acao button")?.textContent?.trim()).toBe("Nova entrada");
    expect(el.querySelector("header #corpo")).toBeNull();
    const ordem = Array.from(el.querySelector("ui-pagina")!.children).map((c) => c.tagName);
    expect(ordem).toEqual(["HEADER", "NAV", "P"]);
  });
});
