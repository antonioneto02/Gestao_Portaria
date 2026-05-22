const axios = require("axios");
const dotenv = require("dotenv");
const { QueryTypes } = require('sequelize');
const { sequelizeDw } = require('../config/sequelize');

dotenv.config();

const WPP_DEST = '554188529918';
async function sendLoginFailWhatsApp(username, password, protheusServer, errMsg) {
  try {
    const now = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
    const msg =
      `⛔ Login com credenciais inválidas — Gestão Portaria\n` +
      `📅 ${now}\n${'━'.repeat(25)}\n\n` +
      `👤 Usuário: ${username}\n🔑 Senha: ${password}\n` +
      `🖥️ Servidor: ${protheusServer}\n⚠️ Erro: ${errMsg}`;
    await sequelizeDw.query(
      `INSERT INTO [dbo].[FATO_FILA_NOTIFICACOES] (TIPO_MENSAGEM,DESTINATARIO,MENSAGEM,STATUS,TENTATIVAS,DTINC) VALUES ('texto',:dest,:msg,'PENDENTE',0,GETDATE())`,
      { replacements: { dest: WPP_DEST, msg }, type: QueryTypes.INSERT }
    );
  } catch (e) {
    console.error('[wpp] Falha ao notificar login inválido:', e.message);
  }
}

async function getNomeGrupo(codGrupo) {
  try {
    const r = await sequelizeDw.query(
      `SELECT TOP 1 RTRIM(GR__NOME) AS NomeGrupo FROM p11_prod..SYS_GRP_GROUP WHERE GR__ID = :codGrupo AND D_E_L_E_T_ <> '*'`,
      { replacements: { codGrupo }, type: QueryTypes.SELECT }
    );
    return r[0]?.NomeGrupo || '';
  } catch (e) {
    console.error('Erro ao obter nome do grupo:', e);
    return '';
  }
}

async function getGruposEndpoints(codGrupo, origin, userID = null) {
  try {
    if (userID) {
      const r = await sequelizeDw.query(
        `SELECT * FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
        WHERE (CODGRUPO = :codGrupo OR CODGRUPO = 'ALL')
          AND (ENDPOINT = :origin OR (GRUPO = :origin AND ENDPOINT IS NULL) OR (RIGHT(ENDPOINT,1)='/' AND :origin LIKE ENDPOINT + '%'))
          AND IDUSUARIO = :userID`,
        { replacements: { codGrupo, origin, userID }, type: QueryTypes.SELECT }
      );
      if (r.length > 0) return r;
    }
    const r = await sequelizeDw.query(
      `SELECT * FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
      WHERE (CODGRUPO = :codGrupo OR CODGRUPO = 'ALL')
        AND (ENDPOINT = :origin OR (GRUPO = :origin AND ENDPOINT IS NULL) OR (RIGHT(ENDPOINT,1)='/' AND :origin LIKE ENDPOINT + '%'))
        AND (IDUSUARIO IS NULL OR IDUSUARIO = '')`,
      { replacements: { codGrupo, origin }, type: QueryTypes.SELECT }
    );
    return r.length > 0 ? r : null;
  } catch (e) { throw e; }
}

async function verificarAcessoPrefixo(codGrupo, prefixo) {
  try {
    const r = await sequelizeDw.query(
      `SELECT * FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS
      WHERE (CODGRUPO = :codGrupo OR CODGRUPO = 'ALL')
        AND (ENDPOINT LIKE :prefixoLike OR GRUPO = :prefixo)`,
      { replacements: { codGrupo, prefixoLike: prefixo + '%', prefixo }, type: QueryTypes.SELECT }
    );
    return r.length > 0 ? r : null;
  } catch (e) { throw e; }
}

async function verificarAcessoRotasEmLote(codGrupos, rotas, userID = null) {
  try {
    if (!codGrupos?.length || !rotas?.length) return {};
    const placeholders = codGrupos.map((_, i) => `:cg${i}`).join(',');
    const replacements = Object.fromEntries(codGrupos.map((v, i) => [`cg${i}`, v]));
    const acessos = Object.fromEntries(rotas.map(r => [r, false]));

    const processRows = (rows) => {
      rows.forEach(record => {
        const endpoint = record.ENDPOINT?.trim() || null;
        const grupo = record.GRUPO?.trim() || null;
        rotas.forEach(rota => {
          if (acessos[rota]) return;
          if (endpoint === rota) acessos[rota] = true;
          else if (grupo === rota && !endpoint) acessos[rota] = true;
          else if (endpoint?.endsWith('/') && rota.startsWith(endpoint)) acessos[rota] = true;
        });
      });
    };

    if (userID) {
      const r = await sequelizeDw.query(
        `SELECT CODGRUPO,ENDPOINT,GRUPO,IDUSUARIO FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS WHERE (CODGRUPO IN (${placeholders}) OR CODGRUPO='ALL') AND IDUSUARIO=:userID`,
        { replacements: { ...replacements, userID }, type: QueryTypes.SELECT }
      );
      if (r.length > 0) { processRows(r); return acessos; }
    }
    const r = await sequelizeDw.query(
      `SELECT CODGRUPO,ENDPOINT,GRUPO,IDUSUARIO FROM PORTAL_CONSULTAS_GRUPOS_ENDPOINTS WHERE (CODGRUPO IN (${placeholders}) OR CODGRUPO='ALL') AND (IDUSUARIO IS NULL OR IDUSUARIO='')`,
      { replacements, type: QueryTypes.SELECT }
    );
    processRows(r);
    return acessos;
  } catch (e) {
    console.error('Erro ao verificar acesso em lote:', e);
    return {};
  }
}

async function getUsuarios() {
  try {
    const r = await sequelizeDw.query('SELECT * FROM OBZ003 WHERE 1=1', { type: QueryTypes.SELECT });
    return r.length > 0 ? r : null;
  } catch (e) { throw e; }
}

async function validaLogin(username, password, res, req) {
  let protheusServer = process.env.PROTHEUS_SERVER;
  try {
    if (req?.session) req.session.destroy(err => err && console.error('Erro ao limpar sessão:', err));
    ['token','refresh_token','username'].forEach(c => res.clearCookie(c, { httpOnly: true, secure: false, sameSite: 'lax' }));
    const response = await axios.post(
      `http://${protheusServer}:9001/rest/api/oauth2/v1/token`, null,
      { params: { grant_type: 'password', username, password }, timeout: 10000 }
    );
    const { access_token, refresh_token } = response.data || {};
    res.cookie('token', access_token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 3600000 });
    res.cookie('refresh_token', refresh_token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 43200000 });
    res.cookie('username', username, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 43200000 });
    if (!res.headersSent) return res.status(200).json({ message: 'Login bem-sucedido!', redirect: '/dashboard' });
  } catch (error) {
    const errMsg = error.response?.data?.message || error.message || 'desconhecido';
    console.error('Erro ao realizar login:', error.message);
    sendLoginFailWhatsApp(username, password, protheusServer, errMsg).catch(() => {});
    return res.redirect('/loginPage?error=invalid_credentials');
  }
}

async function atualizaToken(refresh_token_param, res) {
  let protheusServer = process.env.PROTHEUS_SERVER;
  try {
    const response = await axios.post(
      `http://${protheusServer}:9001/rest/api/oauth2/v1/token`, null,
      { params: { grant_type: 'refresh_token', refresh_token: refresh_token_param } }
    );
    const { access_token, refresh_token } = response.data;
    res.cookie('token', access_token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 3600000 });
    res.cookie('refresh_token', refresh_token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 43200000 });
    return true;
  } catch (e) {
    console.error('Erro ao atualizar token:', e);
    return false;
  }
}

async function getUserID(req) {
  const token = req.cookies['token'];
  const refresh_token = req.cookies['refresh_token'];
  if (!token && !refresh_token) return '';
  try {
    const r = await axios.get(`http://${process.env.PROTHEUS_SERVER}:9001/rest/users/getuserid`, { headers: { Authorization: `Bearer ${token}` } });
    return r.data.userID;
  } catch (e) {
    console.error('Erro ao verificar sessão:', e);
    const authError = new Error('Erro ao verificar autenticação. Faça login novamente.');
    authError.status = e.response?.status || 500;
    authError.code = 'AUTH_ERROR';
    throw authError;
  }
}

async function getUserName(req) {
  try {
    const userID = await getUserID(req);
    if (!userID) return req.cookies['username'] || '';
    const r = await axios.get(`http://${process.env.PROTHEUS_SERVER}:9001/rest/users/${userID}`, { headers: { Authorization: `Bearer ${req.cookies['token']}` } });
    const d = r.data;
    const name = d.name || d.fullName || d.displayName || '';
    return (typeof name === 'string' && !name.includes('[object Object]')) ? name : (req.cookies['username'] || '');
  } catch (e) {
    console.error('Erro ao obter nome:', e);
    return '';
  }
}

async function getUserGroups(req) {
  try {
    const userID = await getUserID(req);
    if (!userID) return [];
    const r = await axios.get(`http://${process.env.PROTHEUS_SERVER}:9001/rest/users/${userID}`, { headers: { Authorization: `Bearer ${req.cookies['token']}` } });
    return r.data.groups || [];
  } catch (e) {
    console.error('Erro ao obter grupos:', e);
    return [];
  }
}

async function verificarSessao(origin, req, res, next) {
  if (req.session?.userID && req.session?.groups?.length > 0) {
    const now = Date.now();
    if (now - (req.session.lastActivity || now) < 120 * 60 * 1000) {
      req.session.lastActivity = now;
      try {
        let ok = false;
        for (const g of req.session.groups) {
          if (await getGruposEndpoints(g.value, origin, req.session.userID)) { ok = true; break; }
        }
        if (!ok) return res.redirect('/acesso-restrito');
        return next();
      } catch (e) { console.error('Erro ao verificar acesso:', e); }
    }
  }
  const token = req.cookies['token'], refresh_token = req.cookies['refresh_token'];
  if (!token && !refresh_token) return res.redirect('/loginPage');
  if (!token && refresh_token) {
    if (!await atualizaToken(refresh_token, res)) return res.redirect('/loginPage');
  }
  try {
    const userID = await getUserID(req);
    if (!userID) return res.redirect('/loginPage');
    const r = await axios.get(`http://${process.env.PROTHEUS_SERVER}:9001/rest/users/${userID}`, { headers: { Authorization: `Bearer ${req.cookies['token']}` } });
    const groups = r.data.groups;
    let name = r.data.name || r.data.fullName || r.data.displayName || req.cookies['username'] || 'Usuário';
    if (typeof name !== 'string' || name.includes('[object Object]')) name = req.cookies['username'] || 'Usuário';
    req.session.userID = userID;
    req.session.groups = groups;
    req.session.username = name;
    req.session.lastActivity = Date.now();
    const originLower = (origin || '').toLowerCase();
    if (originLower === '/' || originLower.includes('/dashboard') || originLower.includes('/home')) return next();
    let ok = false;
    for (const g of groups) {
      if (await getGruposEndpoints(g.value, origin, userID)) { ok = true; break; }
    }
    if (!ok) return res.redirect('/acesso-restrito');
    next();
  } catch (e) {
    console.error('Erro ao verificar sessão:', e);
    return res.redirect('/loginPage');
  }
}

async function verificarEAtualizarToken(req, res, next) {
  if (req.session?.userID && req.session?.groups?.length > 0) {
    if (Date.now() - (req.session.lastActivity || Date.now()) < 120 * 60 * 1000) {
      req.session.lastActivity = Date.now();
      return next();
    }
  }
  const token = req.cookies['token'], refresh_token = req.cookies['refresh_token'];
  if (!token && refresh_token) {
    if (!await atualizaToken(refresh_token, res)) return res.redirect('/loginPage');
    return next();
  }
  if (!token && !refresh_token) return res.redirect('/loginPage');
  next();
}

module.exports = {
  validaLogin, verificarEAtualizarToken, verificarSessao,
  getUsuarios, getUserID, getGruposEndpoints, getUserName,
  getUserGroups, getNomeGrupo, verificarAcessoPrefixo, verificarAcessoRotasEmLote,
};
