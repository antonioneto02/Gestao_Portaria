const path = require('path');
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const crypto = require('crypto');
require('dotenv').config();
const loginController = require('./controllers/loginController');
const sql = require('mssql');
const dbConfig = require('./config/database');
const dbProtheus = require('./config/dbConfigProtheus');
const dbDw = require('./config/dbConfigDw');
const app = express();
const PORT = process.env.PORT || 3000;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(cookieParser());
app.use('/css', express.static(path.join(__dirname, '..', 'PortalConsultasCini', 'public', 'css')));
app.use('/js', express.static(path.join(__dirname, '..', 'PortalConsultasCini', 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'PortalConsultasCini', 'public', 'images')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'change_this_secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

app.use((req, res, next) => {
  res.locals.currentPath = req.path || '/';
  res.locals.user = {
    nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário',
    email: req.session.user_email || req.cookies && req.cookies.user_email || '',
    id: req.session.user_id || req.session.userID || null
  };
  next();
});

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

const fallbackUsers = [
  { id: 1, name: 'Admin', email: 'admin@sistema.com', password: md5('admin123'), role: 'admin', active: 1 },
  { id: 2, name: 'João', email: 'joao@empresa.com', password: md5('123456'), role: 'user', active: 1 }
];

async function findUserByEmail(email) {
  try {
    const pool = await new sql.ConnectionPool(dbConfig).connect();
    try {
      const request = pool.request();
      request.input('email', sql.VarChar, email);
      const result = await request.query('SELECT TOP 1 * FROM users WHERE email = @email AND active = 1');
      if (result && result.recordset && result.recordset.length > 0) return result.recordset[0];
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (err) {
    console.error('Erro ao consultar usuário via mssql:', err && err.message ? err.message : err);
  }
  return fallbackUsers.find(u => u.email === email) || null;
}

app.get('/', (req, res) => {
  if (req.session && (req.session.user_id || req.session.userID)) return res.redirect('/dashboard');
  return res.redirect('/loginPage');
});

app.get('/loginPage', (req, res) => {
  const error = req.query.error || null;
  res.render('System/loginPage', { error, req });
});

app.post('/login', async (req, res) => {
  const username = (req.body.username || req.body.user || req.body.email || '').trim();
  const password = req.body.password || '';

  if (!username || !password) {
    return res.status(400).json({ message: 'Preencha todos os campos' });
  }

  try {
    await loginController.validaLogin(username, password, res, req);
  } catch (err) {
    console.error('Erro no login Protheus:', err && err.message ? err.message : err);
    if (err && err.response && err.response.data) console.error('Erro response data:', err.response.data);
    return res.redirect('/loginPage?error=invalid_credentials');
  }
});

app.get('/logout', (req, res) => {
  try {
    res.clearCookie('token');
    res.clearCookie('refresh_token');
    res.clearCookie('username');
    if (req.session) {
      req.session.destroy(() => {});
    }
  } catch (e) {}
  return res.redirect('/loginPage?logout=true');
});

async function ensureAuth(req, res, next) {
  return next();
}

app.get('/dashboard', ensureAuth, async (req, res) => {
  try {
    let total_plans = 0;
    let total_tasks = 0;
    let completed_tasks = 0;
    let overdue_tasks = 0;
    let my_tasks = 0;
    let total_users = 0;
    let completion_rate = 0;

    try {
      const pool = await new sql.ConnectionPool(dbConfig).connect();
      try {
        const r1 = await pool.request().query("SELECT COUNT(*) AS count FROM plans WHERE status = 'active'");
        const r2 = await pool.request().query('SELECT COUNT(*) AS count FROM tasks');
        const r3 = await pool.request().query("SELECT COUNT(*) AS count FROM tasks WHERE status = 'Concluída'");
        const r4 = await pool.request().query("SELECT COUNT(*) AS count FROM tasks WHERE status != 'Concluída' AND due_date < GETDATE()");
        const userId = req.session.user_id || req.session.userID || null;
        const r5 = userId ? await pool.request().input('uid', sql.VarChar, userId).query('SELECT COUNT(*) AS count FROM tasks WHERE responsible_id = @uid') : { recordset: [{ count: 0 }] };
        const r6 = await pool.request().query('SELECT COUNT(*) AS count FROM users WHERE active = 1');

        total_plans = (r1.recordset[0] && r1.recordset[0].count) || 0;
        total_tasks = (r2.recordset[0] && r2.recordset[0].count) || 0;
        completed_tasks = (r3.recordset[0] && r3.recordset[0].count) || 0;
        overdue_tasks = (r4.recordset[0] && r4.recordset[0].count) || 0;
        my_tasks = (r5.recordset[0] && r5.recordset[0].count) || 0;
        total_users = (r6.recordset[0] && r6.recordset[0].count) || 0;
        completion_rate = total_tasks > 0 ? Math.round((completed_tasks / total_tasks) * 100) : 0;
      } finally {
        try { await pool.close(); } catch(_){}
      }
    } catch (dbErr) {
    }

    let agendamentosHoje = [];
    let total_agendamentos = 0;
    let count_visita = 0;
    let count_prest_servicos = 0;
    let agendamentosAtrasados = [];
    try {
      const agendamentoModel = require('./models/agendamentoModel');
      agendamentosHoje = await agendamentoModel.getToday();
      const all = await agendamentoModel.getAll();
      total_agendamentos = all.length || 0;
      count_visita = all.filter(a => (a.tipo || '').toString().toLowerCase() === 'visita').length;
      count_prest_servicos = all.filter(a => {
        const t = (a.tipo || '').toString().toLowerCase();
        return t === 'prestacao de servicos' || t === 'prestação de serviços' || t === 'prestador de serviços' || t === 'prestadores de serviços';
      }).length;

      const todayStart = new Date();
      todayStart.setHours(0,0,0,0);
      agendamentosAtrasados = all.filter(a => {
        const raw = a.data_hora || a.dataHora || a.DataHora || '';
        let d = null;
        try {
          if (typeof raw === 'string' && raw.indexOf(' ') !== -1) d = new Date(raw.replace(' ', 'T'));
          else d = new Date(raw);
        } catch(_){ d = null; }
        if (!d || isNaN(d)) return false;
        return d < todayStart;
      });
    } catch (e) {
      console.error('Erro ao buscar agendamentos do dia/aggregates:', e && e.message ? e.message : e);
      agendamentosHoje = [];
      total_agendamentos = 0;
      count_visita = 0;
      count_prest_servicos = 0;
      agendamentosAtrasados = [];
    }

    res.render('dashboard', {
      total_plans,
      total_tasks,
      completed_tasks,
      overdue_tasks,
      my_tasks,
      completion_rate,
      total_users,
      agendamentosHoje,
      total_agendamentos,
      count_visita,
      count_prest_servicos,
      agendamentosAtrasados,
      user: {
        nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário',
        email: req.session.user_email || req.cookies && req.cookies.user_email || '',
        id: req.session.user_id || req.session.userID || null
      }
    });
  } catch (err) {
    console.error('Erro ao renderizar dashboard:', err);
    res.render('dashboard', {
      total_plans: 0,
      total_tasks: 0,
      completed_tasks: 0,
      overdue_tasks: 0,
      my_tasks: 0,
      completion_rate: 0,
      total_users: 0,
      agendamentosHoje: [],
      total_agendamentos: 0,
      count_visita: 0,
      count_prest_servicos: 0,
      agendamentosAtrasados: [],
      user_name: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário'
    });
  }
});

app.post('/agendamentos/:id/concluir', ensureAuth, express.json(), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ success: false, message: 'ID ausente' });
  try {
    const agendamentoModel = require('./models/agendamentoModel');
    const marcadoPor = (req && req.session && (req.session.user_name || req.session.username))
      ? (req.session.user_name || req.session.username)
      : (req && req.cookies && req.cookies.username) ? req.cookies.username : null;
    const telefone = req.body && req.body.telefone ? String(req.body.telefone).trim() : null;
    const cpf_cnpj = req.body && req.body.cpf_cnpj ? String(req.body.cpf_cnpj).trim() : null;
    const dtCheg = new Date();
    await agendamentoModel.updateStatus(id, 'Concluída', marcadoPor, telefone, cpf_cnpj, dtCheg);
    try {
      const poolDw = await new sql.ConnectionPool(dbDw).connect();
      try {
        const q = `SELECT id, nome, telefone, responsavel, criado_por, data_hora, observacoes, assunto FROM [dw].[dbo].[AGENDAMENTO_PORTAL] WHERE id = @id`;
        const r = await poolDw.request().input('id', sql.Int, parseInt(id, 10)).query(q);
        const ag = (r && r.recordset && r.recordset[0]) ? r.recordset[0] : null;
        if (ag) {
          function formatDateBR(dt) {
            try {
              if (!dt) return '';
              const s = String(dt).trim();
              const m = s.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
              if (m) return `${m[3]}/${m[2]}/${m[1]}, ${m[4]}:${m[5]}`;
              const iso = s.includes('T') ? s : s.replace(' ', 'T');
              const parsed = new Date(iso);
              if (!isNaN(parsed)) {
                const dd = String(parsed.getDate()).padStart(2, '0');
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const yyyy = parsed.getFullYear();
                const hh = String(parsed.getHours()).padStart(2, '0');
                const min = String(parsed.getMinutes()).padStart(2, '0');
                return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
              }
              return s;
            } catch (e) { return String(dt); }
          }
          async function resolvePhoneByName(name) {
            try {
              if (!name) return null;
              const justDigits = String(name).replace(/\D+/g, '');
              if (justDigits.length >= 8 && justDigits.length <= 13) return justDigits;

              const rawName = String(name || '').replace(/[\.\_\-\@]/g, ' ').trim();
              if (!rawName) return null;
              const tokens = rawName.split(/\s+/).map(t => t.trim()).filter(t => t && t.length >= 2);
              if (!tokens.length) return null;

              const poolP = await new sql.ConnectionPool(dbProtheus).connect();
              try {
                const whereParts = tokens.map((t, i) => `RA_NOME COLLATE Latin1_General_CI_AI LIKE @tok${i}`);
                const q2 = `SELECT TOP 1 RA_MAT, RA_NOME, RA_DDDCELU, RA_NUMCELU, RA_TELEFON FROM SRA010 WHERE ${whereParts.join(' AND ')}`;
                const reqP2 = poolP.request();
                tokens.forEach((t, i) => reqP2.input(`tok${i}`, sql.VarChar, `%${t}%`));
                const r2 = await reqP2.query(q2);
                const found = (r2 && r2.recordset && r2.recordset[0]) ? r2.recordset[0] : null;
                if (found) {
                  const ddd = String(found.RA_DDDCELU || '').trim();
                  const num = String(found.RA_NUMCELU || '').trim() || String(found.RA_TELEFON || '').trim();
                  if (ddd && num) return (ddd + num).replace(/\D+/g, '');
                  if (num) return num.replace(/\D+/g, '');
                }
              } finally {
                try { await poolP.close(); } catch(_){}
              }
            } catch (e) {
              console.error('Erro ao resolver telefone por nome:', e && e.message ? e.message : e);
            }
            return null;
          }

          const whenFmt = formatDateBR(ag.data_hora || '');
          const visitor = ag.nome || '';
          const assunto = ag.assunto || '';
          const normalize = (s) => String(s || '').replace(/\s+/g,' ').trim();
          const messageText = (personName) => `Olá ${normalize(personName)}, tudo bem?\n\n` +
                                `Informamos que ${normalize(visitor) || 'a pessoa'} passou pela portaria em ${whenFmt || ''} referente ao agendamento "${normalize(assunto) || ''}".\n\n` +
                                `Atenciosamente,\nEquipe Portaria`;
          const recipients = new Map(); 
          let respPhone = null;
          if (ag.telefone && String(ag.telefone).trim()) respPhone = String(ag.telefone).replace(/\D+/g, '');
          if (!respPhone && ag.responsavel) respPhone = await resolvePhoneByName(ag.responsavel);
          if (respPhone) recipients.set(respPhone, ag.responsavel || null);
          
          for (const [phone, dispName] of recipients.entries()) {
            try {
              const tipoMsg = 'AGENDAMENTO_CONCLUIDO';
              const notifText = messageText(dispName || '');
              const reqNotif = poolDw.request();
              reqNotif.input('tipo', sql.VarChar(100), tipoMsg);
              reqNotif.input('dest', sql.VarChar(500), phone ? String(phone) : null);
              reqNotif.input('mensagem', sql.VarChar(2000), notifText);
              reqNotif.input('template', sql.VarChar(200), null);
              reqNotif.input('params', sql.VarChar(2000), null);
              reqNotif.input('status', sql.VarChar(50), 'PENDENTE');
              reqNotif.input('metadados', sql.VarChar(4000), JSON.stringify({ agendamento_id: ag.id, concluido_por: marcadoPor }));
              const insertNotif = `INSERT INTO [dw].[dbo].[FATO_FILA_NOTIFICACOES_DEV] (TIPO_MENSAGEM, DESTINATARIO, MENSAGEM, TEMPLATE_NAME, TEMPLATE_PARAMS, STATUS, TENTATIVAS, ERRO, DTINC, DTENVIO, MESSAGE_ID, METADADOS)
                                   VALUES (@tipo, @dest, @mensagem, @template, @params, @status, 0, NULL, GETDATE(), NULL, NULL, @metadados)`;
              await reqNotif.query(insertNotif);
            } catch (e) {
              console.error('Erro ao enfileirar notificacao de conclusao para', phone, e && e.message ? e.message : e);
            }
          }
        }
      } finally {
        try { await poolDw.close(); } catch(_){}
      }
    } catch (e) {
      console.error('Erro ao buscar agendamento pós-update para notificar:', e && e.message ? e.message : e);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar status do agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar status' });
  }
});

app.get('/agendamentos', ensureAuth, async (req, res) => {
  const agendamentoModel = require('./models/agendamentoModel');
  const userModel = require('./models/userModel');
  let agendamentos = [];
  let users = [];
  try {
    users = await userModel.getAll();
    if (Array.isArray(users) && users.length) console.log('Sample user:', users[0]);
  } catch (err) {
    console.error('Erro ao buscar usuários via model:', err && err.message ? err.message : err);
  }

  try {
    agendamentos = await agendamentoModel.getAll();
  } catch (err) {
    console.error('Erro ao buscar agendamentos via model:', err && err.message ? err.message : err);
  }

  res.render('agendamento', {
    agendamentos,
    users,
    user: {
      nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário',
      email: req.session.user_email || req.cookies && req.cookies.user_email || '',
      id: req.session.user_id || req.session.userID || null
    }
  });
});

app.get('/listagem/cargas-portaria', ensureAuth, async (req, res) => {
  try {
    const startParam = typeof req.query.start_date === 'string' && req.query.start_date.trim() ? req.query.start_date.trim() : null;
    const endParam = typeof req.query.end_date === 'string' && req.query.end_date.trim() ? req.query.end_date.trim() : null;

    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      if (!startParam && !endParam) {
        const qAll = `SELECT id, filial, carga, dt_entrega, placa, tipo_entrega, motorista, peso, status, telefone, cpf_cnpj, criado_por, dt_criacao
                      FROM [dw].[dbo].[CARGAS_PORTARIA]
                      ORDER BY dt_criacao DESC`;
        const rAll = await pool.request().query(qAll);
        const cargasAll = (rAll && rAll.recordset) ? rAll.recordset : [];
        return res.render('cargas_portaria_list', { cargas: cargasAll, startDate: null, endDate: null, user: { nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário', email: req.session.user_email || req.cookies && req.cookies.user_email || '', id: req.session.user_id || req.session.userID || null } });
      }

      let startDate = null;
      let endDate = null;
      try {
        if (startParam) {
          const s = new Date(startParam);
          if (!isNaN(s)) startDate = s;
        }
        if (endParam) {
          const e = new Date(endParam);
          if (!isNaN(e)) endDate = e;
        }
      } catch(_){ }
      if (startDate && !endDate) endDate = startDate;
      if (!startDate && endDate) startDate = endDate;
      if (!startDate || !endDate) {
        const qAll = `SELECT id, filial, carga, dt_entrega, placa, tipo_entrega, motorista, peso, status, telefone, cpf_cnpj, criado_por, dt_criacao
                      FROM [dw].[dbo].[CARGAS_PORTARIA]
                      ORDER BY dt_criacao DESC`;
        const rAll = await pool.request().query(qAll);
        const cargasAll = (rAll && rAll.recordset) ? rAll.recordset : [];
        return res.render('cargas_portaria_list', { cargas: cargasAll, startDate: null, endDate: null, user: { nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário', email: req.session.user_email || req.cookies && req.cookies.user_email || '', id: req.session.user_id || req.session.userID || null } });
      }

      const q = `SELECT id, filial, carga, dt_entrega, placa, tipo_entrega, motorista, peso, status, telefone, cpf_cnpj, criado_por, dt_criacao
                 FROM [dw].[dbo].[CARGAS_PORTARIA]
                 WHERE CONVERT(date, dt_criacao) BETWEEN @start AND @end
                 ORDER BY dt_criacao DESC`;
      const reqDb = pool.request();
      reqDb.input('start', sql.Date, new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate()));
      reqDb.input('end', sql.Date, new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()));
      const r = await reqDb.query(q);
      const cargas = (r && r.recordset) ? r.recordset : [];
      return res.render('cargas_portaria_list', { cargas, startDate: startDate.toISOString().slice(0,10), endDate: endDate.toISOString().slice(0,10), user: { nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário', email: req.session.user_email || req.cookies && req.cookies.user_email || '', id: req.session.user_id || req.session.userID || null } });
    } finally {
      try { await pool.close(); } catch(_){ }
    }
  } catch (err) {
    console.error('Erro ao buscar CARGAS_PORTARIA:', err && err.message ? err.message : err);
    return res.render('cargas_portaria_list', { cargas: [], startDate: null, endDate: null, user: { nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário', email: req.session.user_email || req.cookies && req.cookies.user_email || '', id: req.session.user_id || req.session.userID || null } });
  }
});

app.get('/cargas-portaria', ensureAuth, async (req, res) => {
  try {
    const pool = await new sql.ConnectionPool(dbDw).connect();
    try {
      const q = `SELECT FILIAL, CARGA, DT_ENTREG, PLACA, TIPO_ENTREGA, MOTORISTA, PESO
                 FROM [dw].[dbo].[V_CARGAS]
                 WHERE CONVERT(date, DT_ENTREG) = CONVERT(date, GETDATE())
                 ORDER BY DT_ENTREG DESC`;
      const r = await pool.request().query(q);
      const cargas = (r && r.recordset) ? r.recordset : [];
      const q2 = `SELECT filial, carga, placa, CONVERT(date, dt_entrega) AS dt_entrega_date FROM [dw].[dbo].[CARGAS_PORTARIA] WHERE CONVERT(date, dt_entrega) = CONVERT(date, GETDATE())`;
      const r2 = await pool.request().query(q2);
      const existing = (r2 && r2.recordset) ? r2.recordset : [];
      const existingSet = new Set();
      existing.forEach(function(it){
        try {
          const key = (String(it.filial||'') + '||' + String(it.carga||'') + '||' + String(it.placa||'')).toLowerCase();
          existingSet.add(key);
        } catch(_){}
      });

      let concluidosCount = 0;
      const pending = [];
      cargas.forEach(function(c){
        try {
          const key = (String(c.FILIAL||'') + '||' + String(c.CARGA||'') + '||' + String(c.PLACA||'')).toLowerCase();
          if (existingSet.has(key)) {
            concluidosCount++;
          } else {
            pending.push(c);
          }
        } catch(_){ pending.push(c); }
      });
      function formatDtEntregaForDisplay(raw) {
        try {
          if (!raw) return raw;
          const d = new Date(raw);
          if (isNaN(d)) return raw;
          return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' });
        } catch (e) { return raw; }
      }
      pending.forEach(function(it){ try { if (it.DT_ENTREG) { it.DT_ENTREG_RAW = it.DT_ENTREG; it.DT_ENTREG = formatDtEntregaForDisplay(it.DT_ENTREG); } } catch(_){} });
      return res.render('cargas_portaria', { cargas: pending, concluidos: concluidosCount, user: { nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário', email: req.session.user_email || req.cookies && req.cookies.user_email || '', id: req.session.user_id || req.session.userID || null } });
    } finally {
      try { await pool.close(); } catch(_){ }
    }
  } catch (err) {
    console.error('Erro ao buscar cargas para portaria:', err && err.message ? err.message : err);
    return res.render('cargas_portaria', { cargas: [], user: { nome: req.session.user_name || req.session.username || req.cookies && req.cookies.username || 'Usuário', email: req.session.user_email || req.cookies && req.cookies.user_email || '', id: req.session.user_id || req.session.userID || null } });
  }
});

app.post('/cargas-portaria/concluir', ensureAuth, express.json(), async (req, res) => {
  try {
    const body = req.body || {};
    const filial = body.filial || null;
    const carga = body.carga || null;
    const dt_entrega_raw = body.dt_entrega || null;
    const placa = body.placa || null;
    const tipo_entrega = body.tipo_entrega || null;
    const motorista = body.motorista || null;
    const pesoRaw = body.peso || null;
    const criado_por = (req && req.session && (req.session.user_name || req.session.username)) ? (req.session.user_name || req.session.username) : (req && req.cookies && req.cookies.username) ? req.cookies.username : null;

    let dt_entrega_val = null;
    try { if (dt_entrega_raw) { const d = new Date(String(dt_entrega_raw)); if (!isNaN(d)) dt_entrega_val = d; } } catch(_){ }
    let pesoVal = null;
    try { if (pesoRaw !== null && pesoRaw !== undefined && pesoRaw !== '') { pesoVal = parseFloat(String(pesoRaw).replace(',', '.')); if (isNaN(pesoVal)) pesoVal = null; } } catch(_){ }
    const poolDw = await new sql.ConnectionPool(dbDw).connect();
    try {
      let cpf_cnpj_val = null;
      let telefone_val = null;
      try {
        if (motorista) {
          const motoristaParam = String(motorista).trim();
          const motoristaLike = '%' + motoristaParam + '%';
          const rM = await poolDw.request()
            .input('motorista', sql.VarChar(200), motoristaParam)
            .input('motoristaLike', sql.VarChar(200), motoristaLike)
            .query(`SELECT TOP 1 CPF_CNPJ, WHATSAPP FROM [dw].[dbo].[DIM_MOTORISTAS]
                    WHERE LTRIM(RTRIM(NOME)) = @motorista OR COD_MOTORISTA = @motorista OR LTRIM(RTRIM(NOME)) LIKE @motoristaLike`);
          if (rM && rM.recordset && rM.recordset.length) {
            cpf_cnpj_val = rM.recordset[0].CPF_CNPJ || null;
            telefone_val = rM.recordset[0].WHATSAPP || null;
          }
        }
      } catch (e) { console.warn('Não foi possível obter dados em DIM_MOTORISTAS:', e && e.message ? e.message : e); }

      const reqI = poolDw.request();
      reqI.input('filial', sql.VarChar(50), filial);
      reqI.input('carga', sql.VarChar(200), carga);
      if (dt_entrega_val) reqI.input('dt_entrega', sql.DateTime2, dt_entrega_val); else reqI.input('dt_entrega', sql.DateTime2, null);
      reqI.input('placa', sql.VarChar(50), placa);
      reqI.input('tipo_entrega', sql.VarChar(200), tipo_entrega);
      reqI.input('motorista', sql.VarChar(200), motorista);
      if (pesoVal !== null) reqI.input('peso', sql.Decimal(18,3), pesoVal); else reqI.input('peso', sql.Decimal(18,3), null);
      reqI.input('status', sql.VarChar(50), 'Concluída');
      reqI.input('telefone', sql.VarChar(50), telefone_val ? String(telefone_val).replace(/\D+/g,'') : null);
      reqI.input('cpf_cnpj', sql.VarChar(50), cpf_cnpj_val ? String(cpf_cnpj_val).replace(/\D+/g,'') : null);
      reqI.input('criado_por', sql.VarChar(200), criado_por);
      const insertQ = `INSERT INTO [dw].[dbo].[CARGAS_PORTARIA] (filial,carga,dt_entrega,placa,tipo_entrega,motorista,peso,status,telefone,cpf_cnpj,criado_por,dt_criacao)
                       VALUES (@filial,@carga,@dt_entrega,@placa,@tipo_entrega,@motorista,@peso,@status,@telefone,@cpf_cnpj,@criado_por,GETDATE())`;
      await reqI.query(insertQ);
      return res.json({ success: true });
    } finally {
      try { await poolDw.close(); } catch(_){ }
    }
  } catch (err) {
    console.error('Erro ao registrar carga na CARGAS_PORTARIA:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao registrar carga' });
  }
});

app.get('/api/responsaveis', ensureAuth, async (req, res) => {
  const userModel = require('./models/userModel');
  try {
    const responsaveis = await userModel.getAll();
    return res.json({ success: true, data: responsaveis });
  } catch (err) {
    console.error('Erro ao obter responsaveis via API:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao obter responsaveis' });
  }
});

app.get('/api/responsavel/:mat', ensureAuth, async (req, res) => {
  const matParam = String(req.params.mat || '').trim();
  try {
    const pool = await new sql.ConnectionPool(dbProtheus).connect();
    try {
      const q = `SELECT RA_MAT, RA_NOME, RA_DDDCELU, RA_NUMCELU, RA_TELEFON FROM SRA010 WHERE LTRIM(RTRIM(RA_MAT)) = @mat`;
      const r = await pool.request().input('mat', sql.VarChar, matParam).query(q);
      return res.json({ success: true, data: r.recordset || [] });
    } finally {
      try { await pool.close(); } catch(_){}
    }
  } catch (err) {
    console.error('Erro ao consultar responsavel por mat:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao consultar responsavel' });
  }
});

app.post('/webhook/agendamento/confirm', express.json(), async (req, res) => {
  try {
    const { token, confirmed, tarefa_id, agendamento } = req.body || {};
    if (!process.env.GESTAO_WEBHOOK_TOKEN || token !== process.env.GESTAO_WEBHOOK_TOKEN) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }

    if (confirmed) {
      if (!agendamento) return res.status(400).json({ success: false, message: 'Dados do agendamento ausentes' });
      const agendamentoModel = require('./models/agendamentoModel');
      try {
        let payloadToInsert = agendamento;
        if (agendamento && typeof agendamento === 'object' && agendamento.agendamento) {
          payloadToInsert = agendamento.agendamento;
          if (agendamento.createdBy && !payloadToInsert.createdBy) payloadToInsert.createdBy = agendamento.createdBy;
        }
        await agendamentoModel.insert(payloadToInsert);
        return res.json({ success: true, created: true });
      } catch (err) {
        console.error('Erro ao inserir agendamento via webhook:', err && err.message ? err.message : err);
        return res.status(500).json({ success: false, message: 'Erro interno ao criar agendamento', error: err && err.message ? err.message : String(err) });
      }
    } else {
      return res.json({ success: true, created: false });
    }
  } catch (err) {
    console.error('Erro no webhook de agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

app.post('/agendamentos', ensureAuth, express.json(), async (req, res) => {
  try {
    const payload = req.body;
    if (payload && payload.data_hora) {
      let dt = String(payload.data_hora || '').trim();
      if (dt.includes('T')) dt = dt.replace('T', ' ');
      if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(dt)) dt = dt + ':00';
      payload.data_hora = dt;
    }

    const agendamentoModel = require('./models/agendamentoModel');
    try {
      let responsavelName = null;
      let responsavelId = null;
      if (payload && payload.responsavel) {
        if (typeof payload.responsavel === 'object') {
          responsavelName = payload.responsavel.raNome || payload.responsavel.nome || null;
          responsavelId = payload.responsavel.id || payload.responsavel.RA_MAT || null;
        } else if (typeof payload.responsavel === 'string') {
          responsavelName = payload.responsavel;
        }
      }
      const createdBy = (req && req.session && (req.session.user_name || req.session.username))
        ? (req.session.user_name || req.session.username)
        : (req && req.cookies && req.cookies.username)
          ? req.cookies.username
          : (payload && (payload.criado_por || payload.createdBy))
            ? (payload.criado_por || payload.createdBy)
            : (payload && payload.nome) ? payload.nome : null;
      let createdByFinal = createdBy;
      try {
        if (req && req.session && req.session.userID) {
          try {
            const poolP = await new sql.ConnectionPool(dbProtheus).connect();
            try {
              const q = `SELECT RA_NOME FROM SRA010 WHERE LTRIM(RTRIM(RA_MAT)) = @mat OR RA_MAT = RIGHT('000000' + @mat,6)`;
              const r = await poolP.request().input('mat', sql.VarChar, String(req.session.userID)).query(q);
              const userRec = (r.recordset && r.recordset[0]) ? r.recordset[0] : null;
              if (userRec && userRec.RA_NOME) createdByFinal = String(userRec.RA_NOME).trim() || createdByFinal;
            } finally {
              try { await poolP.close(); } catch(_){ }
            }
          } catch (e) {
            console.error('Erro ao buscar nome do usuário no Protheus para criado_por:', e && e.message ? e.message : e);
          }
        }
      } catch (e) {
        console.error('Erro ao resolver createdByFinal:', e && e.message ? e.message : e);
      }
      const toInsert = {
        tipo: payload.tipo,
        tipo_outro: payload.tipo_outro,
        data_hora: payload.data_hora,
        assunto: payload.assunto,
        nome: payload.nome,
        responsavel: payload.responsavel_name || responsavelName || null,
        observacoes: payload.observacoes,
        status: payload.status,
        criado_por: createdByFinal
      };

      try {
        if (payload && payload.tipo_outro && String(payload.tipo_outro).trim()) {
          toInsert.tipo = String(payload.tipo_outro).trim();
        } else if (payload && String(payload.tipo || '').toLowerCase() === 'outro' && payload.tipo_outro && String(payload.tipo_outro).trim()) {
          toInsert.tipo = String(payload.tipo_outro).trim();
        }
        if (Object.prototype.hasOwnProperty.call(toInsert, 'tipo_outro')) delete toInsert.tipo_outro;
      } catch (e) {}
      
      try {
        if (payload && payload.responsavel && typeof payload.responsavel === 'object' && payload.responsavel.raNumCelu) {
        }
      } catch (e) {}

      const euSouResponsavel = !!payload.eu_sou_o_responsavel;
      if (euSouResponsavel) {
        let foundUser = null;
        try {
          const searchName = (createdByFinal || toInsert.nome || '').replace(/[\.\_\-\@]/g, ' ').trim();
          if (searchName) {
            const tokens = searchName.split(/\s+/).map(t => t.trim()).filter(t => t && t.length >= 2);
            if (tokens.length) {
              const poolP = await new sql.ConnectionPool(dbProtheus).connect();
              try {
                const whereParts = tokens.map((t, i) => `RA_NOME COLLATE Latin1_General_CI_AI LIKE @tok${i}`);
                const q = `SELECT TOP 1 RA_MAT, RA_NOME, RA_DDDCELU, RA_NUMCELU, RA_TELEFON FROM SRA010 WHERE ${whereParts.join(' AND ')}`;
                const reqP = poolP.request();
                tokens.forEach((t, i) => reqP.input(`tok${i}`, sql.VarChar, `%${t}%`));
                const r = await reqP.query(q);
                foundUser = (r && r.recordset && r.recordset[0]) ? r.recordset[0] : null;
              } finally {
                try { await poolP.close(); } catch(_){ }
              }
            }
          }
        } catch (e) {
          console.error('Erro ao buscar usuário Protheus por nome (eu_sou_o_responsavel):', e && e.message ? e.message : e);
        }

        if (foundUser) {
          toInsert.responsavel = (foundUser.RA_NOME || createdByFinal || toInsert.nome || null);
        } else {
          toInsert.responsavel = createdByFinal || (toInsert.nome || null);
        }
      }

      if (euSouResponsavel) {
        try {
          const agendamentoModel = require('./models/agendamentoModel');
          await agendamentoModel.insert(toInsert);
          return res.json({ success: true, created: true, message: 'Agendamento criado sem notificação' });
        } catch (insertErr) {
          console.error('Erro ao inserir agendamento diretamente (eu_sou_o_responsavel):', insertErr && insertErr.message ? insertErr.message : insertErr);
          return res.status(500).json({ success: false, message: 'Erro ao criar agendamento' });
        }
      }

      if (responsavelId) {
        try {
          const poolP = await new sql.ConnectionPool(dbProtheus).connect();
          try {
            const q = `SELECT RA_MAT, RA_NOME, RA_DDDCELU, RA_NUMCELU, RA_TELEFON FROM SRA010 WHERE LTRIM(RTRIM(RA_MAT)) = @mat OR RA_MAT = RIGHT('000000' + @mat,6)`;
            const r = await poolP.request().input('mat', sql.VarChar, String(responsavelId)).query(q);
            const userRec = (r.recordset && r.recordset[0]) ? r.recordset[0] : null;
            if (userRec) {
            }
          } finally {
            try { await poolP.close(); } catch(_){}
          }
        } catch (e) {
          console.error('Erro ao buscar telefone do responsavel antes de inserir:', e && e.message ? e.message : e);
        }
      }

      try {
        if (payload.eu_sou_o_responsavel) {
        } else {
        const sql = require('mssql');
        const poolDw = await new sql.ConnectionPool(dbDw).connect();
        try {
          let destinatario = null;
          let responsavelNomeFinal = toInsert.responsavel || responsavelName || null;
          if (toInsert.telefone) {
            destinatario = String(toInsert.telefone).replace(/\D+/g, '');
            if (destinatario === '') destinatario = null;
          }
          if (!destinatario && responsavelId) {
            try {
              const poolP = await new sql.ConnectionPool(dbProtheus).connect();
              try {
                const q = `SELECT RA_MAT, RA_NOME, RA_DDDCELU, RA_NUMCELU, RA_TELEFON FROM SRA010 WHERE LTRIM(RTRIM(RA_MAT)) = @mat OR RA_MAT = RIGHT('000000' + @mat,6)`;
                const r = await poolP.request().input('mat', sql.VarChar, String(responsavelId)).query(q);
                const userRec = (r.recordset && r.recordset[0]) ? r.recordset[0] : null;
                if (userRec) {
                  responsavelNomeFinal = (userRec.RA_NOME || responsavelNomeFinal || '').toString().trim();
                  const ddd = (userRec.RA_DDDCELU || '').toString().trim();
                  const num = (userRec.RA_NUMCELU || '').toString().trim() || (userRec.RA_TELEFON || '').toString().trim();
                  if (ddd && num) destinatario = (ddd + num).replace(/\D+/g, '');
                }
              } finally {
                try { await poolP.close(); } catch(_){}
              }
            } catch (e) {
              console.error('Erro ao buscar telefone do responsavel em Protheus:', e && e.message ? e.message : e);
            }
          }

          if (!destinatario) destinatario = responsavelId || responsavelName || toInsert.responsavel || null;
          const tipoMsg = 'AGENDAMENTO';
          const userRequester = createdByFinal || (toInsert.nome || 'Usuário');
          const visitorName = toInsert.nome || '';
          function formatDateBR(dt) {
            try {
              if (!dt) return '';
              const s = String(dt).trim();
              const m = s.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
              if (m) {
                const yyyy = m[1];
                const mm = m[2];
                const dd = m[3];
                const hh = m[4];
                const min = m[5];
                return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
              }
              const iso = s.includes('T') ? s : s.replace(' ', 'T');
              const parsed = new Date(iso);
              if (!isNaN(parsed)) {
                const dd = String(parsed.getDate()).padStart(2, '0');
                const mm = String(parsed.getMonth() + 1).padStart(2, '0');
                const yyyy = parsed.getFullYear();
                const hh = String(parsed.getHours()).padStart(2, '0');
                const min = String(parsed.getMinutes()).padStart(2, '0');
                return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
              }
              return s;
            } catch (e) { return String(dt); }
          }

          const dataHoraFmt = formatDateBR(toInsert.data_hora || '');
          const observTxt = toInsert.observacoes ? `\nObservações: ${toInsert.observacoes}` : '';
          const mensagemText = `Olá ${responsavelNomeFinal || ''}, tudo bem?\n\n` +
                               `Você foi designado(a) como responsável pelo agendamento "${toInsert.assunto || ''}" marcado para ${dataHoraFmt || toInsert.data_hora || ''}.\n\n` +
                               `Solicitante: ${userRequester || ''}\n` +
                               `Quem irá: ${visitorName || '—'}` +
                               `${observTxt}\n\n` +
                               `Por confirmar, digite *sim* ou *não* quando puder. Obrigado!`;
          const templateName = null;
          const templateParams = null;
          const statusMsg = 'PENDENTE';
          const metadata = JSON.stringify({ agendamento: toInsert, createdBy: userRequester });
          const reqNotif = poolDw.request();
          reqNotif.input('tipo', sql.VarChar(100), tipoMsg);
          reqNotif.input('dest', sql.VarChar(500), destinatario ? String(destinatario) : null);
          reqNotif.input('mensagem', sql.VarChar(2000), mensagemText);
          reqNotif.input('template', sql.VarChar(200), templateName);
          reqNotif.input('params', sql.VarChar(2000), templateParams);
          reqNotif.input('status', sql.VarChar(50), statusMsg);
          reqNotif.input('metadados', sql.VarChar(4000), metadata);

          const insertNotif = `INSERT INTO [dw].[dbo].[FATO_FILA_NOTIFICACOES_DEV] (TIPO_MENSAGEM, DESTINATARIO, MENSAGEM, TEMPLATE_NAME, TEMPLATE_PARAMS, STATUS, TENTATIVAS, ERRO, DTINC, DTENVIO, MESSAGE_ID, METADADOS)
                               VALUES (@tipo, @dest, @mensagem, @template, @params, @status, 0, NULL, GETDATE(), NULL, NULL, @metadados)`;
          await reqNotif.query(insertNotif);
        } finally {
          try { await poolDw.close(); } catch(_){ }
        }
        }
      } catch (notifErr) {
        console.error('Erro ao enfileirar notificacao:', notifErr && notifErr.message ? notifErr.message : notifErr);
      }
      return res.json({ success: true });
    } catch (err) {
      console.error('Erro ao inserir agendamento via model:', err && err.message ? err.message : err);
      return res.status(500).json({ success: false, message: 'Erro ao salvar no banco' });
    }
  } catch (err) {
    console.error('Erro ao salvar agendamento:', err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
