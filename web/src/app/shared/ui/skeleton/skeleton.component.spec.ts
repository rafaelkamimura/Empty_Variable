import { TestBed } from "@angular/core/testing";
import { SkeletonComponent } from "./skeleton.component";

describe("SkeletonComponent", () => {
  it("fica escondido de leitores de tela e desenha a quantidade pedida no formato", () => {
    const fixture = TestBed.createComponent(SkeletonComponent);
    fixture.componentRef.setInput("formato", "cartoes");
    fixture.componentRef.setInput("quantidade", 4);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute("aria-hidden")).toBe("true");
    expect(el.classList).toContain("formato-cartoes");
    expect(el.querySelectorAll(".bloco").length).toBe(4);
  });
});
