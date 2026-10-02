# Banco de dados: SQL Server hoje, PostgreSQL quando quiser

Mesmo padrão do Planner Cini. Este app usa variáveis próprias (`*_GESTAO`) para não colidir com o `DB_PASSWORD` global definido no Windows deste servidor.

## Como está organizado

| Conexão | Arquivo | Banco | Variáveis |
|---|---|---|---|
| Tabelas próprias (`AGENDAMENTO_PORTAL`, `VISITANTES`, `HORARIOS_AGENDAMENTO`, `CARGAS_PORTARIA`) | `config/sequelize.js` (`sequelizeGestao`) | `mssql` (padrão) ou `postgres` | `DB_DIALECT`, `DB_SERVER_GESTAO`, `DB_PORT_GESTAO`, `DB_USER_GESTAO`, `DB_PASSWORD_GESTAO`, `DB_DATABASE_GESTAO`, `DB_SSL_GESTAO=1` (no SQL Server, se vazios, usam os `*_ERP`) |
| DW (`DIM_CLIENTES`, `DIM_MOTORISTAS`, `FATO_PEDIDOS`, `V_CARGAS`, `V_PESSOAS`, fila de notificações) e Protheus (`SRA010`) | `config/sequelize.js` (`sequelizeDw`, `sequelizeProtheus`) e `config/dbConfig*.js` | sempre SQL Server | `DB_SERVER_ERP`, `DB_USER_ERP`, `DB_PASSWORD_ERP`, `DB_DATABASE_DW`, `DB_DATABASE_PROTHEUS` (sem mudança) |

- `models/`: models Sequelize das tabelas próprias; a ordem de migração (`ORDEM`) em `models/index.js`.
- Nas tabelas próprias não se escreve SQL à mão: tudo passa pelo ORM. Antes o `DB_DIALECT` trocava as três conexões (inclusive DW e Protheus); agora só a de gestão troca. Ordenações por colunas de data que aceitam nulo usam `ordemSqlServer()` para o PostgreSQL pôr os nulos no mesmo lugar do SQL Server.
- (sem script no repositório; tabelas já existentes no `gestao_portaria`): DDL do SQL Server. `database/sql/postgres/create_tables.sql`: DDL do PostgreSQL.

Sem nenhuma variável nova no `.env`, o app continua exatamente como antes (SQL Server).

## Trocar para PostgreSQL

1. Crie o banco: `CREATE DATABASE gestao_portaria ENCODING 'UTF8';`
2. Copie os dados (só lê o SQL Server; cria as tabelas, copia tudo e acerta as sequências de `ID`):
   ```
   DESTINO_DB_SERVER=... DESTINO_DB_PORT=5432 DESTINO_DB_USER=... DESTINO_DB_PASSWORD=... DESTINO_DB_DATABASE=gestao_portaria npm run db:migrar:postgres
   ```
3. No `.env`:
   ```
   DB_DIALECT=postgres
   DB_SERVER_GESTAO=<postgres>  DB_PORT_GESTAO=5432  DB_USER_GESTAO=...  DB_PASSWORD_GESTAO=...  DB_DATABASE_GESTAO=gestao_portaria
   (os *_ERP continuam apontando para o SQL Server)
   ```
4. Reinicie o app. Para voltar, basta remover `DB_DIALECT` e os `*_GESTAO`.

## Testes

- `npm run test:unit`: sem banco (roda no CI). Confere a escolha do dialeto, que as conexões legadas seguem no SQL Server e que o DDL do PostgreSQL tem todas as tabelas/colunas dos models.
- `npm run test:integracao`: contra bancos reais, exercitando agendamentos, cargas da portaria e horários de retirada.
  - SQL Server (usa o `.env`; tudo roda numa transação desfeita no fim, nada é gravado e o `IDENTITY` das tabelas volta ao valor anterior; testes de gravação são pulados se o usuário do `.env` não tiver permissão): `TESTE_DIALETO=mssql npm run test:integracao`
  - PostgreSQL (banco vazio de teste): `TESTE_DIALETO=postgres TESTE_PG_SERVER=localhost TESTE_PG_PORT=5432 TESTE_PG_USER=postgres TESTE_PG_PASSWORD=... TESTE_PG_DATABASE=teste_gestao_portaria npm run test:integracao`

## Mudanças de comportamento

- **Bug já existente (não corrigido no SQL Server):** o model `Visitante` lê/grava `telefone` e `cpf_cnpj`, que não existem na tabela `VISITANTES` do SQL Server; toda operação com visitantes falha hoje. No PostgreSQL as colunas existem. Para corrigir no SQL Server: `ALTER TABLE VISITANTES ADD telefone NVARCHAR(50) NULL, cpf_cnpj NVARCHAR(50) NULL;`
- Buscas de cargas por placa/carga/filial ignoram maiúsculas/minúsculas nos dois bancos (no SQL Server já era assim).
