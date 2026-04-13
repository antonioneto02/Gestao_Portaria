const swaggerUi = require('swagger-ui-express');

const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'ERP Cini — Gestão de Portaria',
    version: '1.0.0',
    description: 'Sistema web para gestão de portaria, agendamentos, retiras, cargas e conferência de pessoas. Autenticação via sessão (cookie).',
  },
  servers: [{ url: 'http://localhost:3000', description: 'Servidor local' }],
  tags: [
    { name: 'Autenticação', description: 'Login e logout' },
    { name: 'Dashboard' },
    { name: 'Retiras', description: 'Gestão de retiras de mercadoria' },
    { name: 'Agendamentos', description: 'Agendamentos de visitas e coletas' },
    { name: 'Cargas Portaria', description: 'Controle de cargas na portaria' },
    { name: 'Conferência', description: 'Conferência de pessoas' },
    { name: 'Notificações', description: 'Envio de notificações' },
    { name: 'API', description: 'Endpoints JSON internos' },
    { name: 'Webhook', description: 'Webhooks de integração' },
  ],
  paths: {
    '/loginPage': { get: { tags: ['Autenticação'], summary: 'Página de login', responses: { 200: { description: 'HTML da tela de login' } } } },
    '/login': {
      post: {
        tags: ['Autenticação'],
        summary: 'Autentica usuário',
        requestBody: { content: { 'application/x-www-form-urlencoded': { schema: { type: 'object', required: ['username', 'password'], properties: { username: { type: 'string' }, password: { type: 'string', format: 'password' } } } } } },
        responses: { 302: { description: 'Redireciona para /dashboard em caso de sucesso, volta para /loginPage em falha' } },
      },
    },
    '/logout': { get: { tags: ['Autenticação'], summary: 'Encerra a sessão', responses: { 302: { description: 'Redireciona para /loginPage' } } } },
    '/dashboard': { get: { tags: ['Dashboard'], summary: 'Painel principal', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Dashboard com resumo do dia' }, 302: { description: 'Redireciona para login se não autenticado' } } } },
    '/retiras': { get: { tags: ['Retiras'], summary: 'Lista de retiras', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Página de retiras' } } } },
    '/retiras/data': { get: { tags: ['Retiras'], summary: 'Dados de retiras (JSON)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Array de retiras' } } } },
    '/retiras/{id}/update': {
      post: {
        tags: ['Retiras'], summary: 'Atualiza status de uma retira', security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Atualizado' } },
      },
    },
    '/agendamentos': {
      get: { tags: ['Agendamentos'], summary: 'Lista agendamentos', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Página de agendamentos' } } },
      post: {
        tags: ['Agendamentos'], summary: 'Cria novo agendamento', security: [{ cookieAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object' } } } },
        responses: { 200: { description: 'Agendamento criado' } },
      },
    },
    '/agendamentos/{id}/concluir': {
      post: {
        tags: ['Agendamentos'], summary: 'Conclui um agendamento', security: [{ cookieAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: { 200: { description: 'Concluído' } },
      },
    },
    '/agendamentos/delete': {
      post: {
        tags: ['Agendamentos'], summary: 'Remove um agendamento', security: [{ cookieAuth: [] }],
        requestBody: { content: { 'application/json': { schema: { type: 'object', properties: { id: { type: 'integer' } } } } } },
        responses: { 200: { description: 'Removido' } },
      },
    },
    '/cargas-portaria': { get: { tags: ['Cargas Portaria'], summary: 'Lista cargas na portaria', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Página de cargas' } } } },
    '/cargas-portaria/find': { get: { tags: ['Cargas Portaria'], summary: 'Busca carga pelo número', security: [{ cookieAuth: [] }], parameters: [{ name: 'q', in: 'query', schema: { type: 'string' } }], responses: { 200: { description: 'Resultado da busca' } } } },
    '/cargas-portaria/concluir': { post: { tags: ['Cargas Portaria'], summary: 'Conclui carga', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Concluído' } } } },
    '/cargas-portaria/delete': { post: { tags: ['Cargas Portaria'], summary: 'Remove carga', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Removido' } } } },
    '/conferencia': { get: { tags: ['Conferência'], summary: 'Tela de conferência de pessoas', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Página de conferência' } } } },
    '/conferencia/search': { get: { tags: ['Conferência'], summary: 'Busca pessoa por nome/documento', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Resultados' } } } },
    '/conferencia/data': { get: { tags: ['Conferência'], summary: 'Dados de conferências (JSON)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Array de conferências' } } } },
    '/notificacoes': { post: { tags: ['Notificações'], summary: 'Envia notificação manual', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Enviado' } } } },
    '/api/responsaveis': { get: { tags: ['API'], summary: 'Lista responsáveis (JSON)', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Array de responsáveis' } } } },
    '/api/responsavel/{mat}': { get: { tags: ['API'], summary: 'Responsável por matrícula', security: [{ cookieAuth: [] }], parameters: [{ name: 'mat', in: 'path', required: true, schema: { type: 'string' } }], responses: { 200: { description: 'Dados do responsável' } } } },
    '/webhook/agendamento/confirm': { post: { tags: ['Webhook'], summary: 'Confirma agendamento via webhook externo', responses: { 200: { description: 'Confirmado' } } } },
    '/horarios-retira': { get: { tags: ['Retiras'], summary: 'Horários disponíveis para retira', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Página de horários' } } } },
    '/horarios-retira/book': { post: { tags: ['Retiras'], summary: 'Reserva horário de retira', security: [{ cookieAuth: [] }], responses: { 200: { description: 'Horário reservado' } } } },
  },
  components: {
    securitySchemes: {
      cookieAuth: { type: 'apiKey', in: 'cookie', name: 'connect.sid', description: 'Sessão criada após login' },
    },
  },
};

module.exports = { swaggerUi, swaggerDocument };
