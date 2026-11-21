import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { BotaoComponent, type VarianteBotao } from "./botao.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent],
  template: `
    <button
      uiBotao
      [variante]="variante()"
      [carregando]="carregando()"
      [disabled]="desabilitado()"
      (click)="cliques = cliques + 1"
    >
      Salvar
    </button>
    <a uiBotao href="#x" [disabled]="desabilitado()">Ir</a>
  `,
})
class HospedeiroComponent {
  readonly variante = signal<VarianteBotao>("secundario");
  readonly carregando = signal(false);
  readonly desabilitado = signal(false);
  cliques = 0;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent],
  template: `
    <a uiBotao id="desabilitado" href="#nao-navegar" disabled (click)="cliques = cliques + 1">Ir</a>
    <a uiBotao id="carregando" href="#nao-navegar" carregando (click)="cliques = cliques + 1">Ir</a>
  `,
})
class LinkComponent {
  cliques = 0;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BotaoComponent],
  template: `
    <form (submit)="$event.preventDefault(); envios = envios + 1">
      <input name="x" />
      <button uiBotao id="padrao">Cancelar</button>
      <button uiBotao id="enviar" type="submit" variante="principal">Enviar</button>
      <button uiBotao id="atributo" disabled>Indisponível</button>
    </form>
  `,
})
class FormularioComponent {
  envios = 0;
}

describe("BotaoComponent", () => {
  function montar() {
    const fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    const botao: HTMLButtonElement = fixture.nativeElement.querySelector("button");
    const link: HTMLAnchorElement = fixture.nativeElement.querySelector("a");
    return { fixture, botao, link, host: fixture.componentInstance };
  }

  it("aplica a variante e usa type=button por padrão", () => {
    const { fixture, botao, host } = montar();
    expect(botao.type).toBe("button");
    expect(botao.classList).toContain("variante-secundario");
    host.variante.set("principal");
    fixture.detectChanges();
    expect(botao.classList).toContain("variante-principal");
    expect(botao.classList).not.toContain("variante-secundario");
  });

  it("carregando: desabilita, anuncia aria-busy e mostra o indicador", () => {
    const { fixture, botao, host } = montar();
    host.carregando.set(true);
    fixture.detectChanges();
    expect(botao.disabled).toBeTrue();
    expect(botao.getAttribute("aria-busy")).toBe("true");
    expect(botao.querySelector(".indicador")).not.toBeNull();
    botao.click();
    expect(host.cliques).toBe(0);
  });

  it("disabled vale para <button> (nativo) e para <a> (aria-disabled e fora do Tab)", () => {
    const { fixture, botao, link, host } = montar();
    expect(link.hasAttribute("aria-disabled")).toBeFalse();
    host.desabilitado.set(true);
    fixture.detectChanges();
    expect(botao.disabled).toBeTrue();
    expect(link.getAttribute("aria-disabled")).toBe("true");
    expect(link.getAttribute("tabindex")).toBe("-1");
    expect(link.hasAttribute("type")).toBeFalse();
  });

  it("<a> desabilitado ou carregando não navega no clique de verdade", () => {
    const fixture = TestBed.createComponent(LinkComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const hashAntes = window.location.hash;
    const desabilitado = el.querySelector<HTMLAnchorElement>("#desabilitado")!;
    const carregando = el.querySelector<HTMLAnchorElement>("#carregando")!;
    for (const link of [desabilitado, carregando]) {
      const evento = new MouseEvent("click", { bubbles: true, cancelable: true });
      link.dispatchEvent(evento);
      expect(evento.defaultPrevented).toBeTrue();
    }
    expect(window.location.hash).toBe(hashAntes);
    expect(fixture.componentInstance.cliques).toBe(0);
  });

  it("respeita type estático (submit) e aceita disabled/carregando como atributo puro", () => {
    const fixture = TestBed.createComponent(FormularioComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const enviar = el.querySelector<HTMLButtonElement>("#enviar")!;
    expect(enviar.type).toBe("submit");
    enviar.click();
    expect(fixture.componentInstance.envios).toBe(1);
    expect(el.querySelector<HTMLButtonElement>("#padrao")!.type).toBe("button");
    expect(el.querySelector<HTMLButtonElement>("#atributo")!.disabled).toBeTrue();
  });
});
