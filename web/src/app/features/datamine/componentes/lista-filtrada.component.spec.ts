import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import type { FiltroLista } from "../data/filtro";
import { LinhaDaListaDirective, ListaFiltradaComponent } from "./lista-filtrada.component";

interface Linha {
  nome: string;
  tipo: string;
}

@Component({
  selector: "app-anfitriao-lista",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ListaFiltradaComponent, LinhaDaListaDirective],
  template: `
    <app-lista-filtrada [itens]="itens()" [textoDe]="textoDe" [filtros]="filtros" rotuloBusca="Buscar linha">
      <ng-template appLinhaDaLista [tipo]="itens()" let-l>
        <span class="nome">{{ l.nome }}</span>
      </ng-template>
    </app-lista-filtrada>
  `,
})
class AnfitriaoListaComponent {
  readonly itens = signal<Linha[]>([]);
  readonly textoDe = (l: Linha): string => l.nome.toLowerCase();
  readonly filtros: FiltroLista<Linha>[] = [
    {
      chave: "tipo",
      rotulo: "Filtrar por tipo",
      rotuloTodos: "Todos",
      valorDe: (l) => l.tipo,
      opcoes: [
        ["par", "Pares"],
        ["impar", "Ímpares"],
      ],
    },
  ];
}

const gerar = (n: number): Linha[] =>
  Array.from({ length: n }, (_, i) => ({ nome: `linha ${i + 1}`, tipo: i % 2 === 0 ? "impar" : "par" }));

describe("ListaFiltradaComponent", () => {
  function montar(itens: Linha[]) {
    const fixture = TestBed.createComponent(AnfitriaoListaComponent);
    fixture.componentInstance.itens.set(itens);
    fixture.autoDetectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const nomes = () => Array.from(el.querySelectorAll(".nome")).map((n) => n.textContent);
    const contagem = () => el.querySelector("[data-testid=datamine-contagem]")?.textContent;
    const mais = () => el.querySelector<HTMLButtonElement>("[data-testid=datamine-mostrar-mais]");
    return { fixture, el, nomes, contagem, mais };
  }
  const esperar = () => new Promise((r) => setTimeout(r));

  it("mostra só as primeiras 60 linhas e traz as próximas ao pedir", async () => {
    const { nomes, contagem, mais } = montar(gerar(150));
    await esperar();
    expect(nomes().length).toBe(60);
    expect(contagem()).toBe("Mostrando 60 de 150 resultados.");
    expect(mais()?.textContent?.trim()).toBe("Mostrar mais 60 (90 restantes)");

    mais()?.click();
    await esperar();
    expect(nomes().length).toBe(120);
    expect(mais()?.textContent?.trim()).toBe("Mostrar mais 30 (30 restantes)");

    mais()?.click();
    await esperar();
    expect(nomes().length).toBe(150);
    expect(contagem()).toBe("150 resultados.");
    expect(mais()).toBeNull();
  });

  it("a busca tem rótulo visível, filtra, anuncia a contagem e volta à primeira página", async () => {
    const { el, nomes, contagem, mais } = montar(gerar(150));
    await esperar();
    mais()?.click();
    await esperar();

    const campo = el.querySelector<HTMLInputElement>("input[type=search]")!;
    expect(el.querySelector(`label[for="${campo.id}"]`)?.textContent).toBe("Buscar linha");
    expect(el.querySelector("[data-testid=datamine-contagem]")?.getAttribute("role")).toBe("status");

    campo.value = "LINHA 1";
    campo.dispatchEvent(new Event("input"));
    await esperar();
    expect(nomes().length).toBe(60);
    expect(contagem()).toBe("Mostrando 60 de 70 resultados encontrados (150 no total).");

    campo.value = "linha 15";
    campo.dispatchEvent(new Event("input"));
    await esperar();
    expect(nomes()).toEqual(["linha 15", "linha 115", "linha 150"]);
    expect(contagem()).toBe("3 de 150 resultados.");
  });

  it("os chips trazem a contagem e filtram junto com a busca", async () => {
    const { el, nomes } = montar(gerar(10));
    await esperar();
    const chips = Array.from(el.querySelectorAll<HTMLButtonElement>("ui-chips-filtro button"));
    expect(chips.map((c) => c.textContent?.replace(/\s+/g, " ").trim())).toEqual([
      "Todos 10",
      "Pares 5",
      "Ímpares 5",
    ]);
    expect(chips[0]!.getAttribute("aria-pressed")).toBe("true");

    chips[1]!.click();
    await esperar();
    expect(nomes()).toEqual(["linha 2", "linha 4", "linha 6", "linha 8", "linha 10"]);
    expect(chips[1]!.getAttribute("aria-pressed")).toBe("true");
  });

  it("com um valor só no filtro, os chips não aparecem", async () => {
    const { el } = montar([{ nome: "única", tipo: "par" }]);
    await esperar();
    expect(el.querySelector("ui-chips-filtro")).toBeNull();
  });

  it("lista sem linhas e busca sem resultado têm frases diferentes", async () => {
    const vazia = montar([]);
    await esperar();
    expect(vazia.el.querySelector("ui-vazio")?.textContent).toContain("Nada por aqui neste patch.");
    expect(vazia.el.querySelector("[data-testid=datamine-linhas]")).toBeNull();

    const cheia = montar(gerar(3));
    await esperar();
    const campo = cheia.el.querySelector<HTMLInputElement>("input[type=search]")!;
    campo.value = "zzz";
    campo.dispatchEvent(new Event("input"));
    await esperar();
    expect(cheia.el.querySelector("ui-vazio")?.textContent).toContain("Nada encontrado");
    expect(cheia.contagem()).toBe("Nenhum resultado para a busca e os filtros.");
  });
});
