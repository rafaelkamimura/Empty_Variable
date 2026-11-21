-- Caixa de saída das notificações por DM entregues pelo bot nag4eyes.
-- Contrato dos eventos: backend/src/notificacoes/eventos.ts. Protocolo: docs/integracao-notificacoes.md.

CREATE TYPE "StatusNotificacao" AS ENUM ('PENDENTE', 'ENTREGUE', 'FALHOU');

CREATE TABLE "notificacao" (
  "id" UUID PRIMARY KEY,
  "discord_id" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "dados" JSONB NOT NULL,
  "status" "StatusNotificacao" NOT NULL DEFAULT 'PENDENTE',
  "tentativas" INTEGER NOT NULL DEFAULT 0,
  "reservada_ate" TIMESTAMPTZ(3),
  "motivo_falha" TEXT,
  "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "confirmada_em" TIMESTAMPTZ(3),
  CONSTRAINT "notificacao_tentativas_check" CHECK ("tentativas" >= 0),
  CONSTRAINT "notificacao_dados_check" CHECK (jsonb_typeof("dados") = 'object'),
  CONSTRAINT "notificacao_confirmacao_check" CHECK (("status" = 'PENDENTE') = ("confirmada_em" IS NULL))
);

-- Fila: só as pendentes, na ordem em que aconteceram.
CREATE INDEX "notificacao_pendentes_idx" ON "notificacao"("criada_em", "id") WHERE "status" = 'PENDENTE';
-- Limpeza das já confirmadas.
CREATE INDEX "notificacao_status_confirmada_em_idx" ON "notificacao"("status", "confirmada_em");
