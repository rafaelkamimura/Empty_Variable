import { ChangeDetectionStrategy, Component, signal } from "@angular/core";
import { type ComponentFixture, fakeAsync, flush, TestBed } from "@angular/core/testing";
import { MatSelectModule } from "@angular/material/select";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { PainelLateralComponent } from "./painel-lateral.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PainelLateralComponent, MatSelectModule],
  template: `
    <ui-painel-lateral titulo="Nova oferta" [aberto]="aberto()">
      <mat-select id="item" aria-label="Item"><mat-option value="a">A</mat-option></mat-select>
      <input id="quantidade" inputmode="numeric" />
    </ui-painel-lateral>
    <ui-painel-lateral titulo="Preço" [aberto]="abertoInicial()">
      <input id="primeiro" />
      <input id="marcado" cdkFocusInitial />
    </ui-painel-lateral>
  `,
})
class CamposComponent {
  readonly aberto = signal(false);
  readonly abertoInicial = signal(false);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [PainelLateralComponent],
  template: `
    <button id="abrir" (click)="aberto.set(true)">Abrir</button>
    <ui-painel-lateral titulo="Nova entrada" [aberto]="aberto()" (fechar)="aberto.set(false)">
      <label>Nome <input id="nome" /></label>
    </ui-painel-lateral>
  `,
})
class HospedeiroComponent {
  readonly aberto = signal(false);
}

describe("PainelLateralComponent", () => {
  let fixture: ComponentFixture<HospedeiroComponent>;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideNoopAnimations()] });
    fixture = TestBed.createComponent(HospedeiroComponent);
    fixture.autoDetectChanges();
    el = fixture.nativeElement;
    document.body.appendChild(el);
  });
  afterEach(() => el.remove());

  it("fechado não renderiza nada", () => {
    expect(el.querySelector("[role=dialog]")).toBeNull();
  });

  it("abre como diálogo nomeado, foca o primeiro campo e devolve o foco ao fechar com Esc", fakeAsync(() => {
    const abrir = el.querySelector<HTMLButtonElement>("#abrir")!;
    abrir.focus();
    abrir.click();
    flush();
    const dialogo = el.querySelector("[role=dialog]")!;
    expect(dialogo.getAttribute("aria-modal")).toBe("true");
    expect(dialogo.getAttribute("aria-label")).toBe("Nova entrada");
    expect(document.activeElement?.id).toBe("nome");

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    flush();
    expect(el.querySelector("[role=dialog]")).toBeNull();
    expect(document.activeElement).toBe(abrir);
  }));

  it("fecha no X e no fundo", fakeAsync(() => {
    fixture.componentInstance.aberto.set(true);
    flush();
    el.querySelector<HTMLButtonElement>("[aria-label=Fechar]")!.click();
    flush();
    expect(el.querySelector("[role=dialog]")).toBeNull();
    fixture.componentInstance.aberto.set(true);
    flush();
    el.querySelector<HTMLElement>(".fundo")!.click();
    flush();
    expect(el.querySelector("[role=dialog]")).toBeNull();
  }));

  it("foca um mat-select inicial e respeita cdkFocusInitial", fakeAsync(() => {
    const f = TestBed.createComponent(CamposComponent);
    f.autoDetectChanges();
    document.body.appendChild(f.nativeElement);
    f.componentInstance.aberto.set(true);
    flush();
    expect(document.activeElement?.id).toBe("item");
    f.componentInstance.aberto.set(false);
    f.componentInstance.abertoInicial.set(true);
    flush();
    expect(document.activeElement?.id).toBe("marcado");
    f.nativeElement.remove();
  }));
});
