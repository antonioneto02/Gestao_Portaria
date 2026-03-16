'use strict';

const { Op } = require('sequelize');
const FatoPedido = require('./orm/FatoPedido');
const DimCliente = require('./orm/DimCliente');

async function searchByTerm(term, limit = 50) {
  try {
    const like = `%${term}%`;

    const pedidos = await FatoPedido.findAll({
      where: {
        [Op.or]: [
          { NUMERO:  term },
          { NUMERO:  { [Op.like]: like } },
          { CLIENTE: term },
          { CLIENTE: { [Op.like]: like } },
        ],
      },
      limit,
    });

    if (!pedidos.length) return [];
    const chaves = [...new Set(
      pedidos.map(p => String(p.CLIENTE || '') + String(p.LOJA || ''))
    )];

    const clientes = await DimCliente.findAll({
      where: { CHAVE_CLIENTE: { [Op.in]: chaves } },
    });
    const clienteMap = {};
    for (const c of clientes) clienteMap[c.CHAVE_CLIENTE] = c;

    return pedidos.map(p => {
      const chave = String(p.CLIENTE || '') + String(p.LOJA || '');
      const c     = clienteMap[chave];
      return {
        ...p.get({ plain: true }),
        DIM_CHAVE_CLIENTE: c ? c.CHAVE_CLIENTE : null,
        DIM_NOME:          c ? c.NOME          : null,
        DIM_FANTASIA:      c ? c.FANTASIA       : null,
        Pedido:            p.NUMERO,
        Cod_Cli:           p.CLIENTE || null,
        Loja:              p.LOJA    || null,
        Chave_Cliente:     c ? c.CHAVE_CLIENTE : chave,
        Nome_Cliente:      (c && (c.FANTASIA || c.NOME)) || null,
      };
    });
  } catch (err) {
    console.error('fatoPedidoModel.searchByTerm error:', err.message);
    return [];
  }
}

module.exports = { searchByTerm };
