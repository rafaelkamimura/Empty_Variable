-- Diário de farm (D48–D54): o farm pessoal de cada membro vinculado.
-- Regras de negócio: docs/planejamento/epico5-farm.md. Regras de recarga: packages/farm.

-- CreateEnum
CREATE TYPE "RecargaFarm" AS ENUM ('DIARIA', 'TRES_DIAS', 'SEMANAL', 'MENSAL');

-- CreateTable
CREATE TABLE "farm_instancia" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "recarga" "RecargaFarm" NOT NULL,
    "instancia_id" UUID,
    "ativa" BOOLEAN NOT NULL DEFAULT true,
    "criada_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_instancia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_instancia_personagem" (
    "farm_instancia_id" UUID NOT NULL,
    "personagem_id" UUID NOT NULL,

    CONSTRAINT "farm_instancia_personagem_pkey" PRIMARY KEY ("farm_instancia_id","personagem_id")
);

-- CreateTable
CREATE TABLE "farm_item" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "id_jogo" INTEGER,
    "preco_zeny" INTEGER,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_instancia_drop" (
    "farm_instancia_id" UUID NOT NULL,
    "farm_item_id" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "farm_instancia_drop_pkey" PRIMARY KEY ("farm_instancia_id","farm_item_id")
);

-- CreateTable
CREATE TABLE "farm_checkin" (
    "id" UUID NOT NULL,
    "usuario_id" UUID NOT NULL,
    "personagem_id" UUID NOT NULL,
    "farm_instancia_id" UUID NOT NULL,
    "feito_em" TIMESTAMPTZ(3) NOT NULL,
    "id_externo" TEXT,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "farm_checkin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "farm_checkin_drop" (
    "checkin_id" UUID NOT NULL,
    "farm_item_id" UUID NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "farm_checkin_drop_pkey" PRIMARY KEY ("checkin_id","farm_item_id")
);

-- CreateTable
CREATE TABLE "nome_item_divine_pride" (
    "id_jogo" INTEGER NOT NULL,
    "nome" TEXT,
    "existe" BOOLEAN NOT NULL,
    "buscado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "nome_item_divine_pride_pkey" PRIMARY KEY ("id_jogo")
);

-- CreateIndex
CREATE INDEX "farm_instancia_usuario_id_idx" ON "farm_instancia"("usuario_id");

-- CreateIndex
CREATE INDEX "farm_instancia_personagem_personagem_id_idx" ON "farm_instancia_personagem"("personagem_id");

-- CreateIndex
CREATE INDEX "farm_item_usuario_id_idx" ON "farm_item"("usuario_id");

-- CreateIndex
CREATE INDEX "farm_checkin_usuario_id_feito_em_idx" ON "farm_checkin"("usuario_id", "feito_em");

-- CreateIndex
CREATE INDEX "farm_checkin_personagem_id_farm_instancia_id_feito_em_idx" ON "farm_checkin"("personagem_id", "farm_instancia_id", "feito_em");

-- CreateIndex
CREATE UNIQUE INDEX "farm_checkin_usuario_id_id_externo_key" ON "farm_checkin"("usuario_id", "id_externo");

-- CreateIndex
CREATE INDEX "farm_checkin_drop_farm_item_id_idx" ON "farm_checkin_drop"("farm_item_id");

-- AddForeignKey
ALTER TABLE "farm_instancia" ADD CONSTRAINT "farm_instancia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_instancia" ADD CONSTRAINT "farm_instancia_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "instancia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_instancia_personagem" ADD CONSTRAINT "farm_instancia_personagem_farm_instancia_id_fkey" FOREIGN KEY ("farm_instancia_id") REFERENCES "farm_instancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_instancia_personagem" ADD CONSTRAINT "farm_instancia_personagem_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "personagem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_item" ADD CONSTRAINT "farm_item_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_instancia_drop" ADD CONSTRAINT "farm_instancia_drop_farm_instancia_id_fkey" FOREIGN KEY ("farm_instancia_id") REFERENCES "farm_instancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_instancia_drop" ADD CONSTRAINT "farm_instancia_drop_farm_item_id_fkey" FOREIGN KEY ("farm_item_id") REFERENCES "farm_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_checkin" ADD CONSTRAINT "farm_checkin_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_checkin" ADD CONSTRAINT "farm_checkin_personagem_id_fkey" FOREIGN KEY ("personagem_id") REFERENCES "personagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_checkin" ADD CONSTRAINT "farm_checkin_farm_instancia_id_fkey" FOREIGN KEY ("farm_instancia_id") REFERENCES "farm_instancia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_checkin_drop" ADD CONSTRAINT "farm_checkin_drop_checkin_id_fkey" FOREIGN KEY ("checkin_id") REFERENCES "farm_checkin"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "farm_checkin_drop" ADD CONSTRAINT "farm_checkin_drop_farm_item_id_fkey" FOREIGN KEY ("farm_item_id") REFERENCES "farm_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Nomes únicos por usuário, sem diferenciar maiúsculas (como os cadastros do grupo).
CREATE UNIQUE INDEX "farm_instancia_usuario_nome_key" ON "farm_instancia"("usuario_id", lower("nome"));
CREATE UNIQUE INDEX "farm_item_usuario_nome_key" ON "farm_item"("usuario_id", lower("nome"));

ALTER TABLE "farm_instancia" ADD CONSTRAINT "farm_instancia_nome_check" CHECK (char_length(btrim("nome")) BETWEEN 1 AND 80);
ALTER TABLE "farm_item" ADD CONSTRAINT "farm_item_nome_check" CHECK (char_length(btrim("nome")) BETWEEN 1 AND 80);
ALTER TABLE "farm_item" ADD CONSTRAINT "farm_item_preco_check" CHECK ("preco_zeny" IS NULL OR "preco_zeny" >= 0);
ALTER TABLE "farm_item" ADD CONSTRAINT "farm_item_id_jogo_check" CHECK ("id_jogo" IS NULL OR "id_jogo" > 0);
ALTER TABLE "farm_checkin_drop" ADD CONSTRAINT "farm_checkin_drop_quantidade_check" CHECK ("quantidade" > 0);
ALTER TABLE "nome_item_divine_pride" ADD CONSTRAINT "nome_item_divine_pride_check" CHECK ("existe" = ("nome" IS NOT NULL));
