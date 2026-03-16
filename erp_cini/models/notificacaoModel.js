'use strict';

const FatoFilaNotificacao = require('./orm/FatoFilaNotificacao');
async function enqueue({ tipo, destinatario, mensagem, metadados, template_name, template_params }) {
  try {
    await FatoFilaNotificacao.create({
      TIPO_MENSAGEM:   tipo            || 'EMAIL',
      DESTINATARIO:    destinatario    || '',
      MENSAGEM:        mensagem        || '',
      TEMPLATE_NAME:   template_name   || null,
      TEMPLATE_PARAMS: template_params || null,
      STATUS:          'PENDENTE',
      TENTATIVAS:      0,
      ERRO:            null,
      DTINC:           new Date(),
      DTENVIO:         null,
      MESSAGE_ID:      null,
      METADADOS:       metadados       || null,
    });
  } catch (err) {
    console.error('notificacaoModel.enqueue error:', err.message);
    throw err;
  }
}

module.exports = { enqueue };
