# 🏷️ Gestão Portaria (ERP Cini)

> Sistema web de gestão de portaria — agendamentos de visitantes, reserva de docas, conferência de cargas e rastreamento com notificações.

## 📋 Sobre o Projeto

O **Gestão Portaria** é um sistema web completo para gerenciar toda a operação de portaria da empresa. Ele centraliza o controle de agendamentos de visitantes e prestadores de serviço, reserva de docas para retirada de caminhões, conferência de entregas e gestão de cargas.

O sistema resolve problemas como:
- **Falta de controle** sobre quem entra e sai da empresa
- **Conflitos de horário** nas docas de carga/descarga  
- **Falta de rastreabilidade** nas conferências de entrega
- **Comunicação falha** com motoristas e visitantes (integração com WhatsApp)

## 🛠️ Tecnologias

| Tecnologia | Descrição |
|---|---|
| **Node.js** | Ambiente de execução |
| **Express** | Framework web |
| **EJS** | Motor de templates (renderização no servidor) |
| **mssql + Sequelize** | Conexão com SQL Server (ORM e queries diretas) |
| **multer** | Upload de arquivos |
| **cookie-parser + express-session** | Gerenciamento de sessão e cookies |
| **compression** | Compressão gzip das respostas |
| **swagger-ui-express** | Documentação da API |
| **PM2** | Gerenciador de processos (`erp-cini`) |
| **Porta** | `3003` |

## 🔧 Como Funciona

1. **Autenticação** — O usuário acessa a tela de login. A autenticação é feita via SSO do **Hub Cini**. Ao chegar com `sso_token` na URL, o sistema salva o token em cookie e redireciona para a rota limpa.
2. **Painel** — O dashboard exibe os agendamentos do dia, status das docas e cargas pendentes.
3. **Agendamentos** — O usuário cria agendamentos para visitantes ou prestadores, definindo data, horário e motivo. O agendamento pode disparar uma notificação via WhatsApp.
4. **Reserva de Docas** — Horários de retirada de caminhões são gerenciados por doca, evitando conflitos de agendamento.
5. **Conferência** — Ao receber uma carga, o sistema permite registrar a conferência com detalhes da entrega.
6. **Notificações** — Confirmações de agendamento podem ser enviadas automaticamente via webhook do bot de WhatsApp.

## 📡 Funcionalidades

### Telas do sistema

| Tela | Descrição |
|---|---|
| **Dashboard** | Painel inicial com resumo dos agendamentos do dia |
| **Agendamentos** | Cadastro e listagem de agendamentos de visitantes/prestadores |
| **Horários de Agendamento** | Gerenciamento de horários disponíveis |
| **Conferência** | Listagem e registro de conferência de entregas |
| **Cargas/Portaria** | Gestão de cargas na portaria (cadastro e listagem) |
| **Retiras** | Controle de horários e reserva de docas para retirada |

### Modelos de dados

| Modelo | Descrição |
|---|---|
| `agendamentoModel` | CRUD de agendamentos |
| `horariosRetiraModel` | Gerenciamento de horários de retirada e docas |
| `conferenciaModel` | Registro e consulta de conferências |
| `cargaPortariaModel` | Controle de cargas na portaria |
| `notificacaoModel` | Envio e controle de notificações |
| `fatoPedidoModel` | Consulta de fatos de pedido (BI) |
| `userModel` | Gerenciamento de usuários |

## 🗄️ Banco de Dados

- **Tipo:** SQL Server (biblioteca `mssql` + Sequelize ORM)
- **Bancos:**
  - `dw` — Data Warehouse (dados de agendamentos, conferências, cargas, notificações)
  - `p11_prod` — Protheus (dados do ERP)
- **ORM:** Sequelize para modelos de agendamento, horários, clientes e cargas

## 🔗 Integrações

| Sistema | Tipo | Descrição |
|---|---|---|
| **Hub Cini** | SSO | Autenticação via Single Sign-On (recebe `sso_token` via query string) |
| **PortalConsultasCini** | Recursos estáticos | Compartilha CSS, JavaScript e imagens (`/css`, `/js`, `/images`) |
| **Bot WhatsApp** | Webhook | Recebe/envia confirmações de agendamento via `GESTAO_WEBHOOK_TOKEN` |
| **Protheus ERP** | Banco de dados | Consulta dados do ERP para conferência e pedidos |

## ⚙️ Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```env
# Porta do servidor
PORT=3003

# Banco de dados
DB_USER_ERP=seu_usuario
DB_PASSWORD_ERP=sua_senha
DB_SERVER_ERP=localhost
DB_DATABASE_DW=dw
DB_DATABASE_PROTHEUS=p11_prod

# Protheus
PROTHEUS_SERVER=192.168.0.88

# Segurança
JWT_SECRET_ERP=sua_chave_secreta

# Integração WhatsApp
GESTAO_WEBHOOK_TOKEN=token_do_webhook
```

## 📖 Documentação Swagger

A documentação interativa está disponível em:

```
http://localhost:3003/docs
```

## 🚀 Como Rodar

### Pré-requisitos
- Node.js instalado
- SQL Server com os bancos `dw` e `p11_prod` acessíveis
- Pasta `PortalConsultasCini` no diretório pai (para CSS/JS/imagens compartilhados)
- PM2 (opcional, para produção)

### Instalação

```bash
# Acessar o diretório do projeto
cd E:/Projetos/Gestao_Portaria/erp_cini

# Instalar dependências
npm install

# Configurar variáveis de ambiente
# Editar o arquivo .env com as credenciais corretas
```

### Executar em desenvolvimento

```bash
npm start
```

### Executar em produção (PM2)

```bash
pm2 start server.js --name erp-cini
```

O sistema estará disponível em `http://localhost:3003`.

### Estrutura de pastas

```
erp_cini/
├── config/          # Configurações de banco de dados
├── controllers/     # Controladores (loginController)
├── models/          # Modelos de dados (agendamento, conferência, etc.)
│   └── orm/         # Modelos Sequelize
├── views/           # Templates EJS
│   ├── partials/    # Componentes reutilizáveis
│   ├── HorariosRetira/
│   ├── Retiras/
│   └── System/      # Telas de sistema (login, etc.)
├── assets/          # Recursos estáticos do projeto
├── uploads/         # Arquivos enviados via upload
├── server.js        # Ponto de entrada
└── swagger.js       # Configuração Swagger
```
