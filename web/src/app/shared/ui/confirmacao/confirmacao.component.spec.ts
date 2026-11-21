import { Dialog } from "@angular/cdk/dialog";
import { ApplicationRef } from "@angular/core";
import { TestBed } from "@angular/core/testing";
import { confirmar } from "./confirmacao.component";

describe("ConfirmacaoComponent", () => {
  afterEach(() => document.querySelectorAll(".cdk-overlay-container").forEach((e) => e.remove()));

  function abrir(perigo = true) {
    const dialog = TestBed.inject(Dialog);
    const resposta = confirmar(dialog, {
      titulo: "Cancelar a compra?",
      descricao: "Os 300 pts voltam para o seu saldo.",
      confirmar: "Cancelar compra",
      perigo,
    });
    TestBed.inject(ApplicationRef).tick();
    const painel = document.querySelector<HTMLElement>("[role=alertdialog]")!;
    return { resposta, painel, botoes: Array.from(painel.querySelectorAll("button")) };
  }

  it("mostra título, efeito e o verbo; nomeia o diálogo e foca a opção segura", async () => {
    const { painel, botoes, resposta } = abrir();
    expect(painel.getAttribute("aria-labelledby")).toBe("ui-confirmacao-titulo");
    expect(document.getElementById("ui-confirmacao-titulo")?.textContent).toBe("Cancelar a compra?");
    expect(document.getElementById("ui-confirmacao-descricao")?.textContent).toContain("300 pts");
    expect(botoes.map((b) => b.textContent?.trim())).toEqual(["Voltar", "Cancelar compra"]);
    expect(botoes[1]?.classList).toContain("variante-perigo");
    await new Promise((r) => setTimeout(r));
    expect(document.activeElement).toBe(botoes[0]!);
    botoes[0]!.click();
    expect(await resposta).toBeFalse();
  });

  it("resolve true ao confirmar", async () => {
    const { botoes, resposta } = abrir(false);
    expect(botoes[1]?.classList).toContain("variante-principal");
    botoes[1]!.click();
    expect(await resposta).toBeTrue();
  });
});
