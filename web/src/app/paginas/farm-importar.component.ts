import { Component, computed, inject, output, signal } from "@angular/core";
import { type BackupDiario, ErroBackup, lerBackup } from "@betel/farm";
import { type ResultadoImportacao } from "../features/farm/data/farm.modelos";
import { FarmStore } from "../features/farm/data/farm.store";
import { mensagemDeErro } from "../core/modelos";

/** Check-ins por requisição: cada pedaço cabe com folga no limite do corpo da API. */
const PEDACO = 250;

/**
 * D54: importa o "Backup completo" do artefato Diário de Instâncias. O membro escolhe qual
 * personagem do vínculo corresponde a cada personagem do artefato; instâncias e itens são casados
 * pelo nome. Pode repetir: o que já foi importado é pulado.
 */
@Component({
  selector: "app-farm-importar",
  template: `
    <section class="secao">
      <div class="secao-topo">
        <h2>Importar do artefato</h2>
      </div>
      <p class="dica">
        No artefato Diário de Instâncias, abra Cadastro › Backup completo e baixe ou copie o backup. Depois
        envie o arquivo aqui ou cole o texto. Seus dados continuam no artefato; pode importar de novo quando
        quiser, sem duplicar.
      </p>

      <div class="cartao">
        <label class="rotulo" for="arquivo-backup">Arquivo do backup (.json)</label>
        <input
          id="arquivo-backup"
          type="file"
          accept=".json,application/json"
          (change)="lerArquivo($any($event.target))"
        />
        <label class="rotulo" for="texto-backup">Ou cole o texto do backup</label>
        <textarea
          id="texto-backup"
          rows="4"
          (input)="texto.set($any($event.target).value)"
          [value]="texto()"
        ></textarea>
        <div class="acoes">
          <button type="button" class="botao" [disabled]="texto().trim() === ''" (click)="lerTexto(texto())">
            Ler backup
          </button>
        </div>
        @if (erro(); as e) {
          <p role="alert" class="erro">{{ e }}</p>
        }
      </div>

      @if (backup(); as b) {
        <div class="cartao" data-testid="previa-importacao">
          <p>
            {{ b.personagens.length }} personagem(ns), {{ b.instancias.length }} instância(s),
            {{ b.itens.length }} item(ns) e <strong>{{ b.checkins.length }} check-in(s)</strong>.
          </p>
          <span class="rotulo">De qual personagem é cada um?</span>
          @for (p of b.personagens; track p.id) {
            <div class="mapa">
              <span
                >{{ p.nome }} <span class="dica">({{ checkinsDe(p.id) }} check-ins)</span></span
              >
              <select
                [attr.aria-label]="'Personagem para ' + p.nome"
                (change)="mapear(p.id, $any($event.target).value)"
              >
                <option value="" [selected]="!valorMapa(p.id)">Não importar</option>
                @for (meu of farm.estado()?.personagens ?? []; track meu.id) {
                  <option [value]="meu.id" [selected]="valorMapa(p.id) === meu.id">{{ meu.nome }}</option>
                }
              </select>
            </div>
          }
          <div class="acoes">
            <button type="button" class="botao primario" [disabled]="importando()" (click)="importar(b)">
              {{ importando() ? "Importando… " + progresso() : "Importar" }}
            </button>
          </div>
        </div>
      }

      @if (resultado(); as r) {
        <div class="cartao" role="status" data-testid="resultado-importacao">
          <strong>Importação concluída</strong>
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
          <div class="acoes">
            <button type="button" class="botao primario" (click)="importado.emit()">Ver o dia</button>
          </div>
        </div>
      }
    </section>
  `,
  styles: `
    .mapa {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: center;
      gap: 8px;
    }
    .erro {
      margin: 0;
      color: var(--perigo);
    }
    ul {
      margin: 0;
      padding-left: 20px;
    }
    p {
      margin: 0;
    }
  `,
})
export class FarmImportarComponent {
  readonly farm = inject(FarmStore);
  readonly importado = output<void>();

  readonly texto = signal("");
  readonly erro = signal<string | null>(null);
  readonly backup = signal<BackupDiario | null>(null);
  readonly mapa = signal<Record<string, string>>({});
  readonly importando = signal(false);
  readonly feitos = signal(0);
  readonly resultado = signal<ResultadoImportacao | null>(null);
  readonly progresso = computed(() => {
    const total = this.backup()?.checkins.length ?? 0;
    return total > PEDACO ? `${Math.min(this.feitos(), total)}/${total}` : "";
  });

  valorMapa(idArtefato: string): string {
    return this.mapa()[idArtefato] ?? "";
  }

  checkinsDe(personagemId: string): number {
    return this.backup()?.checkins.filter((c) => c.personagem === personagemId).length ?? 0;
  }

  async lerArquivo(campo: HTMLInputElement): Promise<void> {
    const arquivo = campo.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 20 * 1024 * 1024) {
      this.erro.set("Arquivo grande demais para ser um backup do Diário.");
      return;
    }
    this.lerTexto(await arquivo.text());
  }

  lerTexto(texto: string): void {
    this.erro.set(null);
    this.resultado.set(null);
    this.backup.set(null);
    try {
      const b = lerBackup(JSON.parse(texto));
      // Sugere o personagem com o mesmo nome.
      const meus = this.farm.estado()?.personagens ?? [];
      const mapa: Record<string, string> = {};
      for (const p of b.personagens) {
        const igual = meus.find((m) => m.nome.toLowerCase() === p.nome.toLowerCase());
        if (igual) mapa[p.id] = igual.id;
      }
      this.mapa.set(mapa);
      this.backup.set(b);
    } catch (e) {
      this.erro.set(
        e instanceof ErroBackup
          ? e.message
          : "Não foi possível ler o backup. Envie o arquivo ou cole o texto completo.",
      );
    }
  }

  mapear(idArtefato: string, personagemId: string): void {
    this.mapa.update((m) => {
      const novo = { ...m };
      if (personagemId) novo[idArtefato] = personagemId;
      else delete novo[idArtefato];
      return novo;
    });
  }

  async importar(b: BackupDiario): Promise<void> {
    this.importando.set(true);
    this.erro.set(null);
    this.feitos.set(0);
    const total: ResultadoImportacao = {
      itensCriados: 0,
      instanciasCriadas: 0,
      checkinsImportados: 0,
      checkinsJaImportados: 0,
      checkinsSemPersonagem: 0,
    };
    try {
      const pedacos = Math.max(1, Math.ceil(b.checkins.length / PEDACO));
      for (let n = 0; n < pedacos; n++) {
        const checkins = b.checkins.slice(n * PEDACO, (n + 1) * PEDACO);
        const r = await this.farm.importar({ ...b, checkins }, this.mapa());
        for (const k of Object.keys(total) as (keyof ResultadoImportacao)[]) total[k] += r[k];
        this.feitos.set((n + 1) * PEDACO);
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
