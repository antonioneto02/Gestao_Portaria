CREATE TABLE IF NOT EXISTS "AGENDAMENTO_PORTAL" (
  "id"                SERIAL PRIMARY KEY,
  "tipo"              VARCHAR(100)  NULL,
  "data_hora"         TIMESTAMP     NULL,
  "assunto"           VARCHAR(1000) NULL,
  "nome"              VARCHAR(500)  NULL,
  "nome_solicitante"  VARCHAR(500)  NULL,
  "telefone"          VARCHAR(50)   NULL,
  "cpf_cnpj"          VARCHAR(50)   NULL,
  "responsavel"       VARCHAR(250)  NULL,
  "observacoes"       VARCHAR(2000) NULL,
  "status"            VARCHAR(50)   NOT NULL DEFAULT 'Pendente',
  "criado_por"        VARCHAR(250)  NULL,
  "dt_criacao"        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "concluido_por"     VARCHAR(250)  NULL,
  "dt_cheg"           TIMESTAMP     NULL,
  "enviou"            SMALLINT      NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "VISITANTES" (
  "id"              SERIAL PRIMARY KEY,
  "nome"            VARCHAR(500) NULL,
  "telefone"        VARCHAR(50)  NULL,
  "cpf_cnpj"        VARCHAR(50)  NULL,
  "dt_inclusao"     TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "agendamento_id"  INT          NULL REFERENCES "AGENDAMENTO_PORTAL"("id")
);

CREATE TABLE IF NOT EXISTS "HORARIOS_AGENDAMENTO" (
  "id"            SERIAL PRIMARY KEY,
  "pedido"        VARCHAR(100)  NULL,
  "data"          TIMESTAMP     NULL,
  "criado_por"    VARCHAR(200)  NULL,
  "nome_cli"      VARCHAR(500)  NULL,
  "cod_cli"       VARCHAR(100)  NULL,
  "categoria"     VARCHAR(50)   NULL,
  "observacao"    VARCHAR(1000) NULL,
  "status"        VARCHAR(50)   NOT NULL DEFAULT 'PENDENTE',
  "data_entrada"  TIMESTAMP     NULL,
  "data_saida"    TIMESTAMP     NULL,
  "dt_criacao"    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "CARGAS_PORTARIA" (
  "id"            SERIAL PRIMARY KEY,
  "filial"        VARCHAR(50)    NULL,
  "carga"         VARCHAR(200)   NULL,
  "dt_entrega"    TIMESTAMP      NULL,
  "placa"         VARCHAR(50)    NULL,
  "tipo_entrega"  VARCHAR(100)   NULL,
  "motorista"     VARCHAR(250)   NULL,
  "peso"          DECIMAL(12,2)  NULL,
  "status"        VARCHAR(50)    NULL,
  "telefone"      VARCHAR(50)    NULL,
  "cpf_cnpj"      VARCHAR(50)    NULL,
  "criado_por"    VARCHAR(250)   NULL,
  "dt_criacao"    TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "IX_AGENDAMENTO_PORTAL_DATA_HORA" ON "AGENDAMENTO_PORTAL" ("data_hora");
CREATE INDEX IF NOT EXISTS "IX_AGENDAMENTO_PORTAL_STATUS" ON "AGENDAMENTO_PORTAL" ("status");
CREATE INDEX IF NOT EXISTS "IX_CARGAS_PORTARIA_DT_ENTREGA" ON "CARGAS_PORTARIA" ("dt_entrega");
CREATE INDEX IF NOT EXISTS "IX_HORARIOS_AGENDAMENTO_PEDIDO" ON "HORARIOS_AGENDAMENTO" ("pedido");
CREATE UNIQUE INDEX IF NOT EXISTS "IX_HORARIOS_AGENDAMENTO_UNQ_DATA" ON "HORARIOS_AGENDAMENTO" ("data");
