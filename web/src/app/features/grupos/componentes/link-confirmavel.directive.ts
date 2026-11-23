import { booleanAttribute, Directive, ElementRef, inject, input, output } from "@angular/core";

/**
 * Num link com `routerLink`: quando `appLinkConfirmavel` é verdadeiro (há alteração não salva), o
 * clique comum não navega e emite `interceptado`, para quem usa perguntar antes. Com Ctrl, Shift,
 * ⌘ ou o botão do meio, o link abre em outra aba normalmente. Com `bloqueado`, não navega e fica
 * `aria-disabled` (um `a` não tem `disabled`).
 *
 * O ouvinte é de captura no próprio link: roda antes do clique do `routerLink` e o impede.
 */
@Directive({
  selector: "a[appLinkConfirmavel]",
  host: { "[attr.aria-disabled]": "bloqueado() ? true : null" },
})
export class LinkConfirmavelDirective {
  readonly appLinkConfirmavel = input(false, { transform: booleanAttribute });
  readonly bloqueado = input(false);
  readonly interceptado = output();

  constructor() {
    inject<ElementRef<HTMLAnchorElement>>(ElementRef).nativeElement.addEventListener(
      "click",
      (e) => this.aoClicar(e),
      { capture: true },
    );
  }

  private aoClicar(e: MouseEvent): void {
    const outraAba = e.button !== 0 || e.ctrlKey || e.shiftKey || e.metaKey || e.altKey;
    if (this.bloqueado()) {
      e.preventDefault();
      e.stopImmediatePropagation();
      return;
    }
    if (!this.appLinkConfirmavel() || outraAba) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.interceptado.emit();
  }
}
