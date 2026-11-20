-- Rascunhos de run enviados pelo nag4eyes quando um grupo termina. Não pontuam: o gestor confirma
-- pelo registro normal de runs, que cria a run e os lançamentos.
CREATE TYPE "StatusRascunhoRun" AS ENUM ('PENDENTE', 'CONFIRMADO', 'DESCARTADO');

CREATE TABLE "rascunho_run" (
  "id" UUID PRIMARY KEY,
  "origem" TEXT NOT NULL,
  "id_origem" TEXT NOT NULL,
  "party_id" TEXT,
  "data" DATE NOT NULL,
  "instancia_id" UUID REFERENCES "instancia"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "instancia_origem" JSONB,
  "status" "StatusRascunhoRun" NOT NULL DEFAULT 'PENDENTE',
  "recebido_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "run_id" UUID REFERENCES "run"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "decidido_por" UUID REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "decidido_em" TIMESTAMPTZ(3),
  "motivo_descarte" TEXT,
  -- Só o rascunho confirmado aponta para a run; pendente não tem decisão.
  CONSTRAINT "rascunho_run_confirmado_check" CHECK (("status" = 'CONFIRMADO') = ("run_id" IS NOT NULL)),
  CONSTRAINT "rascunho_run_decisao_check" CHECK (
    ("status" = 'PENDENTE') = ("decidido_em" IS NULL AND "decidido_por" IS NULL)
  )
);
-- Idempotência: o mesmo envio da mesma origem nunca cria um segundo rascunho.
CREATE UNIQUE INDEX "rascunho_run_origem_id_origem_key" ON "rascunho_run"("origem", "id_origem");
CREATE UNIQUE INDEX "rascunho_run_run_id_key" ON "rascunho_run"("run_id");
CREATE INDEX "rascunho_run_status_recebido_em_idx" ON "rascunho_run"("status", "recebido_em");

CREATE TABLE "rascunho_run_participante" (
  "id" UUID PRIMARY KEY,
  "rascunho_id" UUID NOT NULL REFERENCES "rascunho_run"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "ordem" INTEGER NOT NULL,
  "discord_id" TEXT NOT NULL,
  "personagem_nome" TEXT NOT NULL,
  "classe_nome" TEXT,
  "classe_nome_ingles" TEXT,
  "classe_slug" TEXT,
  "jogador_id" UUID REFERENCES "jogador"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "personagem_id" UUID REFERENCES "personagem"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "classe_id" UUID REFERENCES "classe"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  "pendencia" TEXT
);
CREATE UNIQUE INDEX "rascunho_run_participante_rascunho_id_ordem_key"
  ON "rascunho_run_participante"("rascunho_id", "ordem");
