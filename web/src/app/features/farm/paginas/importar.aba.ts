import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from "@angular/core";
import { type BackupDiario, ErroBackup, lerBackup } from "@betel/farm";
import { mensagemDeErro } from "../../../core/modelos";
import { AvisoComponent } from "../../../shared/ui/aviso/aviso.component";
import { BotaoComponent } from "../../../shared/ui/botao/botao.component";
import { CampoComponent, CampoControleDirective } from "../../../shared/ui/campo/campo.component";
import { CartaoComponent } from "../../../shared/ui/cartao/cartao.component";
import { PreviaImportacaoComponent } from "../componentes/previa-importacao.component";
import type { ResultadoImportacao } from "../data/farm.modelos";
import { FarmStore } from "../data/farm.store";
import {
  mapaSugerido,
  PEDACO_IMPORTACAO,
  RESULTADO_VAZIO,
  somarResultados,
} from "../data/importacao.modelos";

const TAMANHO_MAXIMO = 20 * 1024 * 1024;

/**
 * Aba "Importar" (D54): o "Backup completo" do artefato Diário de Instâncias. O membro diz qual
 * personagem do vínculo é cada um do artefato; instâncias e itens são casados pelo nome. Pode
 * repetir: o que já foi importado é pulado.
 */
@Component({
  selector: "app-farm-importar",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    AvisoComponent,
    BotaoComponent,
    CampoComponent,
    CampoControleDirective,
    CartaoComponent,
    PreviaImportacaoComponent,
  ],
  template: `
    <section aria-labelledby="imp-titulo">
      <h2 id="imp-titulo">Importar do artefato</h2>
      <p class="dica">
        No artefato Diário de Instâncias, abra Cadastro › Backup completo e baixe ou copie o backup. Depois
        envie o arquivo aqui ou cole o texto. Seus dados continuam no artefato; pode importar de novo quando
        quiser, sem duplicar.
      </p>

      <ui-cartao>
        <ui-campo rotulo="Arquivo do backup (.json)">
          <input uiCampo type="file" accept=".json,application/json" (change)="lerArquivo($event)" />
        </ui-campo>
        <ui-campo rotulo="Ou cole o texto do backup">
          <textarea uiCampo rows="4" [value]="texto()" (input)="texto.set(valor($event))"></textarea>
        </ui-campo>
        <div class="acoes">
          <button uiBotao [disabled]="texto().trim() === ''" (click)="lerTexto(texto())">Ler backup</button>
        </div>
      </ui-cartao>

      @if (erro(); as e) {
        <ui-aviso tom="erro" titulo="Não deu para importar.">{{ e }}</ui-aviso>
      }

      @if (backup(); as b) {
        <app-previa-importacao
          data-testid="previa-importacao"
          [backup]="b"
          [personagens]="farm.estado()?.personagens ?? []"
          [mapa]="mapa()"
          [importando]="importando()"
          [progresso]="progresso()"
          (mapear)="mapear($event.doArtefato, $event.personagemId)"
          (importar)="importar(b)"
        />
      }

      @if (resultado(); as r) {
        <ui-aviso tom="sucesso" titulo="Importação concluída" data-testid="resultado-importacao">
          <ul>
            <li>{{ r.checkinsImportados }} check-in(s) importado(s)</li>
            @if (r.checkinsJaImportados > 0) {
              <li>{{ r.checkinsJaImportados }} já estavam importados</li>
            }
            @if (r.checkinsSemPersonagem > 0) {
              <li>{{ r.checkinsSemPersonagem }} ficaram de fora (personagem marcado como “Não importar”)</li>
            }
            <li>{{ r.instanciasCriadas }} instância(s) e {{ r.itensCriados }} item(ns) novos no cadastro</li>
          </ul>
          <button uiBotao variante="principal" tamanho="p" slot="acoes" (click)="importado.emit()">
            Ver o dia
          </button>
        </ui-aviso>
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
    }
    section {
      display: grid;
      gap: var(--esp-3);
      max-width: 720px;
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
    .acoes {
      display: flex;
      gap: var(--esp-2);
    }
    ul {
      margin: 0;
      padding-left: var(--esp-5);
    }
  `,
})
export class ImportarAbaComponent {
  protected readonly farm = inject(FarmStore);
  /** Pede para a página mostrar o dia (aba Hoje). */
  readonly importado = output();

  protected readonly texto = signal("");
  protected readonly erro = signal<string | null>(null);
  protected readonly backup = signal<BackupDiario | null>(null);
  protected readonly mapa = signal<Record<string, string>>({});
  protected readonly importando = signal(false);
  protected readonly feitos = signal(0);
  protected readonly resultado = signal<ResultadoImportacao | null>(null);
  protected readonly progresso = computed(() => {
    const total = this.backup()?.checkins.length ?? 0;
    return total > PEDACO_IMPORTACAO ? `${Math.min(this.feitos(), total)}/${total}` : "";
  });

  protected valor(evento: Event): string {
    return (evento.target as HTMLTextAreaElement).value;
  }

  protected async lerArquivo(evento: Event): Promise<void> {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    if (!arquivo) return;
    if (arquivo.size > TAMANHO_MAXIMO) {
      this.erro.set("Arquivo grande demais para ser um backup do Diário.");
      return;
    }
    this.lerTexto(await arquivo.text());
  }

  protected lerTexto(texto: string): void {
    this.erro.set(null);
    this.resultado.set(null);
    this.backup.set(null);
    try {
      const b = lerBackup(JSON.parse(texto));
      this.mapa.set(mapaSugerido(b.personagens, this.farm.estado()?.personagens ?? []));
      this.backup.set(b);
    } catch (e) {
      this.erro.set(
        e instanceof ErroBackup
          ? e.message
          : "Não foi possível ler o backup. Envie o arquivo ou cole o texto completo.",
      );
    }
  }

  protected mapear(doArtefato: string, personagemId: string): void {
    this.mapa.update((m) => {
      const { [doArtefato]: _, ...resto } = m;
      return personagemId ? { ...resto, [doArtefato]: personagemId } : resto;
    });
  }

  protected async importar(b: BackupDiario): Promise<void> {
    if (this.importando()) return;
    this.importando.set(true);
    this.erro.set(null);
    this.feitos.set(0);
    let total = RESULTADO_VAZIO;
    try {
      const pedacos = Math.max(1, Math.ceil(b.checkins.length / PEDACO_IMPORTACAO));
      for (let n = 0; n < pedacos; n++) {
        const checkins = b.checkins.slice(n * PEDACO_IMPORTACAO, (n + 1) * PEDACO_IMPORTACAO);
        total = somarResultados(total, await this.farm.importar({ ...b, checkins }, this.mapa()));
        this.feitos.set((n + 1) * PEDACO_IMPORTACAO);
      }
      await this.farm.carregar();
      this.resultado.set(total);
      this.backup.set(null);
      this.texto.set("");
    } catch (e) {
      this.erro.set(mensagemDeErro(e));
    } finally {
      this.importando.set(false);
    }
  }
}
