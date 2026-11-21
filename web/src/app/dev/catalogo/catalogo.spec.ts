import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter } from "@angular/router";
import { routes } from "../../app.routes";
import { agruparPorNivel, entradaSelecionada, type EntradaCatalogo } from "./catalogo.modelos";
import { CatalogoPage } from "./catalogo.page";
import { ENTRADAS_CATALOGO } from "./entradas";

@Component({
  selector: "app-exemplo-falso",
  template: "exemplo",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class ExemploFalsoComponent {}

const entrada = (id: string, nivel: EntradaCatalogo["nivel"], nome = id): EntradaCatalogo => ({
  id,
  nome,
  nivel,
  descricao: "",
  carregar: () => Promise.resolve(ExemploFalsoComponent),
});

describe("catálogo de componentes", () => {
  it("agrupa por nível na ordem do Atomic Design e omite níveis vazios", () => {
    const grupos = agruparPorNivel([
      entrada("cartao", "organismo"),
      entrada("botao", "atomo", "button[uiBotao]"),
      entrada("badge", "atomo", "ui-badge"),
    ]);
    expect(grupos.map((g) => g.nivel)).toEqual(["atomo", "organismo"]);
    expect(grupos[0]!.entradas.map((e) => e.id)).toEqual(["botao", "badge"]);
  });

  it("seleciona pelo id da URL ou cai na primeira entrada", () => {
    const lista = [entrada("cartao", "organismo"), entrada("tokens", "tokens")];
    expect(entradaSelecionada(lista, "cartao")?.id).toBe("cartao");
    expect(entradaSelecionada(lista, undefined)?.id).toBe("tokens");
    expect(entradaSelecionada(lista, "nao-existe")?.id).toBe("tokens");
    expect(entradaSelecionada([], undefined)).toBeUndefined();
  });

  it("registro: ids únicos em kebab-case e todo exemplo carrega", async () => {
    const ids = ENTRADAS_CATALOGO.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const e of ENTRADAS_CATALOGO) {
      expect(e.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(await e.carregar()).toBeTruthy();
    }
  });

  it("a rota /dev/catalogo existe fora de produção", () => {
    expect(routes.some((r) => r.path === "dev/catalogo")).toBeTrue();
    expect(routes.findIndex((r) => r.path === "dev/catalogo")).toBeLessThan(
      routes.findIndex((r) => r.path === "**"),
    );
  });

  it("mostra o índice e os exemplos da entrada selecionada", async () => {
    TestBed.configureTestingModule({ imports: [CatalogoPage], providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(CatalogoPage);
    fixture.componentRef.setInput("entrada", "tokens");
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll("[data-testid=catalogo-link]").length).toBe(ENTRADAS_CATALOGO.length);
    expect(el.querySelector("h1")?.textContent).toContain("Catálogo");
    expect(el.querySelector("[aria-current=page]")?.textContent?.trim()).toBe("Tokens");
    expect(el.querySelectorAll("[data-testid=catalogo-token]").length).toBeGreaterThan(0);
  });
});
