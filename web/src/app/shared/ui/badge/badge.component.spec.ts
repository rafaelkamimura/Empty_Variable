import { TestBed } from "@angular/core/testing";
import { BadgeComponent } from "./badge.component";

describe("BadgeComponent", () => {
  it("aplica só a classe do tom atual", () => {
    const f = TestBed.createComponent(BadgeComponent);
    f.detectChanges();
    const el: HTMLElement = f.nativeElement;
    expect(Array.from(el.classList).filter((c) => c.startsWith("tom-"))).toEqual([]);
    f.componentRef.setInput("tom", "sucesso");
    f.detectChanges();
    expect(Array.from(el.classList).filter((c) => c.startsWith("tom-"))).toEqual(["tom-sucesso"]);
  });
});
