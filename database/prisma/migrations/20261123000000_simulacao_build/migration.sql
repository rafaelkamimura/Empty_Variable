-- Simulação de dano (D57): a ficha guarda a build inteira, e as instâncias ganham chefes (monstros).
-- Só inclusão: nenhuma coluna ou tabela existente muda. Regras do cálculo: packages/simulador.

-- AlterTable
ALTER TABLE "personagem" ADD COLUMN "atributos" JSONB NOT NULL DEFAULT '{}';

-- CreateTable
CREATE TABLE "monstro" (
    "id_jogo" INTEGER NOT NULL,
    "nome" TEXT,
    "existe" BOOLEAN NOT NULL,
    "origem" TEXT NOT NULL,
    "servidor" TEXT,
    "fonte" TEXT,
    "nivel" INTEGER,
    "hp" BIGINT,
    "def" INTEGER,
    "mdef" INTEGER,
    "vit" INTEGER,
    "inteligencia" INTEGER,
    "res" INTEGER,
    "mres" INTEGER,
    "raca" TEXT,
    "tamanho" TEXT,
    "elemento" TEXT,
    "nivel_elemento" INTEGER,
    "chefe" BOOLEAN,
    "dano_recebido_pct" INTEGER,
    "buscado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "monstro_pkey" PRIMARY KEY ("id_jogo")
);

-- CreateTable
CREATE TABLE "chefe_instancia" (
    "id" UUID NOT NULL,
    "instancia_id" UUID NOT NULL,
    "id_monstro" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "observacao" TEXT,
    "fonte" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chefe_instancia_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chefe_instancia_instancia_id_id_monstro_key" ON "chefe_instancia"("instancia_id", "id_monstro");

-- AddForeignKey
ALTER TABLE "chefe_instancia" ADD CONSTRAINT "chefe_instancia_instancia_id_fkey" FOREIGN KEY ("instancia_id") REFERENCES "instancia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
