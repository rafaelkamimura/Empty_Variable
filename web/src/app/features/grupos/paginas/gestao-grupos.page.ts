import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  type OnInit,
  signal,
} from "@angular/core";
import { Router, RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import type { ComAlteracaoNaoSalva } from "../../../core/sair-sem-salvar.guard";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { EscalaGrupoComponent } from "../componentes/escala-grupo.component";
import { LinkConfirmavelDirective } from "../componentes/link-confirmavel.directive";
import { ListaGruposComponent } from "../componentes/lista-grupos.component";
import { NovoGrupoComponent } from "../componentes/novo-grupo.component";
import { GruposApi } from "../data/grupos.api";
import {
  corpoEscala,
  type Grupo,
  type GrupoSalvo,
  type OpcoesGrupos,
  type Vaga,
} from "../data/grupos.modelos";
import { corpoNovoGrupo, type RascunhoGrupo } from "../data/novo-grupo.modelos";

interface DadosGrupos {
  readonly grupos: readonly Grupo[];
  readonly opcoes: OpcoesGrupos;
}

/**
 * Gestão dos grupos de instância: a lista dos agendados e, ao lado, o assistente de um grupo novo
 * ou a escala do grupo escolhido (`?grupo=<id>`, para o endereço levar ao grupo).
 */
@Component({
  selector: "app-gestao-grupos-page",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    AvisoComponent,
    BotaoComponent,
    EstadoComponent,
    EstadoProntoDirective,
    PaginaComponent,
    VazioComponent,
    EscalaGrupoComponent,
    LinkConfirmavelDirective,
    ListaGruposComponent,
    NovoGrupoComponent,
  ],
  host: { "(window:beforeunload)": "avisarAntesDeSair($event)" },
  templateUrl: "./gestao-grupos.page.html",
  styles: `
    .secao {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      gap: var(--esp-3);
    }
    .editor {
      margin-top: var(--esp-5);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-xl);
      color: var(--texto-forte);
      overflow-wrap: anywhere;
    }
  `,
})
export class GestaoGruposPage implements OnInit, ComAlteracaoNaoSalva {
  private readonly api = inject(GruposApi);
  private readonly acao = inject(Acao);
  private readonly router = inject(Router);
  private readonly confirmacao = inject(Confirmacao);
  /** Alteração não salva, como os componentes avisam (escala aberta ou grupo novo). */
  protected readonly escalaAlterada = signal(false);
  protected readonly novoAlterado = signal(false);

  /** Grupo aberto (query param ?grupo=); sem ele, o assistente de grupo novo. */
  readonly grupo = input<string | undefined>();

  protected readonly carga = signal<Carregavel<DadosGrupos>>(carregando());
  protected readonly salvando = signal(false);
  protected readonly erroCriacao = signal<string | null>(null);
  protected readonly erroEscala = signal<string | null>(null);
  protected readonly selecionado = computed(() => {
    const c = this.carga();
    const id = this.grupo();
    return c.estado === "pronto" && id ? (c.dados.grupos.find((g) => g.id === id) ?? null) : null;
  });

  /** Há escala ou grupo novo com alteração não salva. */
  readonly alterado = computed(() => (this.grupo() ? this.escalaAlterada() : this.novoAlterado()));

  confirmacaoDeSaida() {
    const g = this.selecionado();
    return g
      ? {
          titulo: "Descartar as mudanças na escala?",
          descricao: `As mudanças na escala de ${g.instancia.nome} serão perdidas.`,
          confirmar: "Descartar mudanças",
          perigo: true,
        }
      : {
          titulo: "Descartar o grupo novo?",
          descricao: "O grupo que você está montando ainda não foi criado e será perdido.",
          confirmar: "Descartar grupo",
          perigo: true,
        };
  }

  ngOnInit(): void {
    void this.carregar();
  }

  async carregar(): Promise<void> {
    this.carga.set(carregando());
    this.erroEscala.set(null);
    try {
      const [grupos, opcoes] = await Promise.all([this.api.grupos(), this.api.opcoes()]);
      this.carga.set(pronto({ grupos, opcoes }));
    } catch (e) {
      this.carga.set(comErro(mensagemDeErro(e)));
    }
  }

  /**
   * Abre um grupo (ou o assistente de grupo novo, com null). Trocar só o ?grupo= reaproveita a
   * página, e a guarda de rota não roda: por isso, com alteração não salva, pergunta aqui.
   */
  protected async irPara(grupo: string | null): Promise<void> {
    if (this.salvando()) return;
    if (this.alterado() && !(await this.confirmacao.perguntar(this.confirmacaoDeSaida()))) return;
    await this.navegarPara(grupo);
  }

  private async navegarPara(grupo: string | null): Promise<void> {
    this.erroEscala.set(null);
    // O componente que sai não avisa mais; o que entra avisa o próprio estado ao aparecer.
    this.escalaAlterada.set(false);
    this.novoAlterado.set(false);
    await this.router.navigate(["/gestao/grupos"], { queryParams: { grupo } });
  }

  protected async criar(r: RascunhoGrupo): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erroCriacao.set(null);
    try {
      const salvo = await this.api.criar(corpoNovoGrupo(r));
      this.atualizarNaLista(salvo, r.instanciaId);
      this.acao.avisar("Grupo criado. Agora escale os personagens.");
      // Criado: o rascunho não precisa de confirmação para sair.
      await this.navegarPara(salvo.id);
    } catch (e) {
      this.erroCriacao.set(mensagemDeErro(e));
    } finally {
      this.salvando.set(false);
    }
  }

  protected async salvarEscala(g: Grupo, vagas: readonly Vaga[], fechar: boolean): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erroEscala.set(null);
    try {
      const salvo = await this.api.salvarEscala(g.id, corpoEscala(g, vagas, fechar));
      this.atualizarNaLista(salvo, g.instancia.id);
      this.acao.avisar(fechar ? "Grupo fechado." : "Escala salva.");
    } catch (e) {
      // Ex.: a escala mudou desde que abriu (409). As escolhas ficam na tela até recarregar.
      this.erroEscala.set(mensagemDeErro(e));
    } finally {
      this.salvando.set(false);
    }
  }

  /** Fechar ou recarregar a aba com alteração não salva: o navegador pergunta. */
  protected avisarAntesDeSair(evento: BeforeUnloadEvent): void {
    if (this.alterado()) evento.preventDefault();
  }

  /** Põe o grupo salvo no topo da lista, com a instância (a resposta vem sem ela). */
  private atualizarNaLista(salvo: GrupoSalvo, instanciaId: string): void {
    const c = this.carga();
    if (c.estado !== "pronto") return;
    const instancia =
      c.dados.grupos.find((g) => g.id === salvo.id)?.instancia ??
      c.dados.opcoes.instancias.find((i) => i.id === instanciaId);
    if (instancia === undefined) return;
    const atualizado: Grupo = { ...salvo, instancia };
    this.carga.set(
      pronto({ ...c.dados, grupos: [atualizado, ...c.dados.grupos.filter((g) => g.id !== salvo.id)] }),
    );
  }
}
