// ========================================
// Plano de Ação - Core Functions
// ========================================

const DB_KEY = "plano_acao_pre";

// Gera ID único
function uid() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

// Query string parser
function q(key) {
  const params = new URLSearchParams(window.location.search);
  return params.get(key);
}

// Carrega banco de dados do localStorage
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      // Validação básica
      if (db && db.users && db.plans && db.tasks) {
        return db;
      }
    }
    // Primeiro uso ou dados corrompidos: carrega seed
    const db = JSON.parse(JSON.stringify(SEED));
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  } catch (error) {
    console.error('Erro ao carregar DB:', error);
    // Em caso de erro, retorna seed
    const db = JSON.parse(JSON.stringify(SEED));
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return db;
  }
}

// Salva banco de dados no localStorage
function saveDB(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return true;
  } catch (error) {
    console.error('Erro ao salvar DB:', error);
    alert('Erro ao salvar dados. Verifique o espaço disponível no navegador.');
    return false;
  }
}

// Reset banco de dados para seed original
function resetDB() {
  if (confirm('Deseja realmente resetar todos os dados para o estado inicial? Esta ação não pode ser desfeita.')) {
    try {
      const db = JSON.parse(JSON.stringify(SEED));
      localStorage.setItem(DB_KEY, JSON.stringify(db));
      alert('Dados resetados com sucesso!');
      location.reload();
    } catch (error) {
      console.error('Erro ao resetar DB:', error);
      alert('Erro ao resetar dados.');
    }
  }
}

// Retorna data de hoje no formato ISO (YYYY-MM-DD)
function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Formata data ISO para formato brasileiro
function formatDateBR(dateStr) {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

// Formata datetime ISO para formato brasileiro
function formatDateTimeBR(dateTimeStr) {
  if (!dateTimeStr) return '—';
  const [date, time] = dateTimeStr.split(' ');
  return `${formatDateBR(date)} ${time}`;
}

// Verifica se tarefa está atrasada
function isOverdue(task) {
  return task.status !== "Concluída" && todayISO() > task.dueDate;
}

// Calcula progresso de um plano (%)
function planProgress(db, planId) {
  const tasks = db.tasks.filter(t => t.planId === planId);
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === "Concluída").length;
  return Math.round((done / tasks.length) * 100);
}

// Busca usuário por ID
function getUser(db, id) {
  return db.users.find(u => u.id === id);
}

// Busca plano por ID
function getPlan(db, id) {
  return db.plans.find(p => p.id === id);
}

// Conta tarefas por status
function countTasksByStatus(db, status) {
  return db.tasks.filter(t => t.status === status).length;
}

// Conta tarefas atrasadas
function countOverdueTasks(db) {
  return db.tasks.filter(t => isOverdue(t)).length;
}

// Valida data no formato YYYY-MM-DD
function isValidDate(dateStr) {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const d = new Date(dateStr);
  return d instanceof Date && !isNaN(d.getTime());
}

// Calcula dias até/desde uma data
function daysUntil(dateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(dateStr);
  targetDate.setHours(0, 0, 0, 0);
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Adiciona dias a uma data ISO
function addDaysISO(dateStr, days) {
  const d = new Date(dateStr || todayISO());
  d.setDate(d.getDate() + days);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Ordena array por campo
function sortBy(array, field, ascending = true) {
  return array.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    if (typeof aVal === 'string') {
      return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return ascending ? aVal - bVal : bVal - aVal;
  });
}

// Exibe toast de notificação
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  const bgClass = {
    'success': 'bg-success',
    'error': 'bg-danger',
    'warning': 'bg-warning',
    'info': 'bg-info'
  }[type] || 'bg-info';
  
  toast.className = `toast align-items-center text-white ${bgClass} border-0 position-fixed bottom-0 end-0 m-3`;
  toast.style.zIndex = '9999';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  
  document.body.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
  bsToast.show();
  
  toast.addEventListener('hidden.bs.toast', () => toast.remove());
}

// ========================================
// Sistema de Autenticação e Sessão
// ========================================

// Verifica se usuário está logado
function checkAuth() {
  const session = localStorage.getItem('userSession');
  if (!session) {
    window.location.href = 'login.html';
    return null;
  }
  try {
    return JSON.parse(session);
  } catch (error) {
    console.error('Erro ao ler sessão:', error);
    window.location.href = 'login.html';
    return null;
  }
}

// Faz login do usuário
function loginUser(email, password) {
  try {
    const db = loadDB();
    console.log('DB carregado:', db.users.length, 'usuários');
    console.log('Procurando por:', email, '/', password);
    
    const user = db.users.find(u => {
      console.log(`Testando: ${u.email} === ${email} && ${u.password} === ${password}`);
      return u.email === email && u.password === password && u.active;
    });
    
    if (!user) {
      console.error('Usuário não encontrado ou inativo');
      return { success: false, message: 'E-mail ou senha incorretos' };
    }
    
    const session = {
      userId: user.id,
      name: user.name,
      email: user.email,
      dept: user.dept,
      role: user.role,
      loginTime: new Date().toISOString()
    };
    
    localStorage.setItem('userSession', JSON.stringify(session));
    console.log('Login bem-sucedido para:', user.name);
    return { success: true, user: session };
  } catch (error) {
    console.error('Erro no login:', error);
    return { success: false, message: 'Erro ao fazer login. Verifique o console.' };
  }
}

// Faz logout do usuário
function logoutUser() {
  localStorage.removeItem('userSession');
  window.location.href = 'login.html';
}

// Obtém usuário logado
function getCurrentUser() {
  const session = localStorage.getItem('userSession');
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch (error) {
    return null;
  }
}

// Verifica se é admin
function isAdmin() {
  const user = getCurrentUser();
  return user && user.role === 'admin';
}

// ========================================
// Sistema de Notificações
// ========================================

// Cria notificação
function createNotification(userId, type, message, relatedId = null) {
  const db = loadDB();
  
  if (!db.notifications) {
    db.notifications = [];
  }
  
  const notification = {
    id: uid(),
    userId: userId,
    type: type, // 'task_assigned', 'task_overdue', 'task_completed', 'system'
    message: message,
    relatedId: relatedId,
    read: false,
    createdAt: new Date().toISOString()
  };
  
  db.notifications.push(notification);
  saveDB(db);
  
  return notification;
}

// Obtém notificações do usuário
function getUserNotifications(userId, unreadOnly = false) {
  const db = loadDB();
  
  if (!db.notifications) {
    db.notifications = [];
  }
  
  let notifications = db.notifications.filter(n => n.userId === userId);
  
  if (unreadOnly) {
    notifications = notifications.filter(n => !n.read);
  }
  
  return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

// Marca notificação como lida
function markNotificationAsRead(notificationId) {
  const db = loadDB();
  
  if (!db.notifications) return false;
  
  const notification = db.notifications.find(n => n.id === notificationId);
  if (notification) {
    notification.read = true;
    saveDB(db);
    return true;
  }
  
  return false;
}

// Marca todas notificações como lidas
function markAllNotificationsAsRead(userId) {
  const db = loadDB();
  
  if (!db.notifications) return;
  
  db.notifications.forEach(n => {
    if (n.userId === userId) {
      n.read = true;
    }
  });
  
  saveDB(db);
}

// Conta notificações não lidas
function getUnreadCount(userId) {
  const db = loadDB();
  
  if (!db.notifications) return 0;
  
  return db.notifications.filter(n => n.userId === userId && !n.read).length;
}

// Notifica responsável sobre nova tarefa
function notifyTaskAssignment(taskId, task, assignedBy) {
  const db = loadDB();
  const user = getUser(db, task.responsibleId);
  const assigner = getUser(db, assignedBy);
  const plan = getPlan(db, task.planId);
  
  if (!user) return;
  
  const message = `${assigner ? assigner.name : 'Sistema'} atribuiu a você a tarefa "${task.desc}" no plano "${plan ? plan.title : 'N/A'}". Prazo: ${formatDateBR(task.dueDate)}`;
  
  createNotification(
    task.responsibleId,
    'task_assigned',
    message,
    taskId
  );
}

// Notifica sobre tarefa atrasada
function notifyTaskOverdue(taskId) {
  const db = loadDB();
  const task = db.tasks.find(t => t.id === taskId);
  
  if (!task || task.status === 'Concluída') return;
  
  const plan = getPlan(db, task.planId);
  const days = Math.abs(daysUntil(task.dueDate));
  
  const message = `A tarefa "${task.desc}" no plano "${plan ? plan.title : 'N/A'}" está atrasada há ${days} dia(s)!`;
  
  createNotification(
    task.responsibleId,
    'task_overdue',
    message,
    taskId
  );
}

// Notifica conclusão de tarefa
function notifyTaskCompleted(taskId, completedBy) {
  const db = loadDB();
  const task = db.tasks.find(t => t.id === taskId);
  
  if (!task) return;
  
  const plan = getPlan(db, task.planId);
  const user = getUser(db, completedBy);
  
  // Notificar admin
  const admins = db.users.filter(u => u.role === 'admin');
  admins.forEach(admin => {
    const message = `${user ? user.name : 'Um usuário'} concluiu a tarefa "${task.desc}" no plano "${plan ? plan.title : 'N/A'}"`;
    
    createNotification(
      admin.id,
      'task_completed',
      message,
      taskId
    );
  });
}

// -----------------------------
// Sidebar toggle (fallback)
// -----------------------------
document.addEventListener('DOMContentLoaded', function () {
  try {
    var toggle = document.querySelector('[data-sidebar-toggle]');
    var wrapper = document.getElementById('admin-wrapper');
    var sidebar = document.getElementById('admin-sidebar') || document.querySelector('.sidebar');
    var backdrop = document.querySelector('.sidebar-backdrop');
    var MOBILE_BREAKPOINT = 992;

    if (!toggle || !wrapper || !sidebar) return;

    // restore desktop collapsed state
    if (window.innerWidth >= MOBILE_BREAKPOINT && localStorage.getItem('sidebar-collapsed') === 'true') {
      wrapper.classList.add('sidebar-collapsed');
      toggle.classList.add('is-active');
    }

    toggle.addEventListener('click', function () {
      var isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (isMobile) {
        sidebar.classList.toggle('show');
        if (backdrop) backdrop.classList.toggle('show');
        document.body.style.overflow = sidebar.classList.contains('show') ? 'hidden' : '';
      } else {
        var isCollapsed = wrapper.classList.contains('sidebar-collapsed');
        if (isCollapsed) {
          wrapper.classList.remove('sidebar-collapsed');
          toggle.classList.remove('is-active');
          localStorage.setItem('sidebar-collapsed', 'false');
        } else {
          wrapper.classList.add('sidebar-collapsed');
          toggle.classList.add('is-active');
          localStorage.setItem('sidebar-collapsed', 'true');
        }
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', function () {
        sidebar.classList.remove('show');
        backdrop.classList.remove('show');
        document.body.style.overflow = '';
      });
    }

    window.addEventListener('resize', function () {
      if (window.innerWidth >= MOBILE_BREAKPOINT) {
        sidebar.classList.remove('show');
        if (backdrop) backdrop.classList.remove('show');
        document.body.style.overflow = '';
      }
    });
  } catch (e) { console.warn('Sidebar toggle init failed', e); }
});

// ========================================
// Sistema de Perfil e Senhas
// ========================================

// Atualiza perfil do usuário
function updateUserProfile(userId, newName, newPassword = null) {
  const db = loadDB();
  const user = db.users.find(u => u.id === userId);
  
  if (!user) return { success: false, message: 'Usuário não encontrado' };
  
  // Atualizar nome
  if (newName && newName.trim().length > 0) {
    user.name = newName.trim();
  }
  
  // Atualizar senha
  if (newPassword && newPassword.length >= 6) {
    user.password = newPassword;
  } else if (newPassword && newPassword.length < 6) {
    return { success: false, message: 'Senha deve ter pelo menos 6 caracteres' };
  }
  
  saveDB(db);
  
  // Atualizar sessão com novo nome
  const session = getCurrentUser();
  if (session) {
    session.name = user.name;
    localStorage.setItem('userSession', JSON.stringify(session));
  }
  
  return { success: true, message: 'Perfil atualizado com sucesso!' };
}

// Verifica tarefas próximas de vencer e envia notificações
function checkAndNotifyOverdueTasks() {
  const db = loadDB();
  
  db.users.forEach(user => {
    const userTasks = db.tasks.filter(t => t.responsibleId === user.id && t.status !== 'Concluída');
    
    userTasks.forEach(task => {
      const daysLeft = daysUntil(task.dueDate);
      
      // Notificar se faltam 1 ou 2 dias
      if (daysLeft === 2 || daysLeft === 1) {
        const existingNotif = db.notifications.find(n => 
          n.userId === user.id && 
          n.relatedId === task.id && 
          n.type === 'task_due_soon'
        );
        
        if (!existingNotif) {
          const message = `A tarefa "${task.desc}" vence em ${daysLeft} dia(s)!`;
          createNotification(user.id, 'task_due_soon', message, task.id);
        }
      }
      
      // Notificar se já atrasou
      if (daysLeft < 0) {
        const existingNotif = db.notifications.find(n => 
          n.userId === user.id && 
          n.relatedId === task.id && 
          n.type === 'task_overdue'
        );
        
        if (!existingNotif) {
          const days = Math.abs(daysLeft);
          const message = `⚠️ A tarefa "${task.desc}" está atrasada há ${days} dia(s)!`;
          createNotification(user.id, 'task_overdue', message, task.id);
        }
      }
    });
  });
}

// ========================================
// Sistema de Relatórios e Estatísticas
// ========================================

// Obtém tarefas de um usuário com filtros
function getTasksByUser(userId, filters = {}) {
  const db = loadDB();
  let tasks = db.tasks.filter(t => t.responsibleId === userId);
  
  // Filtrar por status
  if (filters.status) {
    tasks = tasks.filter(t => t.status === filters.status);
  }
  
  // Filtrar por plano
  if (filters.planId) {
    tasks = tasks.filter(t => t.planId === filters.planId);
  }
  
  // Filtrar por atraso
  if (filters.overdue === true) {
    tasks = tasks.filter(t => isOverdue(t));
  }
  
  return tasks.sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate));
}

// Calcula estatísticas do usuário
function getUserStats(userId) {
  const db = loadDB();
  const allTasks = db.tasks.filter(t => t.responsibleId === userId);
  
  const pending = allTasks.filter(t => t.status === 'Pendente').length;
  const inProgress = allTasks.filter(t => t.status === 'Executando').length;
  const completed = allTasks.filter(t => t.status === 'Concluída').length;
  const overdue = allTasks.filter(t => isOverdue(t)).length;
  
  const total = allTasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  // Calcular tempo médio de conclusão
  const completedTasks = allTasks.filter(t => t.status === 'Concluída' && t.completedAt);
  const avgDaysToComplete = completedTasks.length > 0 
    ? Math.round(completedTasks.reduce((sum, t) => {
        const due = new Date(t.dueDate);
        const completed = new Date(t.completedAt);
        return sum + Math.ceil((completed - due) / (1000 * 60 * 60 * 24));
      }, 0) / completedTasks.length)
    : 0;
  
  return {
    total,
    pending,
    inProgress,
    completed,
    overdue,
    completionRate,
    avgDaysToComplete,
    onTimeCompletion: total > 0 ? Math.round(((completed - Math.max(0, avgDaysToComplete > 0 ? completed - Math.abs(avgDaysToComplete) : 0)) / completed) * 100) : 0
  };
}

// ========================================
// Sistema de Export/Backup
// ========================================

// Exporta tarefas para CSV
function exportTasksToCSV(userId = null, formatType = 'all') {
  const db = loadDB();
  let tasks = db.tasks;
  
  // Filtrar por usuário se especificado
  if (userId) {
    tasks = tasks.filter(t => t.responsibleId === userId);
  }
  
  if (formatType === 'overdue') {
    tasks = tasks.filter(t => isOverdue(t));
  } else if (formatType === 'pending') {
    tasks = tasks.filter(t => t.status === 'Pendente');
  } else if (formatType === 'completed') {
    tasks = tasks.filter(t => t.status === 'Concluída');
  }
  
  // Cabeçalho
  const headers = ['ID', 'Plano', 'Descrição', 'Responsável', 'Prazo', 'Status', 'Data Conclusão', 'Notas'];
  
  // Linhas
  const rows = tasks.map(task => {
    const plan = getPlan(db, task.planId);
    const user = getUser(db, task.responsibleId);
    
    return [
      task.id,
      plan ? plan.title : 'N/A',
      task.desc,
      user ? user.name : 'N/A',
      formatDateBR(task.dueDate),
      task.status,
      task.completedAt ? formatDateTimeBR(task.completedAt) : '—',
      task.notes || ''
    ];
  });
  
  // Construir CSV
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(r => r.map(c => `"${c}"`).join(','))
  ].join('\n');
  
  return csv;
}

// Exporta planos para CSV
function exportPlansToCSV() {
  const db = loadDB();
  
  const headers = ['ID', 'Título', 'Prioridade', 'Status', 'Criado em', 'Progresso %', 'Tarefas Total', 'Tarefas Concluídas'];
  
  const rows = db.plans.map(plan => {
    const tasks = db.tasks.filter(t => t.planId === plan.id);
    const completed = tasks.filter(t => t.status === 'Concluída').length;
    const progress = planProgress(db, plan.id);
    
    return [
      plan.id,
      plan.title,
      plan.priority,
      plan.status,
      formatDateBR(plan.createdAt),
      progress,
      tasks.length,
      completed
    ];
  });
  
  const csv = [
    headers.map(h => `"${h}"`).join(','),
    ...rows.map(r => r.map(c => `"${c}"`).join(','))
  ].join('\n');
  
  return csv;
}

// Exporta relatório completo (JSON)
function exportFullBackup() {
  const db = loadDB();
  return JSON.stringify(db, null, 2);
}

// Importa backup (JSON)
function importBackup(jsonData) {
  try {
    const data = JSON.parse(jsonData);
    
    // Validar estrutura
    if (!data.users || !data.plans || !data.tasks) {
      return { success: false, message: 'Formato de backup inválido' };
    }
    
    localStorage.setItem(DB_KEY, JSON.stringify(data));
    return { success: true, message: 'Backup importado com sucesso!' };
  } catch (error) {
    return { success: false, message: 'Erro ao importar backup: ' + error.message };
  }
}

// Download de arquivo
function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

// ========================================
// Utilidades para Dashboard
// ========================================

// Obtém tarefas vencidas em breve
function getUpcomingTasks(days = 7) {
  const db = loadDB();
  const today = todayISO();
  const futureDate = addDaysISO(today, days);
  
  return db.tasks.filter(t => 
    t.status !== 'Concluída' && 
    t.dueDate >= today && 
    t.dueDate <= futureDate
  ).sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

// Obtém tarefas criticamente atrasadas
function getCriticalOverdueTasks() {
  const db = loadDB();
  return db.tasks.filter(t => 
    t.status !== 'Concluída' && 
    daysUntil(t.dueDate) < -3  // Mais de 3 dias atrasadas
  ).sort((a, b) => daysUntil(a.dueDate) - daysUntil(b.dueDate));
}

// Obtém dados para gráficos
function getChartData() {
  const db = loadDB();
  
  // Dados de status geral
  const statusData = {
    pending: countTasksByStatus(db, 'Pendente'),
    inProgress: countTasksByStatus(db, 'Executando'),
    completed: countTasksByStatus(db, 'Concluída'),
    overdue: countOverdueTasks(db)
  };
  
  // Dados por prioridade
  const priorityData = {
    high: db.plans.filter(p => p.priority === 'Alta').length,
    medium: db.plans.filter(p => p.priority === 'Média').length,
    low: db.plans.filter(p => p.priority === 'Baixa').length
  };
  
  // Dados por usuário
  const userPerformance = db.users.map(user => {
    const stats = getUserStats(user.id);
    return {
      name: user.name,
      completed: stats.completed,
      pending: stats.pending,
      overdue: stats.overdue,
      completionRate: stats.completionRate
    };
  });
  
  return {
    statusData,
    priorityData,
    userPerformance
  };
}


