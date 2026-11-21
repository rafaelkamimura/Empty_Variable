import { TestBed } from "@angular/core/testing";
import { ImagemItemComponent, limparFundoBranco, urlImagemItem } from "./imagem-item.component";

describe("imagem do item (M14, D41)", () => {
  it("remove o fundo branco da borda e preserva uma área branca dentro do item", () => {
    const imagem = new ImageData(5, 5);
    imagem.data.fill(255);
    for (let y = 1; y < 4; y++) {
      for (let x = 1; x < 4; x++) {
        if (x === 2 && y === 2) continue;
        imagem.data.set([20, 40, 70, 255], (y * 5 + x) * 4);
      }
    }
    expect(limparFundoBranco(imagem)).toBeTrue();
    expect(imagem.data[3]).toBe(0);
    expect(imagem.data[(2 * 5 + 2) * 4 + 3]).toBe(255);
    expect(imagem.data[(1 * 5 + 1) * 4 + 3]).toBe(255);
  });

  it("monta o endereço do cache só com ID inteiro positivo", () => {
    expect(urlImagemItem(1000397)).toBe("api/imagens/item/1000397");
    expect(urlImagemItem(501, true)).toBe("api/imagens/item/501?tipo=ilustracao");
    expect(urlImagemItem(null)).toBeNull();
    expect(urlImagemItem(undefined)).toBeNull();
    expect(urlImagemItem(0)).toBeNull();
    expect(urlImagemItem(1.5)).toBeNull();
  });

  it("sem ID mostra o ícone desenhado; com ID, a imagem; se a imagem falhar, volta ao ícone", () => {
    const f = TestBed.createComponent(ImagemItemComponent);
    f.componentRef.setInput("nome", "Alma de Betelgeuse");
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("app-icone")).not.toBeNull();

    f.componentRef.setInput("idJogo", 1000397);
    f.detectChanges();
    expect(el.querySelector("img")?.getAttribute("src")).toBe("api/imagens/item/1000397");

    el.querySelector("img")!.dispatchEvent(new Event("error"));
    f.detectChanges();
    expect(el.querySelector("img")).toBeNull();
    expect(el.querySelector("app-icone")).not.toBeNull();

    // Outro item no mesmo componente tenta a imagem de novo
    f.componentRef.setInput("idJogo", 1000396);
    f.detectChanges();
    expect(el.querySelector("img")?.getAttribute("src")).toBe("api/imagens/item/1000396");
  });
});
