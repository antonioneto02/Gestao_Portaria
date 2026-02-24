// ========================================
// Plano de Ação - Seed de Dados
// ========================================

const SEED = {
  users: [
    { id: 1, name: "Admin Sistema", dept: "Administração", email: "admin@empresa.com", password: "admin123", role: "admin", active: true },
    { id: 2, name: "Ana Souza", dept: "Operações", email: "ana.souza@empresa.com", password: "123456", role: "user", active: true },
    { id: 3, name: "Bruno Lima", dept: "TI", email: "bruno.lima@empresa.com", password: "123456", role: "user", active: true },
    { id: 4, name: "Carla Mendes", dept: "Financeiro", email: "carla.mendes@empresa.com", password: "123456", role: "user", active: true },
    { id: 5, name: "Daniel Costa", dept: "RH", email: "daniel.costa@empresa.com", password: "123456", role: "user", active: true },
    { id: 6, name: "Elena Santos", dept: "Operações", email: "elena.santos@empresa.com", password: "123456", role: "user", active: true }
  ],
  notifications: [],
  sessions: [],
  
  plans: [
    { 
      id: 101, 
      title: "Reduzir retrabalho no estoque", 
      priority: "Alta", 
      status: "Em andamento", 
      createdAt: "2026-01-15",
      description: "Padronização de processos para reduzir erros de inventário e retrabalho"
    },
    { 
      id: 102, 
      title: "Modernização do sistema de gestão", 
      priority: "Alta", 
      status: "Em andamento", 
      createdAt: "2026-01-20",
      description: "Atualização da plataforma ERP e integração de módulos"
    },
    { 
      id: 103, 
      title: "Programa de capacitação de equipes", 
      priority: "Média", 
      status: "Aberto", 
      createdAt: "2026-02-01",
      description: "Treinamento contínuo para desenvolvimento de competências"
    },
    { 
      id: 104, 
      title: "Otimização de custos operacionais", 
      priority: "Alta", 
      status: "Em andamento", 
      createdAt: "2026-01-10",
      description: "Análise e redução de despesas desnecessárias"
    },
    { 
      id: 105, 
      title: "Implementação de indicadores de qualidade", 
      priority: "Média", 
      status: "Concluído", 
      createdAt: "2025-12-15",
      description: "Definição e acompanhamento de KPIs de qualidade"
    }
  ],
  
  tasks: [
    // Plano 101 - Reduzir retrabalho no estoque
    { 
      id: 1001, 
      planId: 101, 
      desc: "Padronizar checklist de conferência", 
      responsibleId: 1, 
      dueDate: "2026-02-03", 
      status: "Pendente", 
      completedAt: null,
      notes: "Incluir validação de código de barras"
    },
    { 
      id: 1002, 
      planId: 101, 
      desc: "Treinar equipe no novo fluxo", 
      responsibleId: 2, 
      dueDate: "2026-02-10", 
      status: "Executando", 
      completedAt: null,
      notes: "Agendar 3 sessões de 2h cada"
    },
    { 
      id: 1003, 
      planId: 101, 
      desc: "Implementar sistema de etiquetas RFID", 
      responsibleId: 2, 
      dueDate: "2026-02-20", 
      status: "Pendente", 
      completedAt: null,
      notes: "Orçamento aprovado, aguardando fornecedor"
    },
    { 
      id: 1004, 
      planId: 101, 
      desc: "Revisar layout do armazém", 
      responsibleId: 5, 
      dueDate: "2026-02-01", 
      status: "Pendente", 
      completedAt: null,
      notes: "Priorizar itens de alta rotatividade"
    },
    
    // Plano 102 - Modernização do sistema
    { 
      id: 1005, 
      planId: 102, 
      desc: "Levantamento de requisitos com usuários", 
      responsibleId: 2, 
      dueDate: "2026-01-25", 
      status: "Concluída", 
      completedAt: "2026-01-24 14:30",
      notes: "15 usuários entrevistados"
    },
    { 
      id: 1006, 
      planId: 102, 
      desc: "Configurar ambiente de homologação", 
      responsibleId: 2, 
      dueDate: "2026-02-08", 
      status: "Executando", 
      completedAt: null,
      notes: "Servidor provisionado, instalando módulos"
    },
    { 
      id: 1007, 
      planId: 102, 
      desc: "Migração de dados legados", 
      responsibleId: 3, 
      dueDate: "2026-02-15", 
      status: "Pendente", 
      completedAt: null,
      notes: "Script de migração em desenvolvimento"
    },
    { 
      id: 1008, 
      planId: 102, 
      desc: "Testes de integração", 
      responsibleId: 2, 
      dueDate: "2026-02-22", 
      status: "Pendente", 
      completedAt: null,
      notes: "Validar APIs e webhooks"
    },
    
    // Plano 103 - Capacitação
    { 
      id: 1009, 
      planId: 103, 
      desc: "Mapear necessidades de treinamento", 
      responsibleId: 4, 
      dueDate: "2026-02-07", 
      status: "Executando", 
      completedAt: null,
      notes: "Survey enviado para todos os departamentos"
    },
    { 
      id: 1010, 
      planId: 103, 
      desc: "Contratar plataforma EAD", 
      responsibleId: 4, 
      dueDate: "2026-02-14", 
      status: "Pendente", 
      completedAt: null,
      notes: "3 propostas em análise"
    },
    { 
      id: 1011, 
      planId: 103, 
      desc: "Definir trilhas de aprendizagem", 
      responsibleId: 4, 
      dueDate: "2026-02-21", 
      status: "Pendente", 
      completedAt: null,
      notes: "Separar por nível de senioridade"
    },
    
    // Plano 104 - Otimização de custos
    { 
      id: 1012, 
      planId: 104, 
      desc: "Análise de contratos de fornecedores", 
      responsibleId: 3, 
      dueDate: "2026-01-30", 
      status: "Concluída", 
      completedAt: "2026-01-29 11:15",
      notes: "Identificadas 5 oportunidades de renegociação"
    },
    { 
      id: 1013, 
      planId: 104, 
      desc: "Renegociar contrato de limpeza", 
      responsibleId: 3, 
      dueDate: "2026-02-04", 
      status: "Executando", 
      completedAt: null,
      notes: "Reunião agendada para 05/02"
    },
    { 
      id: 1014, 
      planId: 104, 
      desc: "Implementar política de economia de energia", 
      responsibleId: 1, 
      dueDate: "2026-02-12", 
      status: "Pendente", 
      completedAt: null,
      notes: "Instalar sensores de presença"
    },
    { 
      id: 1015, 
      planId: 104, 
      desc: "Revisar parque de impressoras", 
      responsibleId: 2, 
      dueDate: "2026-01-28", 
      status: "Concluída", 
      completedAt: "2026-01-27 16:45",
      notes: "Reduzir de 12 para 6 impressoras"
    },
    
    // Plano 105 - Indicadores (Concluído)
    { 
      id: 1016, 
      planId: 105, 
      desc: "Definir KPIs principais", 
      responsibleId: 1, 
      dueDate: "2025-12-20", 
      status: "Concluída", 
      completedAt: "2025-12-19 10:00",
      notes: "7 indicadores definidos"
    },
    { 
      id: 1017, 
      planId: 105, 
      desc: "Configurar dashboards de acompanhamento", 
      responsibleId: 2, 
      dueDate: "2026-01-05", 
      status: "Concluída", 
      completedAt: "2026-01-04 15:30",
      notes: "Power BI configurado"
    },
    { 
      id: 1018, 
      planId: 105, 
      desc: "Treinar gestores no uso dos indicadores", 
      responsibleId: 4, 
      dueDate: "2026-01-15", 
      status: "Concluída", 
      completedAt: "2026-01-14 09:00",
      notes: "Workshop realizado com 12 participantes"
    },
    
    // Tarefas atrasadas para demonstração
    { 
      id: 1019, 
      planId: 101, 
      desc: "Atualizar manual de procedimentos", 
      responsibleId: 5, 
      dueDate: "2026-01-30", 
      status: "Pendente", 
      completedAt: null,
      notes: "ATRASADA - Aguardando revisão"
    },
    { 
      id: 1020, 
      planId: 104, 
      desc: "Relatório mensal de economia", 
      responsibleId: 3, 
      dueDate: "2026-02-02", 
      status: "Pendente", 
      completedAt: null,
      notes: "ATRASADA - Dados em consolidação"
    }
  ]
};
