import { TestBed } from "@angular/core/testing";
import { lerZeny } from "@betel/farm";
import { CampoSalvoComponent } from "./campo-salvo.component";

const esperar = () => new Promise((r) => setTimeout(r));

function montar(resultado: boolean) {
  const f = TestBed.createComponent(CampoSalvoComponent<number | null>);
  const salvar = jasmine.createSpy("salvar").and.resolveTo(resultado);
  f.componentRef.setInput("valor", "1.000");
  f.componentRef.setInput("rotulo", "Preço de Oridecon");
  f.componentRef.setInput("ler", lerZeny);
  f.componentRef.setInput("salvar", salvar);
  let invalido = 0;
  f.componentInstance.invalido.subscribe(() => invalido++);
  f.detectChanges();
  const campo = (f.nativeElement as HTMLElement).querySelector("input")!;
  const digitar = (texto: string) => {
    campo.value = texto;
    campo.dispatchEvent(new Event("change"));
  };
  return { campo, salvar, digitar, invalido: () => invalido };
}

describe("CampoSalvoComponent", () => {
  it("o rótulo oculto é o nome do campo", () => {
    const { campo } = montar(true);
    expect(document.querySelector(`label[for="${campo.id}"]`) ?? campo.labels?.[0]).toBeTruthy();
    expect(campo.labels?.[0]?.textContent).toBe("Preço de Oridecon");
  });

  it("salva o valor lido", async () => {
    const { salvar, digitar } = montar(true);
    digitar("1,5kk");
    await esperar();
    expect(salvar).toHaveBeenCalledWith(1_500_000);
  });

  it("texto inválido volta ao valor atual e avisa, sem salvar", () => {
    const { salvar, digitar, campo, invalido } = montar(true);
    digitar("abc");
    expect(salvar).not.toHaveBeenCalled();
    expect(campo.value).toBe("1.000");
    expect(invalido()).toBe(1);
  });

  it("valor igual ao atual não salva; falha ao salvar volta ao atual", async () => {
    const { salvar, digitar, campo } = montar(false);
    digitar("1000");
    expect(salvar).not.toHaveBeenCalled();
    digitar("2k");
    await esperar();
    expect(salvar).toHaveBeenCalledWith(2000);
    expect(campo.value).toBe("1.000");
  });

  it("o mesmo valor enquanto a gravação anterior não volta não é mandado de novo", async () => {
    const { salvar, digitar } = montar(true);
    let liberar: (ok: boolean) => void = () => undefined;
    salvar.and.returnValue(new Promise<boolean>((r) => (liberar = r)));
    digitar("2k");
    digitar("2k");
    expect(salvar).toHaveBeenCalledTimes(1);
    liberar(true);
    await esperar();
  });
});
