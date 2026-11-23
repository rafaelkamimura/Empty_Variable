import { bloqueioPapel, type UsuarioSistema } from "./admin-usuarios.component";
import { provideHttpClient } from "@angular/common/http";
import { HttpTestingController, provideHttpClientTesting } from "@angular/common/http/testing";
import { type ComponentFixture, TestBed } from "@angular/core/testing";
import { provideNoopAnimations } from "@angular/platform-browser/animations";
import { provideRouter } from "@angular/router";
import { CONFIG_V1 } from "@betel/scoring";
import {
  apiParaFormulario,
  type Classe,
  formularioParaApi,
  paraCentesimos,
  paraConfigMotor,
  type VersaoParametros,
} from "../shared/dominio/cadastros";
import { AdminClassesComponent } from "./admin-classes.component";
import { AdminParametrosComponent } from "./admin-parametros.component";

const texto = (f: ComponentFixture<unknown>) => (f.nativeElement as HTMLElement).textContent ?? "";
const esperar = () => new Promise((r) => setTimeout(r));

const V1: VersaoParametros = {
  id: "c1",
  versao: 1,
  base: 100,
  alphaCentesimos: 50,
  sConcluidaCentesimos: 100,
  sFalhaCentesimos: 50,
  sAbortadaCentesimos: 0,
  pctEssencialBp: 2000,
  pctImportanteBp: 1000,
  pctComplementarBp: 500,
  tetoCredoresBp: 5000,
  vigenteDesde: "2026-11-14T12:00:00.000Z",
  criadaPorId: null,
};

function configurar(): HttpTestingController {
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()],
  });
  return TestBed.inject(HttpTestingController);
}

describe("Conversões de parâmetros", () => {
  it("decimais com até 2 casas viram centésimos; mais casas ou negativos são recusados", () => {
    expect(paraCentesimos(1.5)).toBe(150);
    expect(paraCentesimos(0.07)).toBe(7);
    expect(paraCentesimos(20)).toBe(2000);
    expect(paraCentesimos(0.555)).toBeNull();
    expect(paraCentesimos(-1)).toBeNull();
    expect(paraCentesimos(Number.NaN)).toBeNull();
  });

  it("ida e volta do formulário preserva a v1, que corresponde à config do motor", () => {
    const { erros, api } = formularioParaApi(apiParaFormulario(V1));
    expect(erros).toEqual([]);
    expect(paraConfigMotor(api!)).toEqual(CONFIG_V1);
  });

  it("aponta o campo com erro (B fracionário, teto acima de 100%)", () => {
    const f = { ...apiParaFormulario(V1), base: 100.5, tetoCredores: 120 };
    const { erros, api } = formularioParaApi(f);
    expect(api).toBeNull();
    expect(erros.join(" ")).toContain("B:");
    expect(erros.join(" ")).toContain("Teto dos credores");
  });
});

describe("AdminParametrosComponent", () => {
  it("mostra a prévia com a nova versão, envia em centésimos/pontos-base e esconde a taxa da loja do gestor", async () => {
    const http = configurar();
    const f = TestBed.createComponent(AdminParametrosComponent);
    f.detectChanges();
    http.expectOne("/api/config-pontuacao").flush([V1]);
    await esperar();
    f.detectChanges();
    expect(texto(f)).toContain("v1");
    // Sem papel de admin, a taxa da loja (Administração) nem é carregada (paineis §3)
    http.expectNone("/api/config-loja");
    expect((f.nativeElement as HTMLElement).querySelector('[data-testid="taxa-loja"]')).toBeNull();
    const c = f.componentInstance;
    expect(c.podeSalvar()).toBe(false); // igual à vigente

    c.alterar("base", 120);
    f.detectChanges();
    expect(c.previa()![0]).toEqual({ rank: 5, atual: 300, nova: 360 }); // CT-59
    expect(c.podeSalvar()).toBe(true);

    spyOn(window, "confirm").and.returnValue(true);
    const salvar = c.salvar();
    const req = http.expectOne((r) => r.method === "POST" && r.url === "/api/config-pontuacao");
    expect(req.request.body).toEqual(
      jasmine.objectContaining({ base: 120, alphaCentesimos: 50, tetoCredoresBp: 5000 }),
    );
    req.flush({ ...V1, id: "c2", versao: 2, base: 120 });
    await esperar();
    http.expectOne("/api/config-pontuacao").flush([{ ...V1, id: "c2", versao: 2, base: 120 }, V1]);
    await salvar;
  });
});

describe("AdminClassesComponent", () => {
  it("lista só as classes (as funções ficam em cada instância, D45)", async () => {
    const http = configurar();
    const f = TestBed.createComponent(AdminClassesComponent);
    f.detectChanges();
    const classes: Classe[] = [
      { id: "m", nomeOficial: "Arcano", apelidoGrupo: "Magus", ativa: true, funcoes: [] },
      { id: "g", nomeOficial: "Executor", apelidoGrupo: "GX", ativa: false, funcoes: [] },
    ];
    http.expectOne("/api/classes").flush(classes);
    await esperar();
    f.detectChanges();
    const el = f.nativeElement as HTMLElement;
    expect(el.querySelector('[data-classe="Magus"]')?.textContent).toContain("Arcano");
    expect(el.querySelector('[data-classe="GX"]')?.textContent).toContain("Inativa");
    expect(el.textContent).toContain("Instâncias");
  });
});

describe("usuários e papéis (D38)", () => {
  const u = (p: Partial<UsuarioSistema> = {}): UsuarioSistema => ({
    id: "u1",
    discordUsername: "ana",
    globalName: null,
    papel: "MEMBRO",
    ativo: true,
    ultimoLogin: null,
    jogador: null,
    papelFixo: false,
    ...p,
  });
  it("bloqueia o admin do .env e o próprio usuário", () => {
    expect(bloqueioPapel(u(), "eu")).toBeNull();
    expect(bloqueioPapel(u({ papelFixo: true, papel: "ADMIN" }), "eu")).toContain("ADMIN_DISCORD_IDS");
    expect(bloqueioPapel(u({ id: "eu" }), "eu")).toContain("próprio");
  });
});
