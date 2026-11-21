import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { TabelaDirective } from "./tabela.directive";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabelaDirective],
  template: `
    <table uiTabela>
      <thead>
        <tr>
          <th>Item</th>
          <th>Qtd</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        @for (l of linhas(); track l) {
          <tr>
            <td>{{ l }}</td>
            <td>1</td>
            <td><button>Editar</button></td>
          </tr>
        }
      </tbody>
    </table>
  `,
})
class HospedeiroComponent {
  readonly linhas = signal(["Alma"]);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TabelaDirective],
  template: `
    <table uiTabela id="antiga">
      <thead>
        <tr>
          <th>Item</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Alma</td>
        </tr>
      </tbody>
    </table>
    <table uiTabela padrao id="nova">
      <thead>
        <tr>
          <th>Item</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Alma</td>
        </tr>
      </tbody>
    </table>
  `,
})
class ComparacaoComponent {}

describe("TabelaDirective", () => {
  it("marca a tabela e copia o cabeçalho para o data-label das células, inclusive de linhas novas", async () => {
    const fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector("table")?.classList).toContain("ui-tabela");
    // Sem "padrao", nenhuma aparência de célula (as tabelas antigas continuam como estão).
    expect(el.querySelector("table")?.classList).not.toContain("ui-tabela-padrao");
    const rotulos = () =>
      Array.from(el.querySelectorAll("tbody tr:last-child td")).map((td) => td.getAttribute("data-label"));
    expect(rotulos()).toEqual(["Item", "Qtd", ""]);

    fixture.componentInstance.linhas.set(["Alma", "Pó"]);
    fixture.detectChanges();
    await new Promise((r) => setTimeout(r)); // MutationObserver
    expect(el.querySelectorAll("tbody tr").length).toBe(2);
    expect(rotulos()).toEqual(["Item", "Qtd", ""]);
  });

  it("a aparência das células só vale com padrao (tabelas antigas não mudam)", () => {
    const fixture = TestBed.createComponent(ComparacaoComponent);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);
    const antiga = getComputedStyle(el.querySelector("#antiga th")!);
    const nova = getComputedStyle(el.querySelector("#nova th")!);
    expect(antiga.fontWeight).toBe("700");
    expect(antiga.borderBottomStyle).toBe("none");
    expect(nova.fontWeight).toBe("600");
    expect(nova.borderBottomStyle).toBe("solid");
    el.remove();
  });
});
