'use strict';

const path        = require('path');
const fs          = require('fs');
const express     = require('express');
const compression = require('compression');
const session     = require('express-session');
const cookieParser = require('cookie-parser');
const crypto      = require('crypto');
require('dotenv').config();
const loginController = require('./controllers/loginController');
const app  = express();
const PORT = process.env.PORT;
app.use(compression());
const { Agendamento, HorarioAgendamento, VCarga, DimCliente } = require('./models/orm');
const agendamentoModel    = require('./models/agendamentoModel');
const horariosRetiraModel = require('./models/horariosRetiraModel');
const conferenciaModel    = require('./models/conferenciaModel');
const userModel           = require('./models/userModel');
const cargaPortariaModel  = require('./models/cargaPortariaModel');
const notificacaoModel    = require('./models/notificacaoModel');
const fatoPedidoModel     = require('./models/fatoPedidoModel');
const multer    = require('multer');
const uploadDir = path.join(__dirname, 'uploads');
try { if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true }); } catch (e) {}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename:    (req, file, cb) => {
    const safe = Date.now() + '_' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, safe);
  },
});
const upload = multer({ storage });
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
const { swaggerUi, swaggerDocument } = require('./swagger');
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(cookieParser());
app.use((req, res, next) => {
  try {
    if (req.query && (req.query.sso_token || req.query.sso_refresh)) {
      if (req.query.sso_token) {
        res.cookie('token', req.query.sso_token, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 3600000 });
        if (req.query.sso_username) {
          res.cookie('username', req.query.sso_username, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 43200000 });
        }
      }
      if (req.query.sso_refresh) {
        res.cookie('refresh_token', req.query.sso_refresh, { httpOnly: true, secure: false, sameSite: 'lax', maxAge: 43200000 });
      }
      const clean = req.originalUrl.replace(/(\?|&)(sso_token|sso_refresh|sso_username)=[^&]*/g, '').replace(/[?&]$/, '');
      return res.redirect(clean || '/');
    }
  } catch (e) {}
  return next();
});
app.use('/css',    express.static(path.join(__dirname, '..', 'PortalConsultasCini', 'public', 'css')));
app.use('/js',     express.static(path.join(__dirname, '..', 'PortalConsultasCini', 'public', 'js')));
app.use('/images', express.static(path.join(__dirname, '..', 'PortalConsultasCini', 'public', 'images')));
app.use(session({
  secret:            process.env.SESSION_SECRET || 'change_this_secret',
  resave:            false,
  saveUninitialized: false,
  cookie:            { maxAge: 24 * 60 * 60 * 1000 },
}));

app.use((req, res, next) => {
  res.locals.currentPath = req.path || '/';
  res.locals.user = {
    nome:  req.session.user_name  || req.session.username  || (req.cookies && req.cookies.username)  || 'Usuário',
    email: req.session.user_email || (req.cookies && req.cookies.user_email) || '',
    id:    req.session.user_id    || req.session.userID    || null,
  };
  next();
});

function md5(value) {
  return crypto.createHash('md5').update(value).digest('hex');
}

const fallbackUsers = [
  { id: 1, name: 'Admin', email: 'admin@sistema.com', password: md5('admin123'), role: 'admin', active: 1 },
  { id: 2, name: 'João',  email: 'joao@empresa.com',  password: md5('123456'),   role: 'user',  active: 1 },
];

function getSessionUser(req) {
  return {
    nome:  req.session.user_name  || req.session.username  || (req.cookies && req.cookies.username)  || 'Usuário',
    email: req.session.user_email || (req.cookies && req.cookies.user_email) || '',
    id:    req.session.user_id    || req.session.userID    || null,
  };
}

function parseLocalDateString(s) {
  if (!s) return null;
  try {
    const str = String(s).trim();
    const m   = str.match(/(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) {
      return new Date(
        parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10),
        parseInt(m[4], 10), parseInt(m[5], 10), m[6] ? parseInt(m[6], 10) : 0
      );
    }
    const dt = new Date(str);
    return isNaN(dt) ? null : dt;
  } catch (e) { return null; }
}

function parseLocalDateTimeString(s) {
  try {
    if (!s) return null;
    const parts       = String(s).trim().split(' ');
    const datePart    = parts[0] || '';
    const timePart    = (parts[1] || '00:00:00').split(':');
    const dateSegments = datePart.split('-');
    const y  = parseInt(dateSegments[0], 10) || 0;
    const mo = parseInt(dateSegments[1], 10) || 1;
    const d  = parseInt(dateSegments[2], 10) || 1;
    const hh = parseInt(timePart[0] || '0', 10) || 0;
    const mm = parseInt(timePart[1] || '0', 10) || 0;
    const ss = parseInt(timePart[2] || '0', 10) || 0;
    return new Date(y, mo - 1, d, hh, mm, ss);
  } catch (e) { return new Date(s); }
}

function formatIsoDate(dt) {
  try {
    const d   = new Date(dt);
    const y   = d.getFullYear();
    const m   = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh  = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    const sec = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${min}:${sec}`;
  } catch (e) { return String(dt); }
}

function formatDateBR(dt) {
  try {
    if (!dt) return '';
    const s = String(dt).trim();
    const m = s.match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}, ${m[4]}:${m[5]}`;
    const iso    = s.includes('T') ? s : s.replace(' ', 'T');
    const parsed = new Date(iso);
    if (!isNaN(parsed)) {
      const dd   = String(parsed.getDate()).padStart(2, '0');
      const mm   = String(parsed.getMonth() + 1).padStart(2, '0');
      const yyyy = parsed.getFullYear();
      const hh   = String(parsed.getHours()).padStart(2, '0');
      const min  = String(parsed.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy}, ${hh}:${min}`;
    }
    return s;
  } catch (e) { return String(dt); }
}

async function ensureAuth(req, res, next) {
  return next();
}

app.get('/', (req, res) => {
  const hasSession = req.session && (req.session.user_id || req.session.userID);
  const hasCookies = req.cookies && (req.cookies.token || req.cookies.refresh_token);
  if (hasSession || hasCookies) return res.redirect('/dashboard');
  return res.redirect('/loginPage');
});

app.get('/loginPage', (req, res) => {
  const error = req.query.error || null;
  res.render('System/loginPage', { error, req });
});

app.post('/login', async (req, res) => {
  const username = (req.body.username || req.body.user || req.body.email || '').trim();
  const password = req.body.password || '';
  if (!username || !password) return res.status(400).json({ message: 'Preencha todos os campos' });
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
    if (req.session) req.session.destroy(() => {});
  } catch (e) {}
  return res.redirect('/loginPage?logout=true');
});

app.get('/dashboard', ensureAuth, async (req, res) => {
  let agendamentosHoje     = [];
  let total_agendamentos   = 0;
  let count_visita         = 0;
  let count_prest_servicos = 0;
  let agendamentosAtrasados = [];
  try {
    agendamentosHoje       = await agendamentoModel.getToday();
    total_agendamentos     = agendamentosHoje.length;
    count_visita           = agendamentosHoje.filter(a => (a.tipo || '').toLowerCase() === 'visita').length;
    count_prest_servicos   = agendamentosHoje.filter(a => {
      const t = (a.tipo || '').toLowerCase();
      return t === 'prestacao de servicos' || t === 'prestação de serviços' ||
             t === 'prestador de serviços' || t === 'prestadores de serviços';
    }).length;
    agendamentosAtrasados  = agendamentosHoje.filter(a => {
      const raw    = a.data_hora || '';
      const status = (a.status || '').toLowerCase();
      let d = null;
      try { d = new Date(typeof raw === 'string' ? raw.replace(' ', 'T') : raw); } catch (_) {}
      if (!d || isNaN(d)) return false;
      return d < new Date() && status === 'pendente';
    });
  } catch (e) {
    console.error('Erro ao buscar agendamentos do dia:', e && e.message ? e.message : e);
  }
  try {
    res.render('dashboard', {
      agendamentosHoje, total_agendamentos, count_visita,
      count_prest_servicos, agendamentosAtrasados, user: getSessionUser(req),
    });
  } catch (err) {
    console.error('Erro ao renderizar dashboard:', err);
    res.render('dashboard', {
      agendamentosHoje: [], total_agendamentos: 0, count_visita: 0,
      count_prest_servicos: 0, agendamentosAtrasados: [], user: getSessionUser(req),
    });
  }
});

app.get('/retiras', ensureAuth, async (req, res) => {
  let retirasHoje = [];
  try {
    const all        = await horariosRetiraModel.getAllReservations();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    retirasHoje = all.filter(r => {
      try {
        if ((r.status || '').toLowerCase().includes('concl')) return false;
        const dt = r.data ? new Date(r.data) : null;
        return dt && !isNaN(dt) && dt >= todayStart && dt <= todayEnd;
      } catch (_) { return false; }
    });
  } catch (_) {}
  return res.render('Retiras/retiras', { retirasHoje, user: getSessionUser(req) });
});

app.get('/retiras/data', ensureAuth, async (req, res) => {
  try {
    const all        = await horariosRetiraModel.getAllReservations();
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setHours(23, 59, 59, 999);
    const data = all.filter(r => {
      try {
        if ((r.status || '').toLowerCase().includes('concl')) return false;
        const dt = r.data ? new Date(r.data) : null;
        return dt && !isNaN(dt) && dt >= todayStart && dt <= todayEnd;
      } catch (_) { return false; }
    });
    return res.json({ success: true, data });
  } catch (e) {
    console.error('Erro retiras data:', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Erro ao buscar dados' });
  }
});

app.get('/conferencia', ensureAuth, async (req, res) => {
  let people = [];
  try { people = await conferenciaModel.getTopPeople(1000); } catch (_) {}
  return res.render('conferencia_list', { people, user: getSessionUser(req) });
});

app.get('/conferencia/search', ensureAuth, async (req, res) => {
  try {
    const q = (req.query.q || req.query.name || '').trim();
    if (!q) return res.json({ success: true, data: [] });
    const people = await conferenciaModel.searchPeopleByName(q, 5000);
    return res.json({ success: true, data: people });
  } catch (e) {
    console.error('Erro conferencia search:', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Erro ao buscar dados' });
  }
});

app.get('/conferencia/data', ensureAuth, async (req, res) => {
  try {
    return res.json({ success: true, data: await conferenciaModel.getTopPeople(1000) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Erro ao buscar dados' });
  }
});

app.post('/retiras/:id/update', ensureAuth, express.json(), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, message: 'id inválido' });
    const body      = req.body || {};
    const dtEntrada = parseLocalDateString(body.data_entrada);
    const dtSaida   = parseLocalDateString(body.data_saida);
    const updated   = await horariosRetiraModel.updateReservationDates(id, { data_entrada: dtEntrada, data_saida: dtSaida });
    return res.json({ success: true, reservation: updated });
  } catch (err) {
    console.error('Erro atualizar retira:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar reserva' });
  }
});

app.post('/agendamentos/:id/concluir', ensureAuth, express.json(), async (req, res) => {
  const id = req.params.id;
  if (!id) return res.status(400).json({ success: false, message: 'ID ausente' });
  try {
    const marcadoPor = getSessionUser(req).nome || null;
    const telefone   = req.body && req.body.telefone ? String(req.body.telefone).trim() : null;
    const cpf_cnpj   = req.body && req.body.cpf_cnpj ? String(req.body.cpf_cnpj).trim() : null;
    const dtCheg     = new Date();
    await agendamentoModel.updateStatus(id, 'Concluída', marcadoPor, telefone, cpf_cnpj, dtCheg);

    try {
      const ag = await agendamentoModel.getById(id);
      if (ag) {
        const whenFmt   = formatDateBR(ag.data_hora || '');
        const visitor   = ag.nome    || '';
        const assunto   = ag.assunto || '';
        const normalize = s => String(s || '').replace(/\s+/g, ' ').trim();
        const msgText   = personName =>
          `Olá ${normalize(personName)}, tudo bem?\n\n` +
          `Informamos que ${normalize(visitor) || 'a pessoa'} passou pela portaria em ` +
          `${whenFmt || ''} referente ao agendamento "${normalize(assunto) || ''}".\n\n` +
          `Atenciosamente,\nEquipe Portaria`;

        let respPhone = null;
        if (ag.telefone && String(ag.telefone).trim()) {
          respPhone = String(ag.telefone).replace(/\D+/g, '');
        }
        if (!respPhone && ag.responsavel) {
          respPhone = await userModel.resolvePhoneByName(ag.responsavel);
        }

        if (respPhone) {
          try {
            await notificacaoModel.enqueue({
              tipo:        'AGENDAMENTO_CONCLUIDO',
              destinatario: respPhone,
              mensagem:    msgText(ag.responsavel || ''),
              metadados:   JSON.stringify({ agendamento_id: ag.id, concluido_por: marcadoPor }),
            });
          } catch (e) {
            console.error('Erro ao enfileirar notificação de conclusão:', e && e.message ? e.message : e);
          }
        }
      }
    } catch (e) {
      console.error('Erro ao notificar após concluir agendamento:', e && e.message ? e.message : e);
    }

    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar status do agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao atualizar status' });
  }
});

app.get('/agendamentos', ensureAuth, async (req, res) => {
  let agendamentos = [];
  let users        = [];
  try { users = await userModel.getAll(); } catch (err) {
    console.error('Erro ao buscar usuários:', err && err.message ? err.message : err);
  }
  try { agendamentos = await agendamentoModel.getAll(); } catch (err) {
    console.error('Erro ao buscar agendamentos:', err && err.message ? err.message : err);
  }
  res.render('agendamento', { agendamentos, users, user: getSessionUser(req) });
});

app.get('/listagem/cargas-portaria', ensureAuth, async (req, res) => {
  try {
    const startParam = typeof req.query.start_date === 'string' && req.query.start_date.trim() ? req.query.start_date.trim() : null;
    const endParam   = typeof req.query.end_date   === 'string' && req.query.end_date.trim()   ? req.query.end_date.trim()   : null;

    let cargas = [];
    let startDateStr = null;
    let endDateStr   = null;

    if (startParam || endParam) {
      let startDate = startParam ? new Date(startParam) : null;
      let endDate   = endParam   ? new Date(endParam)   : null;
      if (startDate && isNaN(startDate)) startDate = null;
      if (endDate   && isNaN(endDate))   endDate   = null;
      if (startDate && !endDate)  endDate   = startDate;
      if (!startDate && endDate)  startDate = endDate;

      if (startDate && endDate) {
        cargas       = await cargaPortariaModel.getByDateRange(startDate, endDate);
        startDateStr = startDate.toISOString().slice(0, 10);
        endDateStr   = endDate.toISOString().slice(0, 10);
      } else {
        cargas = await cargaPortariaModel.getAll();
      }
    } else {
      cargas = await cargaPortariaModel.getAll();
    }

    return res.render('cargas_portaria_list', {
      cargas, startDate: startDateStr, endDate: endDateStr, user: getSessionUser(req),
    });
  } catch (err) {
    console.error('Erro ao buscar CARGAS_PORTARIA:', err && err.message ? err.message : err);
    return res.render('cargas_portaria_list', { cargas: [], startDate: null, endDate: null, user: getSessionUser(req) });
  }
});

app.get('/cadastro/cargas-portaria', ensureAuth, (req, res) => res.redirect('/listagem/cargas-portaria'));

app.get('/cargas-portaria', ensureAuth, async (req, res) => {
  try {
    const hoje   = new Date();
    const { Op } = require('sequelize');
    const start = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const end   = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59, 999);
    let cargasDw = [];
    try {
      const rows = await VCarga.findAll({
        where: {
          FILIAL:       '0101-Cini SJP',
          TIPO_ENTREGA: { [Op.in]: ['02-Rota', '01-AS'] },
        },
        order: [['DT_ENTREG', 'DESC']],
      });
      cargasDw = rows.filter(r => {
        try {
          const raw = r.get ? r.get('DT_ENTREG') : r.DT_ENTREG;
          if (!raw) return false;
          const d = new Date(raw);
          if (isNaN(d)) return false;
          return d >= start && d <= end;
        } catch (_) { return false; }
      });
    } catch (dwErr) {
      console.error('VCarga.findAll failed:', dwErr && dwErr.message ? dwErr.message : dwErr);
    }

    const registradas = await cargaPortariaModel.getTodayByDtEntrega();
    function normalizeKey(v) {
      try {
        return String(v || '').normalize('NFD').replace(/\p{Diacritic}/gu, '').replace(/\s+/g, ' ').trim().toLowerCase();
      } catch (_) { return String(v || '').trim().toLowerCase(); }
    }

    const existingSet = new Set();
    registradas.forEach(it => {
      existingSet.add(
        normalizeKey(it.filial) + '||' + normalizeKey(it.carga) + '||' + normalizeKey(it.placa)
      );
    });

    function formatDtEntrega(raw) {
      try {
        if (!raw) return raw;
        const d = new Date(raw);
        return isNaN(d) ? raw : d.toLocaleString('pt-BR', {
          day: '2-digit', month: '2-digit', year: 'numeric',
          hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo',
        });
      } catch (_) { return raw; }
    }

    let concluidosCount = 0;
    const pending = [];
    cargasDw.forEach(c => {
      try {
        const key = normalizeKey(c.FILIAL) + '||' + normalizeKey(c.CARGA) + '||' + normalizeKey(c.PLACA);
        if (existingSet.has(key)) {
          concluidosCount++;
        } else {
          const plain = c.get({ plain: true });
          if (plain.DT_ENTREG) {
            plain.DT_ENTREG_RAW = plain.DT_ENTREG;
            plain.DT_ENTREG     = formatDtEntrega(plain.DT_ENTREG);
          }
          pending.push(plain);
        }
      } catch (_) { pending.push(c.get({ plain: true })); }
    });

    return res.render('cargas_portaria', {
      cargas: pending, concluidos: concluidosCount, existing: registradas, user: getSessionUser(req),
    });
  } catch (err) {
    console.error('Erro ao buscar cargas para portaria:', err && err.message ? err.message : err);
    return res.render('cargas_portaria', { cargas: [], user: getSessionUser(req) });
  }
});

app.get('/cargas-portaria/find', ensureAuth, async (req, res) => {
  try {
    const placa  = typeof req.query.placa  === 'string' && req.query.placa.trim()  ? req.query.placa.trim()  : null;
    const carga  = typeof req.query.carga  === 'string' && req.query.carga.trim()  ? req.query.carga.trim()  : null;
    const filial = typeof req.query.filial === 'string' && req.query.filial.trim() ? req.query.filial.trim() : null;
    if (!placa && !carga && !filial) return res.json({ success: true, results: [] });
    const results = await cargaPortariaModel.search({ placa, carga, filial });
    return res.json({ success: true, results });
  } catch (err) {
    console.error('Erro na busca de CARGAS_PORTARIA:', err && err.message ? err.message : err);
    return res.json({ success: false, results: [] });
  }
});

app.get('/listagem/horarios-agendamento', ensureAuth, async (req, res) => {
  try {
    const agendamentos = await horariosRetiraModel.getAllReservations();
    return res.render('horarios_agendamento_list', { agendamentos, user: getSessionUser(req) });
  } catch (err) {
    console.error('Erro ao buscar HORARIOS_AGENDAMENTO:', err && err.message ? err.message : err);
    return res.render('horarios_agendamento_list', { agendamentos: [], user: getSessionUser(req) });
  }
});

app.get('/listagem/agendamento-portal', ensureAuth, async (req, res) => {
  try {
    const agendamentos = await agendamentoModel.getAll();
    return res.render('agendamento_portal_list', { agendamentos, user: getSessionUser(req) });
  } catch (err) {
    console.error('Erro ao buscar AGENDAMENTO_PORTAL:', err && err.message ? err.message : err);
    return res.render('agendamento_portal_list', { agendamentos: [], user: getSessionUser(req) });
  }
});

app.post('/horarios-agendamento/concluir', ensureAuth, express.json(), async (req, res) => {
  try {
    const id = req.body && req.body.id ? parseInt(req.body.id, 10) : null;
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    await horariosRetiraModel.conclude(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao concluir agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false });
  }
});

app.post('/horarios-agendamento/delete', ensureAuth, express.json(), async (req, res) => {
  try {
    const id = req.body && req.body.id ? parseInt(req.body.id, 10) : null;
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    await horariosRetiraModel.deleteById(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false });
  }
});

app.post('/agendamento-portal/delete', ensureAuth, express.json(), async (req, res) => {
  try {
    const id = req.body && req.body.id ? parseInt(req.body.id, 10) : null;
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    await agendamentoModel.deleteById(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir agendamento_portal:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false });
  }
});

app.post('/cargas-portaria/concluir', ensureAuth, express.json(), async (req, res) => {
  try {
    const body      = req.body || {};
    const criado_por = getSessionUser(req).nome || null;
    let dt_entrega   = null;
    try { if (body.dt_entrega) { const d = new Date(String(body.dt_entrega)); if (!isNaN(d)) dt_entrega = d; } } catch (_) {}

    await cargaPortariaModel.insert({
      filial:       body.filial        || null,
      carga:        body.carga         || null,
      dt_entrega,
      placa:        body.placa         || null,
      tipo_entrega: body.tipo_entrega  || null,
      motorista:    body.motorista     || null,
      peso:         body.peso          || null,
      criado_por,
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao registrar carga:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao registrar carga' });
  }
});

app.post('/cargas-portaria/delete', ensureAuth, express.json(), async (req, res) => {
  try {
    const id = req.body && req.body.id ? parseInt(req.body.id, 10) : null;
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    await cargaPortariaModel.deleteById(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir carga:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao excluir registro' });
  }
});

app.get('/api/responsaveis', ensureAuth, async (req, res) => {
  try {
    return res.json({ success: true, data: await userModel.getAll() });
  } catch (err) {
    console.error('Erro ao obter responsaveis:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao obter responsaveis' });
  }
});

app.get('/api/responsavel/:mat', ensureAuth, async (req, res) => {
  try {
    const mat  = String(req.params.mat || '').trim();
    const user = await userModel.getByMat(mat);
    return res.json({ success: true, data: user ? [user] : [] });
  } catch (err) {
    console.error('Erro ao consultar responsavel por mat:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao consultar responsavel' });
  }
});

app.post('/webhook/agendamento/confirm', express.json(), async (req, res) => {
  try {
    const { token, confirmed, agendamento } = req.body || {};
    if (!process.env.GESTAO_WEBHOOK_TOKEN || token !== process.env.GESTAO_WEBHOOK_TOKEN) {
      return res.status(401).json({ success: false, message: 'Token inválido' });
    }
    if (!confirmed) return res.json({ success: true, created: false });

    if (!agendamento) return res.status(400).json({ success: false, message: 'Dados do agendamento ausentes' });
    let payload = agendamento;
    if (agendamento && typeof agendamento === 'object' && agendamento.agendamento) {
      payload = agendamento.agendamento;
      if (agendamento.createdBy && !payload.createdBy) payload.createdBy = agendamento.createdBy;
    }
    await agendamentoModel.insert(payload);
    return res.json({ success: true, created: true });
  } catch (err) {
    console.error('Erro no webhook de agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro interno', error: err && err.message ? err.message : String(err) });
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

    let responsavelName = null;
    let responsavelId   = null;
    if (payload && payload.responsavel) {
      if (typeof payload.responsavel === 'object') {
        responsavelName = payload.responsavel.raNome || payload.responsavel.nome || null;
        responsavelId   = payload.responsavel.id     || payload.responsavel.RA_MAT || null;
      } else if (typeof payload.responsavel === 'string') {
        responsavelName = payload.responsavel;
      }
    }

    let createdByFinal = getSessionUser(req).nome || (payload && (payload.criado_por || payload.createdBy)) || null;
    try {
      if (req.session && req.session.userID) {
        const emp = await userModel.getByMat(String(req.session.userID));
        if (emp && emp.RA_NOME) createdByFinal = emp.RA_NOME || createdByFinal;
      }
    } catch (_) {}

    const toInsert = {
      tipo:        payload.tipo,
      data_hora:   payload.data_hora,
      assunto:     payload.assunto,
      nome:        payload.nome,
      responsavel: payload.responsavel_name || responsavelName || null,
      observacoes: payload.observacoes,
      status:      payload.status,
      criado_por:  createdByFinal,
    };

    try {
      if (payload && payload.tipo_outro && String(payload.tipo_outro).trim()) {
        toInsert.tipo = String(payload.tipo_outro).trim();
      }
    } catch (_) {}

    const euSouResponsavel = !!payload.eu_sou_o_responsavel;
    if (euSouResponsavel) {
      try {
        const searchName = (createdByFinal || toInsert.nome || '').replace(/[._\-@]/g, ' ').trim();
        if (searchName) {
          const tokens = searchName.split(/\s+/).filter(t => t && t.length >= 2);
          if (tokens.length) {
            const found = await userModel.findByNameTokens(tokens);
            toInsert.responsavel = (found && found.RA_NOME) ? found.RA_NOME : (createdByFinal || toInsert.nome || null);
          }
        }
      } catch (_) {}

      try {
        await agendamentoModel.insert(toInsert);
        return res.json({ success: true, created: true, message: 'Agendamento criado sem notificação' });
      } catch (insertErr) {
        console.error('Erro ao inserir agendamento (eu_sou_o_responsavel):', insertErr && insertErr.message ? insertErr.message : insertErr);
        return res.status(500).json({ success: false, message: 'Erro ao criar agendamento' });
      }
    }

    try {
      const result = await agendamentoModel.insert(toInsert);
      return res.json({ success: true, id: result });
    } catch (insertErr) {
      console.error('Erro ao inserir agendamento:', insertErr && insertErr.message ? insertErr.message : insertErr);
      return res.status(500).json({ success: false, message: 'Erro ao salvar agendamento no banco' });
    }
  } catch (err) {
    console.error('Erro ao salvar agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

app.post('/notificacoes', ensureAuth, express.json(), async (req, res) => {
  try {
    const { mensagem, responsavel, telefone, agendamentos_ids } = req.body || {};
    if (!mensagem || !responsavel) {
      return res.status(400).json({ success: false, message: 'Mensagem e responsável são obrigatórios' });
    }

    let destinatario = telefone ? String(telefone).replace(/\D+/g, '') : null;

    if (!destinatario) {
      try {
        let responsavelObj  = null;
        let responsavelNome = null;

        if (typeof responsavel === 'string') {
          responsavelNome = responsavel;
          try { responsavelObj = JSON.parse(responsavel); } catch (_) { responsavelObj = { raNome: responsavel }; }
        } else if (typeof responsavel === 'object') {
          responsavelObj  = responsavel;
          responsavelNome = responsavel.raNome || responsavel.nome || null;
        }

        if (responsavelObj && responsavelObj.raNumCelu) {
          destinatario = String(responsavelObj.raNumCelu).replace(/\D+/g, '');
        }

        if (!destinatario && responsavelObj && (responsavelObj.id || responsavelObj.RA_MAT)) {
          const mat = responsavelObj.id || responsavelObj.RA_MAT;
          const emp = await userModel.getByMat(String(mat));
          if (emp) destinatario = userModel.resolvePhone(emp) || null;
        }

        if (!destinatario && responsavelNome) {
          destinatario = await userModel.resolvePhoneByName(responsavelNome);
        }
      } catch (e) {
        console.error('Erro ao buscar telefone do responsável:', e && e.message ? e.message : e);
      }
    }

    if (!destinatario) destinatario = responsavel;

    let tipoMsg = 'ENTREVISTA';
    if (responsavel === 'Portaria' || String(responsavel || '').includes('Portaria')) {
      tipoMsg = 'AGENDAMENTO_CRIADO';
    }

    await notificacaoModel.enqueue({
      tipo:        tipoMsg,
      destinatario,
      mensagem:    String(mensagem || ''),
      metadados:   JSON.stringify({ agendamentos_ids: agendamentos_ids || [], responsavel }),
    });

    if (agendamentos_ids && Array.isArray(agendamentos_ids) && agendamentos_ids.length) {
      try {
        await agendamentoModel.markAsSent(agendamentos_ids);
      } catch (updateErr) {
        console.error('Erro ao marcar agendamentos como enviados:', updateErr && updateErr.message ? updateErr.message : updateErr);
      }
    }

    return res.json({ success: true, message: 'Notificação enfileirada com sucesso' });
  } catch (err) {
    console.error('Erro ao enfileirar notificação:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao enfileirar notificação' });
  }
});

app.post('/agendamentos/delete', ensureAuth, express.json(), async (req, res) => {
  try {
    const id = req.body && req.body.id ? parseInt(req.body.id, 10) : null;
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });
    await agendamentoModel.deleteById(id);
    return res.json({ success: true });
  } catch (err) {
    console.error('Erro ao excluir agendamento:', err && err.message ? err.message : err);
    return res.status(500).json({ success: false, message: 'Erro ao excluir agendamento' });
  }
});

app.get('/horarios-retira', ensureAuth, async (req, res) => {
  try {
    const dowMap    = ['DOM.', 'SEG.', 'TER.', 'QUA.', 'QUI.', 'SEX.', 'SÁB.'];
    const today     = new Date();
    let startDate   = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let endDate     = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + 6);
    let startIso    = null;
    let endIso      = null;

    const qStart = req.query && req.query.start ? String(req.query.start).trim() : null;
    const qEnd   = req.query && req.query.end   ? String(req.query.end).trim()   : null;

    if (qStart && qEnd) {
      const parsedStart = parseLocalDateTimeString(qStart + ' 00:00:00');
      const parsedEnd   = parseLocalDateTimeString(qEnd   + ' 23:59:59');
      if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedEnd >= parsedStart) {
        const diffDays = Math.round((parsedEnd - parsedStart) / 86400000) + 1;
        endDate    = diffDays > 31
          ? new Date(parsedStart.getFullYear(), parsedStart.getMonth(), parsedStart.getDate() + 30)
          : parsedEnd;
        startDate  = parsedStart;
        startIso   = qStart;
        endIso     = qEnd;
      }
    }

    const days = [];
    for (let d = new Date(startDate), i = 0; d <= endDate; d.setDate(d.getDate() + 1), i++) {
      const copy    = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const isoDate = copy.getFullYear() + '-' +
        String(copy.getMonth() + 1).padStart(2, '0') + '-' +
        String(copy.getDate()).padStart(2, '0');
      days.push({ label: dowMap[copy.getDay() || 0], isoDate });
    }

    const reservationsRaw = await horariosRetiraModel.getReservationsBetween(startDate, endDate);
    const reservations    = (reservationsRaw || []).map(r => Object.assign({}, r, { data: formatIsoDate(r.data) }));
    const reservationsMap = {};
    reservations.forEach(r => {
      if (!r || !r.data) return;
      if (!reservationsMap[r.data]) reservationsMap[r.data] = [];
      reservationsMap[r.data].push(r);
    });

    return res.render('HorariosRetira/horarios_retira', {
      days, reservations, reservationsMap,
      filterStart: startIso, filterEnd: endIso, user: getSessionUser(req),
    });
  } catch (e) {
    console.error('Erro ao renderizar horarios-retira:', e && e.message ? e.message : e);
    return res.render('HorariosRetira/horarios_retira', {
      days: [], reservations: [], reservationsMap: {},
      filterStart: null, filterEnd: null, user: getSessionUser(req),
    });
  }
});

app.post('/horarios-retira/data', ensureAuth, express.json(), async (req, res) => {
  try {
    const start = req.body && req.body.start ? String(req.body.start).trim() : null;
    const end   = req.body && req.body.end   ? String(req.body.end).trim()   : null;
    if (!start || !end) return res.json({ success: true, data: [] });
    const parsedStart = parseLocalDateTimeString(start + ' 00:00:00');
    const parsedEnd   = parseLocalDateTimeString(end   + ' 23:59:59');
    if (isNaN(parsedStart) || isNaN(parsedEnd)) return res.json({ success: true, data: [] });
    const raw  = await horariosRetiraModel.getReservationsBetween(parsedStart, parsedEnd);
    const data = (raw || []).map(r => Object.assign({}, r, { data: formatIsoDate(r.data) }));
    return res.json({ success: true, data });
  } catch (e) {
    console.error('Erro fetch data horarios-retira:', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

app.post('/horarios-retira/search', ensureAuth, express.json(), async (req, res) => {
  try {
    const term = (req.body && req.body.term) ? String(req.body.term).trim() : '';
    if (!term) return res.json({ success: true, data: [] });
    const data = await fatoPedidoModel.searchByTerm(term);
    return res.json({ success: true, data });
  } catch (e) {
    console.error('Erro search horarios-retira:', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Erro na busca' });
  }
});

async function resolveClienteNome(chave_cli, cliente_cod, cliente_nome_atual) {
  if (cliente_nome_atual) return cliente_nome_atual;
  try {
    let found = null;
    if (chave_cli) {
      found = await DimCliente.findOne({ where: { CHAVE_CLIENTE: String(chave_cli) } });
    }
    if (!found && cliente_cod) {
      found = await DimCliente.findOne({ where: { COD_CLIENTE: String(cliente_cod) } });
    }
    if (found) {
      return (found.FANTASIA && String(found.FANTASIA).trim()) ? found.FANTASIA : (found.NOME || null);
    }
  } catch (_) {}
  return null;
}

async function checkPedidoDuplicado(pedido, dt_horario) {
  if (!pedido) return false;
  const existing = await HorarioAgendamento.findOne({ where: { pedido: String(pedido) } });
  if (!existing || !existing.data) return false;
  const ex       = new Date(existing.data);
  const newDt    = new Date(dt_horario);
  const exDate   = new Date(ex.getFullYear(),  ex.getMonth(),  ex.getDate());
  const newDate  = new Date(newDt.getFullYear(), newDt.getMonth(), newDt.getDate());
  return exDate.getTime() !== newDate.getTime();
}

app.post('/horarios-retira/book', ensureAuth, express.json(), async (req, res) => {
  try {
    const payload = req.body || {};
    const dt      = payload.data || null;
    if (!dt) return res.status(400).json({ success: false, message: 'data ausente' });

    const usuario   = getSessionUser(req).nome || null;
    const dt_horario = parseLocalDateTimeString(String(dt));

    const cliente_nome = await resolveClienteNome(
      payload.chave_cli || null, payload.cod_cli || null, payload.nome_cli || null
    );

    if (await checkPedidoDuplicado(payload.pedido, dt_horario)) {
      return res.status(409).json({ success: false, message: 'Pedido já agendado em outra data' });
    }

    try {
      const id = await horariosRetiraModel.createReservation({
        pedido:       payload.pedido     || null,
        dt_horario,
        usuario,
        cliente_nome,
        cliente_cod:  payload.cod_cli    || null,
        categoria:    payload.categoria  || null,
        observacao:   payload.observacao || null,
      });
      const inserted = await horariosRetiraModel.getReservationById(id).catch(() => null);
      return res.json({ success: true, message: 'Reserva criada com sucesso', id, reservation: inserted });
    } catch (err) {
      if (err && err.code === 'SLOT_BOOKED') return res.status(409).json({ success: false, message: 'Horário já reservado' });
      console.error('Erro ao criar reserva:', err && err.message ? err.message : err);
      return res.status(500).json({ success: false, message: 'Erro ao criar reserva' });
    }
  } catch (e) {
    console.error('Erro book horarios-retira:', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

app.post('/horarios-retira/book-multipart', ensureAuth, upload.single('attachment'), async (req, res) => {
  try {
    const payload = req.body || {};
    const dt      = payload.data || null;
    if (!dt) return res.status(400).json({ success: false, message: 'data ausente' });

    const usuario    = getSessionUser(req).nome || null;
    const dt_horario = parseLocalDateTimeString(String(dt));

    let attachment_b64      = null;
    let attachment_name     = null;
    let attachment_mimetype = null;

    if (req.file) {
      attachment_name = req.file.originalname;
      try {
        attachment_b64      = fs.readFileSync(req.file.path).toString('base64');
        attachment_mimetype = req.file.mimetype || null;
      } catch (e) {
        console.error('Erro ao ler arquivo para base64:', e && e.message ? e.message : e);
      }
      try { fs.unlinkSync(req.file.path); } catch (_) {}
    }

    const cliente_nome = await resolveClienteNome(
      payload.chave_cli || null, payload.cod_cli || null, payload.nome_cli || null
    );

    if (await checkPedidoDuplicado(payload.pedido, dt_horario)) {
      return res.status(409).json({ success: false, message: 'Pedido já agendado em outra data' });
    }

    try {
      const id = await horariosRetiraModel.createReservation({
        pedido:       payload.pedido     || null,
        dt_horario,
        usuario,
        cliente_nome,
        cliente_cod:  payload.cod_cli    || null,
        categoria:    payload.categoria  || null,
        observacao:   payload.observacao || null,
        attachment_name,
        attachment_b64,
        attachment_mimetype,
        attachment_path: null,
      });
      const inserted = await horariosRetiraModel.getReservationById(id).catch(() => null);
      return res.json({ success: true, message: 'Reserva criada com sucesso', id, reservation: inserted });
    } catch (err) {
      if (err && err.code === 'SLOT_BOOKED') return res.status(409).json({ success: false, message: 'Horário já reservado' });
      console.error('Erro ao criar reserva:', err && err.message ? err.message : err);
      return res.status(500).json({ success: false, message: 'Erro ao criar reserva' });
    }
  } catch (e) {
    console.error('Erro book horarios-retira (multipart):', e && e.message ? e.message : e);
    return res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
