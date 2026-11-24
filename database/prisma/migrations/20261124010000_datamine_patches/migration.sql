-- Datamine dos patches do cliente (D63): um registro por patch publicado pelo rolatam-dm.
-- O relatório fica em disco (DATAMINE_DIR); aqui só identificação e resumo. Só inclusão.

-- CreateTable
CREATE TABLE "patch_cliente" (
    "id" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "data_patch" DATE NOT NULL,
    "patches" JSONB NOT NULL,
    "resumo" JSONB NOT NULL,
    "bytes_html" INTEGER NOT NULL,
    "bytes_json" INTEGER NOT NULL,
    "publicado_em" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "patch_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patch_cliente_chave_key" ON "patch_cliente"("chave");

-- CreateIndex
CREATE INDEX "patch_cliente_data_patch_idx" ON "patch_cliente"("data_patch");
