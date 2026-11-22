import { DatePipe } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from "@angular/core";
import { mensagemDeErro } from "../../../core/modelos";
import { agruparClasses } from "../../../shared/dominio/grupos-classes";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { PainelLateralComponent } from "../../../shared/ui/painel-lateral/painel-lateral.component";
import { CartaoPersonagemComponent } from "../componentes/cartao-personagem.component";
import { FichaPersonagemComponent } from "../componentes/ficha-personagem.component";
import { EquipamentosStore } from "../data/equipamentos.store";
import { VinculoApi } from "../data/vinculo.api";
import {
  aplicarBuild,
  type ClasseFicha,
  type DestinoFicha,
  type Ficha,
  fichaDaSolicitacao,
  fichaDoPersonagem,
  MAXIMO_FICHAS_SOLICITACAO,
  novaFicha,
  type PersonagemResumo,
  resumoDaImportacao,
  type SituacaoVinculo,
  type Solicitacao,
} from "../data/vinculo.modelos";

interface DadosVinculo {
  situacao: SituacaoVinculo;
  classes: ClasseFicha[];
}

/**
 * Meus personagens (/vinculo, T-19b e D12): o membro cadastra as fichas dos personagens. Sem
 * vínculo, a primeira ficha abre a solicitação; enquanto ela está em análise, dá para editar e
 * acrescentar fichas; depois da aprovação, as fichas são dos personagens vinculados. A ficha abre
 * no painel lateral, com a importação da build do simulador (D55, D57).
 */
@Component({
  selector: "app-vinculo-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe,
    AvisoComponent,
    CartaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    PainelLateralComponent,
    CartaoPersonagemComponent,
    FichaPersonagemComponent,
  ],
  templateUrl: "./vinculo.page.html",
  styles: `
    .grade {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 160px), 1fr));
      gap: var(--esp-3);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
    }
    .dica {
      margin: 0;
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .adicionar {
      text-align: center;
      min-height: 140px;
      align-items: center;
      justify-content: center;
      border-style: dashed;
      color: var(--acento);
      font-weight: 600;
    }
    .adicionar span {
      font-size: var(--fs-2xl);
      line-height: 1;
    }
  `,
})
export class VinculoPage {
  private readonly api = inject(VinculoApi);
  protected readonly equipamentos = inject(EquipamentosStore);
  private readonly fichaComponente = viewChild(FichaPersonagemComponent);

  protected readonly maximoFichas = MAXIMO_FICHAS_SOLICITACAO;
  protected readonly novaFicha = novaFicha;
  protected readonly estado = signal<Carregavel<DadosVinculo>>(carregando());
  protected readonly ficha = signal<Ficha | null>(null);
  private readonly destino = signal<DestinoFicha | null>(null);
  protected readonly importando = signal(false);
  protected readonly avisoImportacao = signal<string | null>(null);
  protected readonly erroFicha = signal<string | null>(null);
  protected readonly enviando = signal(false);

  private readonly classes = computed(() => {
    const e = this.estado();
    return e.estado === "pronto" ? e.dados.classes : [];
  });
  protected readonly grupos = computed(() => agruparClasses(this.classes()));
  protected readonly personagemAberto = computed(() => {
    const d = this.destino();
    return d?.tipo === "personagem" ? d.id : null;
  });
  protected readonly tituloFicha = computed(() => {
    const d = this.destino();
    const editando = d?.tipo === "personagem" || (d?.tipo === "solicitacao" && d.nomeAnterior !== null);
    return editando ? "Editar personagem" : "Adicionar personagem";
  });

  constructor() {
    void this.carregar();
  }

  /** Carrega a situação e as classes. Depois da primeira vez, mantém a tela enquanto atualiza. */
  async carregar(): Promise<void> {
    if (this.estado().estado !== "pronto") this.estado.set(carregando());
    try {
      const [situacao, classes] = await Promise.all([this.api.situacao(), this.api.classes()]);
      this.estado.set(pronto({ situacao, classes }));
    } catch (e) {
      this.estado.set(comErro(mensagemDeErro(e)));
    }
  }

  protected nomeDaClasse(id: string): string {
    if (!id) return "";
    return this.classes().find((c) => c.id === id)?.nomeOficial ?? "Classe indisponível";
  }

  protected fichaPendente(pedido: Solicitacao, nome: string): Ficha {
    return fichaDaSolicitacao(pedido, nome);
  }

  protected abrirVinculado(p: PersonagemResumo | null): void {
    if (p) this.abrir(fichaDoPersonagem(p), { tipo: "personagem", id: p.id });
    else this.abrir(novaFicha(), { tipo: "novo-personagem" });
  }

  protected abrirPendente(pedido: Solicitacao, ficha: Ficha): void {
    this.abrir(ficha, { tipo: "solicitacao", id: pedido.id, nomeAnterior: ficha.nome });
  }

  protected abrir(ficha: Ficha, destino: DestinoFicha): void {
    this.destino.set(destino);
    this.erroFicha.set(null);
    this.avisoImportacao.set(null);
    this.ficha.set(ficha);
    void this.equipamentos.carregar();
  }

  protected fechar(): void {
    if (this.enviando()) return;
    this.ficha.set(null);
    this.destino.set(null);
  }

  /** D55: lê a build do link e aplica na ficha aberta; nada é salvo até o membro confirmar. */
  protected async importar(link: string): Promise<void> {
    if (this.importando()) return;
    // A build vai só para a ficha que pediu: se o membro fechou ou trocou de ficha, o resultado é descartado.
    const destino = this.destino();
    this.importando.set(true);
    this.erroFicha.set(null);
    this.avisoImportacao.set(null);
    try {
      const [build] = await Promise.all([this.api.importarBuild(link), this.equipamentos.carregar()]);
      const atual = this.ficha();
      if (atual === null || destino === null || this.destino() !== destino) return;
      const nova = aplicarBuild(atual, build, (slot, id) => this.equipamentos.nomeDoItem(slot, id));
      this.ficha.set(nova);
      this.fichaComponente()?.limparLink();
      this.avisoImportacao.set(resumoDaImportacao(build, Object.keys(nova.equipamentos).length));
    } catch (e) {
      this.erroFicha.set(mensagemDeErro(e));
    } finally {
      this.importando.set(false);
    }
  }

  protected async salvar(ficha: Ficha): Promise<void> {
    const destino = this.destino();
    if (!destino || this.enviando()) return;
    this.erroFicha.set(null);
    this.enviando.set(true);
    try {
      await this.api.salvarFicha(destino, ficha);
      this.enviando.set(false);
      this.fechar();
      await this.carregar();
    } catch (e) {
      this.erroFicha.set(mensagemDeErro(e));
    } finally {
      this.enviando.set(false);
    }
  }
}
