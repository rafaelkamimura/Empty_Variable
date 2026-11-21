import { ChangeDetectionStrategy, Component, computed, inject, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import { Acao } from "../../../core/acao";
import { Confirmacao } from "../../../core/confirmacao";
import { mensagemDeErro } from "../../../core/modelos";
import { BadgeComponent } from "../../../shared/ui/badge/badge.component";
import { VazioComponent } from "../../../shared/ui/vazio/vazio.component";
import type { ItemEscolhido } from "../componentes/busca-item.component";
import {
  InstanciaCadastroComponent,
  type SalvarInstancia,
  type SalvarPreco,
} from "../componentes/instancia-cadastro.component";
import { LootInstanciaComponent } from "../componentes/loot-instancia.component";
import { type NovaInstancia, NovaInstanciaComponent } from "../componentes/nova-instancia.component";
import { type SalvarItem, TabelaItensComponent } from "../componentes/tabela-itens.component";
import { idDoCatalogo, lootQueFalta, nomeDoLoot } from "../data/cadastro.modelos";
import type {
  InstanciaCatalogo,
  InstanciaFarm,
  ItemFarm,
  ItemLoot,
  LootInstancia,
} from "../data/farm.modelos";
import { FarmStore } from "../data/farm.store";

const AVISO_PRECO = "Preço inválido. Use, por exemplo, 1500000, 1,5kk ou 300k.";

/** Aba "Cadastro" do Diário de farm (D49, D50, D52, D60): personagens, instâncias, drops e preços. */
@Component({
  selector: "app-farm-cadastro",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    BadgeComponent,
    VazioComponent,
    InstanciaCadastroComponent,
    LootInstanciaComponent,
    NovaInstanciaComponent,
    TabelaItensComponent,
  ],
  template: `
    @if (farm.estado(); as est) {
      <section aria-labelledby="cad-personagens">
        <div class="topo">
          <h2 id="cad-personagens">Personagens</h2>
          <span class="dica"
            >Vêm do seu vínculo. Para incluir outro, peça em <a routerLink="/vinculo">Vínculo</a>.</span
          >
        </div>
        <div class="personagens">
          @for (p of est.personagens; track p.id) {
            <ui-badge>{{ p.nome }}{{ p.classe ? " · " + p.classe : "" }}</ui-badge>
          }
        </div>
      </section>

      <section aria-labelledby="cad-instancias">
        <div class="topo">
          <h2 id="cad-instancias">Instâncias</h2>
          <span class="dica">A recarga define quando o check-in libera de novo</span>
        </div>
        @for (i of est.instancias; track i.id) {
          <app-instancia-cadastro
            [instancia]="i"
            [personagens]="est.personagens"
            [drops]="dropsDe(i)"
            [aberta]="aberta() === i.id"
            [buscar]="farm.buscarItens"
            [salvar]="salvarInstancia(i)"
            [salvarPreco]="salvarPreco"
            (alternar)="alternar(i)"
            (tirar)="tirar(i, $event)"
            (adicionar)="adicionarDrop(i, $event)"
            (excluir)="excluirInstancia(i)"
            (precoInvalido)="acao.avisar(avisoPreco)"
          >
            @if (catalogoDe(i)) {
              <app-loot-instancia
                [attr.data-testid]="'loot-' + i.nome"
                [loot]="lootDe()[i.id] ?? null"
                [faltam]="faltamDe(i)"
                [carregando]="carregandoLoot() === i.id"
                (ver)="verLoot(i)"
                (adicionar)="adicionarLoot(i, $event)"
              />
            }
          </app-instancia-cadastro>
        }
        <app-nova-instancia [catalogo]="catalogo()" [criar]="criar" />
      </section>

      <section aria-labelledby="cad-itens">
        <div class="topo">
          <h2 id="cad-itens">Itens e preços</h2>
          <span class="dica"
            >O preço vale para o item em todas as instâncias. Aceita 1500000, 1.500.000, 1,5kk ou 300k.</span
          >
        </div>
        @if (est.itens.length === 0) {
          <ui-vazio
            mensagem="Os itens aparecem aqui quando você os adiciona a uma instância ou a um check-in."
          />
        } @else {
          <app-tabela-itens
            [itens]="est.itens"
            [salvar]="salvarItem"
            (excluir)="excluirItem($event)"
            (precoInvalido)="acao.avisar(avisoPreco)"
          />
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: grid;
      gap: var(--esp-5);
    }
    section {
      display: grid;
      gap: var(--esp-3);
    }
    .topo {
      display: flex;
      flex-wrap: wrap;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--esp-1) var(--esp-3);
    }
    h2 {
      margin: 0;
      font-size: var(--fs-l);
      font-weight: 600;
      color: var(--texto-forte);
    }
    .dica {
      font-size: var(--fs-s);
      color: var(--texto-suave);
    }
    .personagens {
      display: flex;
      flex-wrap: wrap;
      gap: var(--esp-2);
    }
  `,
})
export class CadastroAbaComponent {
  protected readonly farm = inject(FarmStore);
  protected readonly acao = inject(Acao);
  private readonly confirmacao = inject(Confirmacao);

  protected readonly avisoPreco = AVISO_PRECO;
  protected readonly aberta = signal<string | null>(null);
  protected readonly catalogo = signal<InstanciaCatalogo[]>([]);
  /** D60: loot já buscado, pela instância do diário. */
  protected readonly lootDe = signal<Partial<Record<string, LootInstancia>>>({});
  protected readonly carregandoLoot = signal<string | null>(null);

  /** Funções de salvar por instância, estáveis entre as renderizações. */
  private readonly salvarPorInstancia = computed(
    () =>
      new Map<string, SalvarInstancia>(
        (this.farm.estado()?.instancias ?? []).map((i) => [
          i.id,
          (mudanca) => this.salvar(() => this.farm.atualizarInstancia(i.id, mudanca)),
        ]),
      ),
  );

  constructor() {
    // O catálogo é só um atalho: sem ele, o cadastro continua.
    this.farm.catalogoInstancias().then(
      (c) => this.catalogo.set(c),
      () => undefined,
    );
  }

  protected dropsDe(i: InstanciaFarm): ItemFarm[] {
    const porId = this.farm.itemPorId();
    return i.drops.map((id) => porId.get(id)).filter((item) => item !== undefined);
  }
  protected catalogoDe(i: InstanciaFarm): string | null {
    return idDoCatalogo(i, this.catalogo());
  }
  protected faltamDe(i: InstanciaFarm): ItemLoot[] {
    const loot = this.lootDe()[i.id];
    return loot ? lootQueFalta(i, loot, this.farm.itemPorId()) : [];
  }
  protected salvarInstancia(i: InstanciaFarm): SalvarInstancia {
    return (
      this.salvarPorInstancia().get(i.id) ??
      ((mudanca) => this.salvar(() => this.farm.atualizarInstancia(i.id, mudanca)))
    );
  }

  /** Erro vira aviso; sucesso não avisa (o campo já mostra o valor salvo). */
  private async salvar(op: () => Promise<unknown>, sucesso: string | null = null): Promise<boolean> {
    try {
      await op();
      if (sucesso) this.acao.avisar(sucesso);
      return true;
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
      return false;
    }
  }

  protected readonly salvarPreco: SalvarPreco = (item, precoZeny) =>
    this.salvar(() => this.farm.atualizarItem(item.id, { precoZeny }));
  protected readonly salvarItem: SalvarItem = (item, mudanca) =>
    this.salvar(() => this.farm.atualizarItem(item.id, mudanca));

  protected readonly criar = async (nova: NovaInstancia): Promise<boolean> => {
    let criada: InstanciaFarm | null = null;
    const ok = await this.salvar(async () => {
      criada = await this.farm.criarInstancia(nova);
    }, `Instância ${nova.nome} cadastrada.`);
    if (ok && criada) {
      const c: InstanciaFarm = criada;
      this.aberta.set(c.id);
      void this.verLoot(c);
    }
    return ok;
  };

  /** Abre ou fecha o cartão; ao abrir uma instância do catálogo, já busca o loot dela (D60). */
  protected alternar(i: InstanciaFarm): void {
    const abrir = this.aberta() !== i.id;
    this.aberta.set(abrir ? i.id : null);
    if (abrir && this.catalogoDe(i) && !this.lootDe()[i.id]) void this.verLoot(i);
  }

  protected async verLoot(i: InstanciaFarm): Promise<void> {
    const id = this.catalogoDe(i);
    if (!id || this.carregandoLoot()) return;
    this.carregandoLoot.set(i.id);
    try {
      const loot = await this.farm.lootDaInstancia(id);
      this.lootDe.update((atual) => ({ ...atual, [i.id]: loot }));
    } catch (e) {
      this.acao.avisar(mensagemDeErro(e));
    } finally {
      this.carregandoLoot.set(null);
    }
  }

  protected async adicionarLoot(i: InstanciaFarm, itens: readonly ItemLoot[]): Promise<void> {
    await this.salvar(
      () =>
        this.farm.adicionarDrops(
          i.id,
          itens.map((item) => ({ nome: nomeDoLoot(item).slice(0, 80), idJogo: item.idJogo })),
        ),
      itens.length > 1 ? `${itens.length} itens adicionados aos drops.` : null,
    );
  }

  protected async adicionarDrop(i: InstanciaFarm, item: ItemEscolhido): Promise<void> {
    await this.salvar(() => this.farm.adicionarDrop(i.id, { nome: item.nome, idJogo: item.idJogo }));
  }

  protected async tirar(i: InstanciaFarm, item: ItemFarm): Promise<void> {
    await this.salvar(() => this.farm.removerDrop(i.id, item.id));
  }

  protected async excluirInstancia(i: InstanciaFarm): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: `Excluir a instância ${i.nome}?`,
      descricao: "Ela sai do Hoje e do cadastro. Os check-ins já feitos continuam nos totais.",
      confirmar: "Excluir instância",
      perigo: true,
    });
    if (sim) await this.salvar(() => this.farm.excluirInstancia(i.id), `Instância ${i.nome} excluída.`);
  }

  protected async excluirItem(item: ItemFarm): Promise<void> {
    const sim = await this.confirmacao.perguntar({
      titulo: `Excluir o item ${item.nome}?`,
      descricao:
        "Ele sai dos drops de todas as instâncias. Item que já aparece em check-ins não pode ser excluído.",
      confirmar: "Excluir item",
      perigo: true,
    });
    if (sim) await this.salvar(() => this.farm.excluirItem(item.id), `Item ${item.nome} excluído.`);
  }
}
