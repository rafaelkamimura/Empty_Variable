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
import { mensagemDeErro } from "../../../core/modelos";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { EstadoComponent, EstadoProntoDirective } from "../../../shared/ui/estado/estado.component";
import { PaginaComponent } from "../../../shared/ui/pagina/pagina.component";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import { type Carregavel, carregando, comErro, pronto } from "../../../shared/utils/carregavel";
import { EscalaGrupoComponent } from "../componentes/escala-grupo.component";
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
    ListaGruposComponent,
    NovoGrupoComponent,
  ],
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
export class GestaoGruposPage implements OnInit {
  private readonly api = inject(GruposApi);
  private readonly acao = inject(Acao);
  private readonly router = inject(Router);

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

  protected abrir(id: string): void {
    this.erroEscala.set(null);
    void this.router.navigate(["/gestao/grupos"], { queryParams: { grupo: id } });
  }

  protected async criar(r: RascunhoGrupo): Promise<void> {
    if (this.salvando()) return;
    this.salvando.set(true);
    this.erroCriacao.set(null);
    try {
      const salvo = await this.api.criar(corpoNovoGrupo(r));
      this.atualizarNaLista(salvo, r.instanciaId);
      this.acao.avisar("Grupo criado. Agora escale os personagens.");
      this.abrir(salvo.id);
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
