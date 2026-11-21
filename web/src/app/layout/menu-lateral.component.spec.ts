import { ChangeDetectionStrategy, Component } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { provideRouter, Router } from "@angular/router";
import { MenuLateralComponent } from "./menu-lateral.component";

@Component({ template: "", changeDetection: ChangeDetectionStrategy.OnPush })
class VazioComponent {}

describe("MenuLateralComponent", () => {
  it("lista os itens na ordem e marca o ativo com aria-current", async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: "loja", component: VazioComponent },
          { path: "farm", component: VazioComponent },
        ]),
      ],
    });
    const f = TestBed.createComponent(MenuLateralComponent);
    f.componentRef.setInput("itens", [
      { rota: "/loja", rotulo: "Loja", icone: "sacola" },
      { rota: "/farm", rotulo: "Diário de farm", icone: "ampulheta" },
    ]);
    await TestBed.inject(Router).navigateByUrl("/farm");
    f.detectChanges();
    await f.whenStable();
    const el: HTMLElement = f.nativeElement;
    expect(el.querySelector("nav")?.getAttribute("aria-label")).toBe("Menu principal");
    const links = Array.from(el.querySelectorAll("a"));
    expect(links.map((a) => a.textContent?.trim())).toEqual(["Loja", "Diário de farm"]);
    expect(links[1]?.getAttribute("aria-current")).toBe("page");
    expect(links[0]?.hasAttribute("aria-current")).toBeFalse();
  });
});
