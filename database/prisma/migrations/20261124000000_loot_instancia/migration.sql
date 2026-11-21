-- Loot das instâncias (D60): drops de cada monstro, buscados uma vez na Divine Pride e guardados.
-- Só inclusão: nenhuma coluna ou tabela existente muda.

-- CreateTable
CREATE TABLE "loot_monstro" (
    "id_monstro" INTEGER NOT NULL,
    "existe" BOOLEAN NOT NULL,
    "servidor" TEXT,
    "itens" JSONB NOT NULL DEFAULT '[]',
    "buscado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "loot_monstro_pkey" PRIMARY KEY ("id_monstro")
);
