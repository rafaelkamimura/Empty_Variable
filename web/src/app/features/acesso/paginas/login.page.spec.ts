import { TestBed } from "@angular/core/testing";
import { LoginPage, mensagemDoErro } from "./login.page";

describe("LoginPage", () => {
  it("traduz o erro do callback; o desconhecido vira a falha genérica", () => {
    expect(mensagemDoErro(undefined)).toBeNull();
    expect(mensagemDoErro("inativo")).toContain("desativado");
    expect(mensagemDoErro("qualquer")).toContain("Não foi possível entrar");
  });

  it("mostra a mensagem de acesso restrito para quem não é do servidor (CT-79)", () => {
    const f = TestBed.createComponent(LoginPage);
    f.componentRef.setInput("erro", "nao-membro");
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    const aviso = el.querySelector("[data-testid=login-erro]")!;
    expect(aviso.getAttribute("role")).toBe("alert");
    expect(aviso.textContent).toContain("Acesso restrito aos membros do servidor");
    expect(el.querySelectorAll("h1").length).toBe(1);
    expect(el.querySelector("[data-testid=login-discord]")?.getAttribute("href")).toBe("api/auth/discord");
  });

  it("sem erro, não mostra aviso", () => {
    const f = TestBed.createComponent(LoginPage);
    f.detectChanges();
    expect((f.nativeElement as HTMLElement).querySelector("ui-aviso")).toBeNull();
  });
});
