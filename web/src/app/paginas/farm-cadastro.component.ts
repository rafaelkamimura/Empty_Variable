import { Component, inject, type OnInit, signal } from "@angular/core";
import { RouterLink } from "@angular/router";
import {
  RECARGAS,
  ROTULO_RECARGA,
  type Recarga,
  ehRecarga,
  formatarZenyCompleto,
  lerZeny,
} from "@betel/farm";
import { Acao } from "../core/acao";
import { type InstanciaCatalogo, type InstanciaFarm, type ItemFarm, FarmStore } from "../core/farm";
import { FarmBuscaItemComponent, type ItemEscolhido } from "../core/farm-busca-item.component";
import { ImagemItemComponent } from "../core/imagem-item.component";
import { mensagemDeErro } from "../core/modelos";

/** D49, D50, D52: personagens do vínculo, instâncias pessoais com os drops e os preços em zeny. */
@Component({
  selector: "app-farm-cadastro",
  imports: [RouterLink, ImagemItemComponent, FarmBuscaItemComponent],
  template: `
    @if (farm.estado(); as est) {
      <section class="secao">
        <div class="secao-topo">
          <h2>Personagens</h2>
          <span class="dica"
            >Vêm do seu vínculo. Para incluir outro, peça em <a routerLink="/vinculo">Vínculo</a>.</span
          >
        </div>
        <div class="chips">
          @for (p of est.personagens; track p.id) {
            <span class="chip estatico">{{ p.nome }}{{ p.classe ? " · " + p.classe : "" }}</span>
          }
        </div>
      </section>

      <section class="secao">
        <div class="secao-topo">
          <h2>Instâncias</h2>
          <span class="dica">A recarga define quando o check-in libera de novo</span>
        </div>

        @for (i of est.instancias; track i.id) {
          <div class="cartao" [attr.data-testid]="'cadastro-' + i.nome">
            <div class="inst-topo">
              <div>
                <h3>{{ i.nome }}</h3>
                <p class="dica">
                  {{ rotuloRecarga[i.recarga] }} · {{ i.personagemIds.length }} personagem(ns) ·
                  {{ i.drops.length }} item(ns)
                </p>
              </div>
              <button
                type="button"
                class="botao pequeno"
                (click)="alternar(i.id)"
                [attr.aria-expanded]="aberta() === i.id"
              >
                {{ aberta() === i.id ? "Fechar" : "Editar" }}
              </button>
            </div>

            @if (aberta() === i.id) {
              <div class="linha">
                <input
                  type="text"
                  aria-label="Nome da instância"
                  [value]="i.nome"
                  maxlength="80"
                  (change)="renomear(i, $any($event.target))"
                />
                <select aria-label="Recarga" (change)="mudarRecarga(i, $any($event.target).value)">
                  @for (r of recargas; track r) {
                    <option [value]="r" [selected]="i.recarga === r">{{ rotuloRecarga[r] }}</option>
                  }
                </select>
              </div>

              <span class="rotulo">Quem faz</span>
              <div class="chips">
                @for (p of est.personagens; track p.id) {
                  <button
                    type="button"
                    class="chip"
                    [attr.aria-pressed]="i.personagemIds.includes(p.id)"
                    (click)="alternarPersonagem(i, p.id)"
                  >
                    {{ p.nome }}
                  </button>
                }
              </div>

              <span class="rotulo">Drops</span>
              <p class="dica">
                Liste o que costuma dropar. A quantidade de cada run vai no check-in, onde também dá para
                incluir itens que não estão aqui. Busque pelo nome ou pelo ID do item na Divine Pride.
              </p>
              @for (itemId of i.drops; track itemId) {
                @let item = farm.itemPorId().get(itemId);
                @if (item) {
                  <div class="linha-drop">
                    <span class="item-nome">
                      <app-imagem-item [idJogo]="item.idJogo" [nome]="item.nome" [tamanho]="24" />
                      {{ item.nome }}
                    </span>
                    <input
                      type="text"
                      inputmode="decimal"
                      placeholder="Sem preço"
                      [attr.aria-label]="'Preço de ' + item.nome"
                      [value]="preco(item)"
                      (change)="mudarPreco(item, $any($event.target))"
                    />
                    <button type="button" class="botao pequeno perigo" (click)="removerDrop(i, item)">
                      Tirar
                    </button>
                  </div>
                }
              }
              <app-farm-busca-item
                [idCampo]="'drop-' + i.id"
                rotulo="Adicionar item aos drops"
                (escolher)="adicionarDrop(i, $event)"
              />

              <div class="acoes direita">
                <button
                  type="button"
                  class="botao pequeno perigo"
                  [class.armado]="armado() === 'inst:' + i.id"
                  (click)="excluirInstancia(i)"
                >
                  {{ armado() === "inst:" + i.id ? "Confirmar exclusão" : "Excluir instância" }}
                </button>
              </div>
            }
          </div>
        }

        <form class="cartao" (submit)="$event.preventDefault(); criarInstancia()">
          <span class="rotulo">Nova instância</span>
          @if (catalogo().length > 0) {
            <select
              aria-label="Partir do catálogo do grupo"
              (change)="usarCatalogo($any($event.target).value)"
            >
              <option value="">Do catálogo do grupo (opcional)</option>
              @for (c of catalogo(); track c.id) {
                <option [value]="c.id" [selected]="novaDoCatalogo() === c.id">{{ c.nome }}</option>
              }
            </select>
          }
          <div class="linha">
            <input
              type="text"
              id="nova-instancia"
              placeholder="Nome da instância"
              aria-label="Nome da nova instância"
              maxlength="80"
              [value]="novoNome()"
              (input)="novoNome.set($any($event.target).value)"
            />
            <select
              aria-label="Recarga da nova instância"
              (change)="novaRecarga.set($any($event.target).value)"
            >
              @for (r of recargas; track r) {
                <option [value]="r" [selected]="novaRecarga() === r">{{ rotuloRecarga[r] }}</option>
              }
            </select>
            <button type="submit" class="botao primario" [disabled]="novoNome().trim().length === 0">
              Adicionar instância
            </button>
          </div>
          <p class="dica">
            A instância nova já vem marcada para todos os seus personagens; ajuste em “Quem faz”.
          </p>
        </form>
      </section>

      <section class="secao">
        <div class="secao-topo">
          <h2>Itens e preços</h2>
          <span class="dica"
            >O preço vale para o item em todas as instâncias. Aceita 1500000, 1.500.000, 1,5kk ou 300k.</span
          >
        </div>
        @if (est.itens.length === 0) {
          <p class="dica">Os itens aparecem aqui quando você os adiciona a uma instância ou a um check-in.</p>
        } @else {
          <div class="cartao">
            <div class="linha-item cabeca">
              <span>Item</span>
              <span>ID do jogo</span>
              <span>Preço de venda</span>
              <span></span>
            </div>
            @for (item of est.itens; track item.id) {
              <div class="linha-item">
                <span class="item-nome">
                  <app-imagem-item [idJogo]="item.idJogo" [nome]="item.nome" [tamanho]="24" />
                  <input
                    type="text"
                    maxlength="80"
                    [attr.aria-label]="'Nome de ' + item.nome"
                    [value]="item.nome"
                    (change)="renomearItem(item, $any($event.target))"
                  />
                </span>
                <input
                  type="number"
                  min="1"
                  placeholder="—"
                  [attr.aria-label]="'ID do jogo de ' + item.nome"
                  [value]="item.idJogo ?? ''"
                  (change)="mudarIdJogo(item, $any($event.target))"
                />
                <input
                  type="text"
                  inputmode="decimal"
                  placeholder="Sem preço"
                  [attr.aria-label]="'Preço de ' + item.nome"
                  [value]="preco(item)"
                  (change)="mudarPreco(item, $any($event.target))"
                />
                <button
                  type="button"
                  class="botao pequeno perigo"
                  [class.armado]="armado() === 'item:' + item.id"
                  (click)="excluirItem(item)"
                >
                  {{ armado() === "item:" + item.id ? "Confirmar" : "Excluir" }}
                </button>
              </div>
            }
          </div>
        }
      </section>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }
    h3 {
      margin: 0;
      font-size: 15px;
      overflow-wrap: anywhere;
    }
    .estatico {
      display: inline-flex;
      align-items: center;
      cursor: default;
    }
    .estatico:hover {
      background: transparent;
    }
    .linha {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
    .linha > input {
      flex: 1 1 200px;
    }
    .linha > select {
      flex: 0 1 180px;
    }
    .linha-drop {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
    }
    .linha-item {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) 110px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
    }
    .linha-item .item-nome {
      min-width: 0;
    }
    .cabeca {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--texto-suave);
    }
    .direita {
      justify-content: flex-end;
    }
    @media (max-width: 560px) {
      .linha-item {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      }
      .cabeca {
        display: none;
      }
    }
  `,
})
export class FarmCadastroComponent implements OnInit {
  readonly farm = inject(FarmStore);
  private readonly acao = inject(Acao);

  readonly recargas = RECARGAS;
  readonly rotuloRecarga = ROTULO_RECARGA;
  readonly aberta = signal<string | null>(null);
  readonly armado = signal<string | null>(null);
  readonly catalogo = signal<InstanciaCatalogo[]>([]);
  readonly novoNome = signal("");
  readonly novaRecarga = signal<Recarga>("DIARIA");
  readonly novaDoCatalogo = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      this.catalogo.set(await this.farm.catalogoInstancias());
    } catch {
      // O catálogo é só um atalho: sem ele, o cadastro continua.
    }
  }

  preco(item: ItemFarm): string {
    return item.precoZeny === null ? "" : formatarZenyCompleto(item.precoZeny);
  }

  alternar(id: string): void {
    this.aberta.set(this.aberta() === id ? null : id);
  }

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

  usarCatalogo(id: string): void {
    this.novaDoCatalogo.set(id || null);
    const c = this.catalogo().find((x) => x.id === id);
    if (!c) return;
    this.novoNome.set(c.nome);
    if (c.recargaSugerida) this.novaRecarga.set(c.recargaSugerida);
  }

  async criarInstancia(): Promise<void> {
    const nome = this.novoNome().trim();
    if (!nome) return;
    const recarga = this.novaRecarga();
    const doCatalogo = this.catalogo().find((c) => c.id === this.novaDoCatalogo() && c.nome === nome);
    let criada: InstanciaFarm | null = null;
    const ok = await this.salvar(async () => {
      criada = await this.farm.criarInstancia({ nome, recarga, instanciaId: doCatalogo?.id ?? null });
    }, `Instância ${nome} cadastrada.`);
    if (ok && criada) {
      this.novoNome.set("");
      this.novaDoCatalogo.set(null);
      this.aberta.set((criada as InstanciaFarm).id);
    }
  }

  async renomear(i: InstanciaFarm, campo: HTMLInputElement): Promise<void> {
    const nome = campo.value.trim();
    if (!nome || nome === i.nome) {
      campo.value = i.nome;
      return;
    }
    if (!(await this.salvar(() => this.farm.atualizarInstancia(i.id, { nome })))) campo.value = i.nome;
  }

  async mudarRecarga(i: InstanciaFarm, valor: string): Promise<void> {
    if (ehRecarga(valor)) await this.salvar(() => this.farm.atualizarInstancia(i.id, { recarga: valor }));
  }

  async alternarPersonagem(i: InstanciaFarm, personagemId: string): Promise<void> {
    const personagemIds = i.personagemIds.includes(personagemId)
      ? i.personagemIds.filter((p) => p !== personagemId)
      : [...i.personagemIds, personagemId];
    await this.salvar(() => this.farm.atualizarInstancia(i.id, { personagemIds }));
  }

  async adicionarDrop(i: InstanciaFarm, item: ItemEscolhido): Promise<void> {
    await this.salvar(() => this.farm.adicionarDrop(i.id, { nome: item.nome, idJogo: item.idJogo }));
  }

  async removerDrop(i: InstanciaFarm, item: ItemFarm): Promise<void> {
    await this.salvar(() => this.farm.removerDrop(i.id, item.id));
  }

  async excluirInstancia(i: InstanciaFarm): Promise<void> {
    const chave = `inst:${i.id}`;
    if (this.armado() !== chave) {
      this.armado.set(chave);
      return;
    }
    this.armado.set(null);
    await this.salvar(() => this.farm.excluirInstancia(i.id), `Instância ${i.nome} excluída.`);
  }

  async mudarPreco(item: ItemFarm, campo: HTMLInputElement): Promise<void> {
    const valor = lerZeny(campo.value);
    if (valor === undefined) {
      campo.value = this.preco(item);
      this.acao.avisar("Preço inválido. Use, por exemplo, 1500000, 1,5kk ou 300k.");
      return;
    }
    if (valor === item.precoZeny) {
      campo.value = this.preco(item);
      return;
    }
    if (!(await this.salvar(() => this.farm.atualizarItem(item.id, { precoZeny: valor }))))
      campo.value = this.preco(item);
  }

  async renomearItem(item: ItemFarm, campo: HTMLInputElement): Promise<void> {
    const nome = campo.value.trim();
    if (!nome || nome === item.nome) {
      campo.value = item.nome;
      return;
    }
    if (!(await this.salvar(() => this.farm.atualizarItem(item.id, { nome })))) campo.value = item.nome;
  }

  async mudarIdJogo(item: ItemFarm, campo: HTMLInputElement): Promise<void> {
    const texto = campo.value.trim();
    const idJogo = texto === "" ? null : Number(texto);
    if (idJogo !== null && (!Number.isInteger(idJogo) || idJogo < 1)) {
      campo.value = item.idJogo === null ? "" : String(item.idJogo);
      return;
    }
    if (idJogo === item.idJogo) return;
    await this.salvar(() => this.farm.atualizarItem(item.id, { idJogo }));
  }

  async excluirItem(item: ItemFarm): Promise<void> {
    const chave = `item:${item.id}`;
    if (this.armado() !== chave) {
      this.armado.set(chave);
      return;
    }
    this.armado.set(null);
    await this.salvar(() => this.farm.excluirItem(item.id), `Item ${item.nome} excluído.`);
  }
}
