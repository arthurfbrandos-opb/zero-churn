// ─────────────────────────────────────────────────────────────────
// MOCK DATA CENTRALIZADO — ZERO CHURN
// Todas as telas consomem dados deste arquivo.
// Nunca hardcodar dados direto nas telas.
// ─────────────────────────────────────────────────────────────────

import {
  Agency,
  Client,
  ClientWithScore,
  HealthScore,
  Alert,
  FormSubmission,
  Integration,
  ActionItem,
  Service,
} from '@/types'

// ─────────────────────────────────────────────
// SERVIÇOS CADASTRADOS
// ─────────────────────────────────────────────

export const mockServices: Service[] = [
  {
    id: 'srv-01', agencyId: 'agency-001', type: 'mrr', isActive: true,
    name: 'Tríade Gestão Comercial',
    description: 'Metodologia proprietária que combina tráfego, conteúdo e CRM para gerar crescimento recorrente.',
    entregaveis: [
      { id: 'e01', name: 'Gestão de Tráfego Pago (Meta + Google)' },
      { id: 'e02', name: 'Social Media Management (feed + stories)' },
      { id: 'e03', name: 'Relatório Mensal de Performance' },
      { id: 'e04', name: 'Reunião Quinzenal de Alinhamento' },
    ],
    bonus: [
      { id: 'b01', name: 'Consultoria de CRM (30 dias iniciais)' },
      { id: 'b02', name: 'Design Kit Inicial (20 artes)' },
    ],
  },
  {
    id: 'srv-02', agencyId: 'agency-001', type: 'mrr', isActive: true,
    name: 'Aceleração Digital',
    entregaveis: [
      { id: 'e05', name: 'Tráfego Pago (Meta Ads)' },
      { id: 'e06', name: 'Criação de Conteúdo (12 posts/mês)' },
      { id: 'e07', name: 'Dashboard de Resultados' },
    ],
    bonus: [
      { id: 'b03', name: 'Auditoria de Perfil (onboarding)' },
    ],
  },
  {
    id: 'srv-03', agencyId: 'agency-001', type: 'mrr', isActive: true,
    name: 'Presença Local',
    entregaveis: [
      { id: 'e08', name: 'Tráfego Pago Local (raio de atuação)' },
      { id: 'e09', name: 'Google Meu Negócio (gestão e respostas)' },
      { id: 'e10', name: 'Relatório Mensal' },
    ],
    bonus: [],
  },
  {
    id: 'srv-04', agencyId: 'agency-001', type: 'tcv', isActive: true,
    name: 'Implementação de Funil de Vendas',
    description: 'Projeto de estruturação completa do funil digital, do topo à conversão.',
    entregaveis: [
      { id: 'e11', name: 'Mapeamento de Jornada do Cliente' },
      { id: 'e12', name: 'Criação de Landing Pages (até 3)' },
      { id: 'e13', name: 'Configuração de Automações de E-mail' },
      { id: 'e14', name: 'Setup de Campanhas de Topo de Funil' },
      { id: 'e15', name: 'Relatório de Entrega Final' },
    ],
    bonus: [
      { id: 'b04', name: 'Treinamento da equipe interna (2h)' },
      { id: 'b05', name: '30 dias de suporte pós-entrega' },
    ],
  },
  {
    id: 'srv-05', agencyId: 'agency-001', type: 'tcv', isActive: true,
    name: 'Setup de Campanhas',
    entregaveis: [
      { id: 'e16', name: 'Configuração de Campanhas Meta Ads' },
      { id: 'e17', name: 'Configuração de Campanhas Google Ads' },
      { id: 'e18', name: 'Instalação de Pixel + Eventos de Conversão' },
      { id: 'e19', name: 'Dashboard de Performance (Data Studio)' },
    ],
    bonus: [
      { id: 'b06', name: 'Guia de Criativos de Alta Conversão' },
    ],
  },
]

// ─────────────────────────────────────────────
// HISTÓRICO MENSAL DE CHURN
// ─────────────────────────────────────────────

export const mockChurnHistory = [
  { month: 'Nov/25', avgChurnProbability: 24 },
  { month: 'Dez/25', avgChurnProbability: 28 },
  { month: 'Jan/26', avgChurnProbability: 35 },
  { month: 'Fev/26', avgChurnProbability: 42 }, // mês atual
]

// ─────────────────────────────────────────────
// AGÊNCIA
// ─────────────────────────────────────────────

export const mockAgency: Agency = {
  id: 'agency-001',
  name: 'Agência Exemplo',
  schedulerDay: 5,
  plan: 'growth',
  createdAt: '2025-06-01',
}

// ─────────────────────────────────────────────
// ACTION PLANS (reutilizáveis)
// ─────────────────────────────────────────────

const actionPlanAltoRisco: ActionItem[] = [
  { id: 'a1', text: 'Agendar call de alinhamento urgente — não espere o cliente chamar', done: false },
  { id: 'a2', text: 'Preparar relatório de resultados destacando conquistas do período', done: true, doneAt: '2026-02-10', doneBy: 'Arthur' },
  { id: 'a3', text: 'Abordar o atraso no pagamento de forma direta e propositiva', done: false },
  { id: 'a4', text: 'Enviar formulário de satisfação antes da call para ter NPS atualizado', done: false },
  { id: 'a5', text: 'Com 20 dias para renovar, apresentar proposta de continuidade ainda neste mês', done: false },
]

const actionPlanMedioRisco: ActionItem[] = [
  { id: 'b1', text: 'Agendar call de acompanhamento nos próximos 7 dias', done: true, doneAt: '2026-02-12', doneBy: 'Arthur' },
  { id: 'b2', text: 'Enviar relatório de resultados com foco no ROI entregue', done: false },
  { id: 'b3', text: 'Enviar formulário de satisfação para atualizar o NPS', done: false },
  { id: 'b4', text: 'Revisar estratégia das campanhas para melhorar performance', done: false },
]

const actionPlanBaixoRisco: ActionItem[] = [
  { id: 'c1', text: 'Manter cadência de comunicação atual — está funcionando bem', done: false },
  { id: 'c2', text: 'Agendar call de resultados mensais conforme rotina', done: false },
  { id: 'c3', text: 'Enviar formulário de NPS para manter dados atualizados', done: true, doneAt: '2026-02-08', doneBy: 'Arthur' },
]

// ─────────────────────────────────────────────
// HEALTH SCORES
// ─────────────────────────────────────────────

const healthScoreAltoRisco: HealthScore = {
  id: 'hs-001',
  clientId: 'client-001',
  calculatedAt: '2026-02-05',
  scoreTotal: 32,
  pillars: {
    financial: { score: 20,  weight: 0.35, contribution: 7.0,  trend: 'declining' },
    proximity: { score: 20,  weight: 0.30, contribution: 6.0,  trend: 'declining' },
    result:    { score: 50,  weight: 0.25, contribution: 12.5, trend: 'stable'    },
    nps:       { score: 65,  weight: 0.10, contribution: 6.5,  trend: 'declining' },
  },
  churnRisk: 'high',
  criticalFlags: [
    'Chargeback identificado',
    'Silêncio no WhatsApp há 18 dias',
  ],
  diagnosis: 'O cliente apresenta risco alto de churn (32/100). O sinal mais crítico é o chargeback registrado no mês — isso representa uma ruptura de confiança grave. Somado ao silêncio de 18 dias no WhatsApp e dois pagamentos consecutivos em atraso, o padrão indica que o cliente está em processo ativo de reavaliação do serviço. Com renovação em apenas 20 dias, a janela de ação é extremamente curta e cada dia sem contato aumenta o risco.',
  actionPlan: actionPlanAltoRisco,
  triggeredBy: 'scheduled',
}

const healthScoreMedioRisco1: HealthScore = {
  id: 'hs-002',
  clientId: 'client-002',
  calculatedAt: '2026-02-05',
  scoreTotal: 58,
  pillars: {
    financial: { score: 60,  weight: 0.35, contribution: 21.0, trend: 'stable'    },
    proximity: { score: 45,  weight: 0.30, contribution: 13.5, trend: 'declining' },
    result:    { score: 80,  weight: 0.25, contribution: 20.0, trend: 'stable'    },
    nps:       { score: 35,  weight: 0.10, contribution: 3.5,  trend: 'declining' },
  },
  churnRisk: 'medium',
  criticalFlags: [],
  diagnosis: 'O cliente apresenta risco médio (58/100). O maior ponto de atenção é o afastamento progressivo na comunicação: a agência inicia 78% das conversas e o tempo de resposta médio do cliente passou de 8h para 26h nas últimas semanas. O NPS caiu de 8 para 5 na última coleta, indicando insatisfação crescente. O financeiro está estável, o que sugere que o cliente ainda está comprometido, mas pode estar avaliando alternativas silenciosamente.',
  actionPlan: actionPlanMedioRisco,
  triggeredBy: 'manual',
}

const healthScoreMedioRisco2: HealthScore = {
  id: 'hs-003',
  clientId: 'client-003',
  calculatedAt: '2026-02-05',
  scoreTotal: 61,
  pillars: {
    financial: { score: 80,  weight: 0.35, contribution: 28.0, trend: 'stable'    },
    proximity: { score: 55,  weight: 0.30, contribution: 16.5, trend: 'stable'    },
    result:    { score: 45,  weight: 0.25, contribution: 11.25,trend: 'declining' },
    nps:       { score: 55,  weight: 0.10, contribution: 5.5,  trend: 'stable'    },
  },
  churnRisk: 'medium',
  criticalFlags: [],
  diagnosis: 'O cliente apresenta risco médio (61/100). A percepção de resultado caiu para 5/10 na última pesquisa, abaixo da média histórica de 7,5. O cliente mencionou na call do mês passado que "esperava mais resultados em tráfego pago" — o contexto bate com a queda na nota. O financeiro e a comunicação estão saudáveis, o que indica boa relação, mas os resultados precisam ser revertidos antes da próxima renovação.',
  actionPlan: actionPlanMedioRisco,
  triggeredBy: 'scheduled',
}

const healthScoreBaixoRisco: HealthScore = {
  id: 'hs-004',
  clientId: 'client-004',
  calculatedAt: '2026-02-05',
  scoreTotal: 87,
  pillars: {
    financial: { score: 100, weight: 0.35, contribution: 35.0, trend: 'stable'    },
    proximity: { score: 90,  weight: 0.30, contribution: 27.0, trend: 'improving' },
    result:    { score: 80,  weight: 0.25, contribution: 20.0, trend: 'stable'    },
    nps:       { score: 50,  weight: 0.10, contribution: 5.0,  trend: 'stable'    },
  },
  churnRisk: 'low',
  criticalFlags: [],
  diagnosis: 'O cliente está em excelente saúde (87/100). Pagamentos sempre em dia, comunicação ativa e de qualidade, percepção de resultado boa. O único ponto de atenção é o NPS que ainda não foi coletado neste período — recomendamos enviar o formulário para ter o dado completo e manter a base atualizada.',
  actionPlan: actionPlanBaixoRisco,
  triggeredBy: 'scheduled',
}

// ─────────────────────────────────────────────
// INTEGRAÇÕES
// ─────────────────────────────────────────────

const integracoesCompletas: Integration[] = [
  { id: 'int-1', clientId: 'client-001', type: 'whatsapp',      status: 'connected',    lastSyncAt: '2026-02-05' },
  { id: 'int-2', clientId: 'client-001', type: 'asaas',         status: 'connected',    lastSyncAt: '2026-02-05' },
  { id: 'int-3', clientId: 'client-001', type: 'dom_pagamentos', status: 'connected',   lastSyncAt: '2026-02-05' },
]

const integracoesComErro: Integration[] = [
  { id: 'int-4', clientId: 'client-002', type: 'whatsapp',      status: 'connected',    lastSyncAt: '2026-02-05' },
  { id: 'int-5', clientId: 'client-002', type: 'asaas',         status: 'error',        lastSyncAt: '2026-01-28' },
  { id: 'int-6', clientId: 'client-002', type: 'dom_pagamentos', status: 'disconnected' },
]

const integracoesParciais: Integration[] = [
  { id: 'int-7', clientId: 'client-003', type: 'whatsapp',      status: 'connected',    lastSyncAt: '2026-02-05' },
  { id: 'int-8', clientId: 'client-003', type: 'asaas',         status: 'connected',    lastSyncAt: '2026-02-05' },
  { id: 'int-9', clientId: 'client-003', type: 'dom_pagamentos', status: 'disconnected' },
]

const integracoesOk: Integration[] = [
  { id: 'int-10', clientId: 'client-004', type: 'whatsapp',      status: 'connected',   lastSyncAt: '2026-02-05' },
  { id: 'int-11', clientId: 'client-004', type: 'asaas',         status: 'connected',   lastSyncAt: '2026-02-05' },
  { id: 'int-12', clientId: 'client-004', type: 'dom_pagamentos', status: 'connected',  lastSyncAt: '2026-02-05' },
]

// ─────────────────────────────────────────────
// FORMULÁRIOS
// ─────────────────────────────────────────────

const mockFormSubmissions: Record<string, FormSubmission[]> = {
  'client-001': [
    { id: 'fs-1', clientId: 'client-001', formLinkToken: 'tok-abc', sentAt: '2026-02-01', respondedAt: '2026-02-03', resultScore: 5, npsScore: 6, comment: 'Esperava ver mais resultados nas campanhas', daysToRespond: 2 },
    { id: 'fs-2', clientId: 'client-001', formLinkToken: 'tok-def', sentAt: '2026-01-02', respondedAt: '2026-01-05', resultScore: 7, npsScore: 7, daysToRespond: 3 },
  ],
  'client-002': [
    { id: 'fs-3', clientId: 'client-002', formLinkToken: 'tok-ghi', sentAt: '2026-02-01', respondedAt: '2026-02-04', resultScore: 8, npsScore: 5, comment: 'Resultados ok mas comunicação poderia ser mais proativa', daysToRespond: 3 },
    { id: 'fs-4', clientId: 'client-002', formLinkToken: 'tok-jkl', sentAt: '2026-01-02', respondedAt: '2026-01-03', resultScore: 8, npsScore: 8, daysToRespond: 1 },
  ],
  'client-003': [
    { id: 'fs-5', clientId: 'client-003', formLinkToken: 'tok-mno', sentAt: '2026-02-01', respondedAt: undefined, daysToRespond: undefined },
    { id: 'fs-6', clientId: 'client-003', formLinkToken: 'tok-pqr', sentAt: '2026-01-02', respondedAt: '2026-01-04', resultScore: 7, npsScore: 7, daysToRespond: 2 },
  ],
  'client-004': [
    { id: 'fs-7', clientId: 'client-004', formLinkToken: 'tok-stu', sentAt: '2026-02-01', respondedAt: '2026-02-01', resultScore: 8, npsScore: 9, comment: 'Excelente atendimento, super satisfeito!', daysToRespond: 0 },
    { id: 'fs-8', clientId: 'client-004', formLinkToken: 'tok-vwx', sentAt: '2026-01-02', respondedAt: '2026-01-02', resultScore: 9, npsScore: 9, daysToRespond: 0 },
  ],
  'client-005': [],
}

// ─────────────────────────────────────────────
// CLIENTES COM SCORE (ClientWithScore)
// ─────────────────────────────────────────────

export const mockClients: ClientWithScore[] = [
  {
    // PERFIL 1: Risco Alto — MRR
    id: 'client-001',
    agencyId: 'agency-001',
    razaoSocial: 'Clínica Estética Bella Forma Ltda.',
    nomeResumido: 'Bella Forma',
    name: 'Bella Forma',
    cnpjCpf: '12.345.678/0001-90',
    nomeDecisor: 'Ana Paula Souza',
    telefone: '(11) 99001-2345',
    email: 'ana@bellaforma.com.br',
    emailFinanceiro: 'financeiro@bellaforma.com.br',
    segment: 'Saúde e Estética',
    address: { cep: '01310-100', logradouro: 'Av. Paulista', numero: '1000', bairro: 'Bela Vista', cidade: 'São Paulo', estado: 'SP' },
    serviceSold: 'Tráfego Pago + Social Media',
    clientType: 'mrr',
    contractValue: 4500,
    contractStartDate: '2025-06-01',
    contractEndDate: '2026-03-01',
    notes: 'Cliente exigente, foca muito em resultados de leads. Já demonstrou insatisfação com o volume de leads em dezembro.',
    paymentStatus: 'inadimplente',
    createdAt: '2025-06-01',
    healthScore: healthScoreAltoRisco,
    integrations: integracoesCompletas,
    lastFormSubmission: mockFormSubmissions['client-001'][0],
  },
  {
    // PERFIL 2: Risco Médio (afastamento) — MRR
    id: 'client-002',
    agencyId: 'agency-001',
    razaoSocial: 'Imobiliária Casa Certa S.A.',
    nomeResumido: 'Casa Certa',
    name: 'Casa Certa',
    cnpjCpf: '98.765.432/0001-10',
    nomeDecisor: 'Roberto Almeida',
    telefone: '(11) 98765-4321',
    email: 'roberto@casacerta.com.br',
    segment: 'Imobiliário',
    address: { cep: '04538-133', logradouro: 'Rua Funchal', numero: '418', bairro: 'Vila Olímpia', cidade: 'São Paulo', estado: 'SP' },
    serviceSold: 'Gestão de Tráfego Pago',
    clientType: 'mrr',
    contractValue: 3200,
    contractStartDate: '2025-08-15',
    contractEndDate: '2026-08-15',
    notes: 'Sócio principal é bem comunicativo mas sumiu nas últimas semanas. Pode estar avaliando outras agências.',
    paymentStatus: 'vencendo',
    createdAt: '2025-08-15',
    healthScore: healthScoreMedioRisco1,
    integrations: integracoesComErro,
    lastFormSubmission: mockFormSubmissions['client-002'][0],
  },
  {
    // PERFIL 3: Risco Médio (resultado) — TCV
    id: 'client-003',
    agencyId: 'agency-001',
    razaoSocial: 'TechStart Consultoria e Tecnologia Ltda.',
    nomeResumido: 'TechStart',
    name: 'TechStart',
    cnpjCpf: '55.123.456/0001-77',
    nomeDecisor: 'Fernanda Lima',
    telefone: '(11) 97654-3210',
    email: 'fernanda@techstart.com.br',
    segment: 'Tecnologia / B2B',
    address: { cep: '04711-130', logradouro: 'Av. das Nações Unidas', numero: '12901', bairro: 'Brooklin', cidade: 'São Paulo', estado: 'SP' },
    serviceSold: 'Implementação de Funil de Vendas',
    clientType: 'tcv',
    contractValue: 0,
    totalProjectValue: 18000,
    projectDeadlineDays: 90,
    projectStartDate: '2025-12-01',
    contractStartDate: '2025-12-01',
    contractEndDate: '2026-03-01',
    notes: 'Projeto de implementação de funil fechado em R$18k. Prazo de 90 dias. Pagamento antecipado realizado.',
    paymentStatus: 'em_dia',
    createdAt: '2025-12-01',
    healthScore: healthScoreMedioRisco2,
    integrations: integracoesParciais,
    lastFormSubmission: mockFormSubmissions['client-003'][0],
  },
  {
    // PERFIL 4: Risco Baixo — MRR
    id: 'client-004',
    agencyId: 'agency-001',
    razaoSocial: 'Sabor & Arte Restaurante Eireli',
    nomeResumido: 'Sabor & Arte',
    name: 'Sabor & Arte',
    cnpjCpf: '33.987.654/0001-22',
    nomeDecisor: 'Carlos Eduardo Ramos',
    telefone: '(11) 96543-2109',
    email: 'carlos@saborarte.com.br',
    segment: 'Alimentação / Delivery',
    address: { cep: '01435-000', logradouro: 'Rua Oscar Freire', numero: '540', bairro: 'Jardins', cidade: 'São Paulo', estado: 'SP' },
    serviceSold: 'Social Media + Tráfego Local',
    clientType: 'mrr',
    contractValue: 2200,
    contractStartDate: '2025-01-10',
    contractEndDate: '2026-07-10',
    notes: 'Cliente modelo, sempre engajado, paga antes do vencimento. Ótima relação com a equipe.',
    paymentStatus: 'em_dia',
    createdAt: '2025-01-10',
    healthScore: healthScoreBaixoRisco,
    integrations: integracoesOk,
    lastFormSubmission: mockFormSubmissions['client-004'][0],
  },
  {
    // PERFIL 5: Em Observação — TCV (início em janeiro)
    id: 'client-005',
    agencyId: 'agency-001',
    razaoSocial: 'Academia FitLife Ltda.',
    nomeResumido: 'FitLife',
    name: 'FitLife',
    cnpjCpf: '77.654.321/0001-55',
    nomeDecisor: 'Marcelo Tavares',
    telefone: '(11) 95432-1098',
    email: 'marcelo@fitlife.com.br',
    segment: 'Fitness / Bem-estar',
    address: { cep: '05408-000', logradouro: 'Rua Purpurina', numero: '76', bairro: 'Vila Madalena', cidade: 'São Paulo', estado: 'SP' },
    serviceSold: 'Setup e Gestão de Campanhas (Projeto)',
    clientType: 'tcv',
    contractValue: 0,
    totalProjectValue: 8500,
    projectDeadlineDays: 60,
    projectStartDate: '2026-01-15',
    contractStartDate: '2026-01-15',
    contractEndDate: '2026-03-16',
    notes: 'Cliente novo. Projeto de setup de campanhas fechado em R$8.500. Ainda na fase de onboarding.',
    paymentStatus: 'em_dia',
    createdAt: '2026-01-15',
    healthScore: undefined,
    integrations: [
      { id: 'int-13', clientId: 'client-005', type: 'whatsapp',       status: 'connected',    lastSyncAt: '2026-02-05' },
      { id: 'int-14', clientId: 'client-005', type: 'asaas',          status: 'disconnected' },
      { id: 'int-15', clientId: 'client-005', type: 'dom_pagamentos', status: 'disconnected' },
    ],
    lastFormSubmission: undefined,
  },
  {
    // PERFIL 6: Em Observação — TCV NOVO (início em fevereiro)
    id: 'client-006',
    agencyId: 'agency-001',
    razaoSocial: 'Studio Equilíbrio Pilates e Bem-estar Ltda.',
    nomeResumido: 'Studio Equilíbrio',
    name: 'Studio Equilíbrio',
    cnpjCpf: '44.321.987/0001-66',
    nomeDecisor: 'Patrícia Mendes',
    telefone: '(11) 94321-0987',
    email: 'patricia@studioequilibrio.com.br',
    segment: 'Fitness / Bem-estar',
    address: { cep: '01401-001', logradouro: 'Alameda Santos', numero: '200', bairro: 'Cerqueira César', cidade: 'São Paulo', estado: 'SP' },
    serviceSold: 'Implementação de Estratégia Digital (Projeto)',
    clientType: 'tcv',
    contractValue: 0,
    totalProjectValue: 12000,
    projectDeadlineDays: 90,
    projectStartDate: '2026-02-10',
    contractStartDate: '2026-02-10',
    contractEndDate: '2026-05-11',
    notes: 'Novo cliente fechado em fevereiro. Projeto de 90 dias de implementação digital. Pagamento à vista recebido.',
    paymentStatus: 'em_dia',
    createdAt: '2026-02-10',
    healthScore: undefined,
    integrations: [
      { id: 'int-16', clientId: 'client-006', type: 'whatsapp',       status: 'disconnected' },
      { id: 'int-17', clientId: 'client-006', type: 'asaas',          status: 'disconnected' },
      { id: 'int-18', clientId: 'client-006', type: 'dom_pagamentos', status: 'disconnected' },
    ],
    lastFormSubmission: undefined,
  },
]

// ─────────────────────────────────────────────
// ALERTAS
// ─────────────────────────────────────────────

export const mockAlerts: Alert[] = [
  {
    id: 'alrt-001',
    clientId: 'client-001',
    clientName: 'Clínica Estética Bella Forma',
    type: 'chargeback',
    severity: 'high',
    message: 'Chargeback identificado. Risco de churn elevado automaticamente para Alto.',
    isRead: false,
    createdAt: '2026-02-05',
  },
  {
    id: 'alrt-002',
    clientId: 'client-001',
    clientName: 'Clínica Estética Bella Forma',
    type: 'silence',
    severity: 'high',
    message: 'WhatsApp sem resposta do cliente há 18 dias.',
    isRead: false,
    createdAt: '2026-02-04',
  },
  {
    id: 'alrt-003',
    clientId: 'client-002',
    clientName: 'Imobiliária Casa Certa',
    type: 'integration_error',
    severity: 'medium',
    message: 'Integração com Asaas retornou erro. Dados financeiros desatualizados desde 28/01.',
    isRead: false,
    createdAt: '2026-02-03',
  },
  {
    id: 'alrt-004',
    clientId: 'client-002',
    clientName: 'Imobiliária Casa Certa',
    type: 'nps_drop',
    severity: 'medium',
    message: 'NPS caiu de 8 para 5 na última pesquisa. Tendência de queda nos últimos 2 meses.',
    isRead: true,
    createdAt: '2026-02-05',
  },
  {
    id: 'alrt-005',
    clientId: 'client-003',
    clientName: 'TechStart Consultoria',
    type: 'form_no_response',
    severity: 'low',
    message: 'Formulário de satisfação enviado há 15 dias sem resposta.',
    isRead: false,
    createdAt: '2026-02-16',
  },
]

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

export function getClientById(id: string): ClientWithScore | undefined {
  return mockClients.find((c) => c.id === id)
}

export function getAlertsByClientId(clientId: string): Alert[] {
  return mockAlerts.filter((a) => a.clientId === clientId)
}

export function getFormsByClientId(clientId: string): FormSubmission[] {
  return mockFormSubmissions[clientId] ?? []
}

export function getUnreadAlertsCount(): number {
  return mockAlerts.filter((a) => !a.isRead).length
}

export function getTotalRevenueAtRisk(): number {
  return mockClients
    .filter((c) => c.healthScore?.churnRisk === 'high' || c.healthScore?.churnRisk === 'medium')
    .reduce((sum, c) => sum + c.contractValue, 0)
}

export function getAverageHealthScore(): number {
  const clientsWithScore = mockClients.filter((c) => c.healthScore)
  if (clientsWithScore.length === 0) return 0
  const total = clientsWithScore.reduce((sum, c) => sum + (c.healthScore?.scoreTotal ?? 0), 0)
  return Math.round(total / clientsWithScore.length)
}

export function getNewTCVClients(days = 30) {
  const now = new Date()
  return mockClients.filter((c) => {
    if (c.clientType !== 'tcv') return false
    const start = new Date(c.projectStartDate ?? c.contractStartDate)
    const diff = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    return diff <= days
  })
}

export function getMonthlyBillingForecast() {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  // MRR: soma de todos os clientes recorrentes
  const mrrForecast = getTotalMRR()

  // TCV novo: projetos que assinaram neste mês (faturamento antecipado recebido)
  const newTCVThisMonth = mockClients.filter((c) => {
    if (c.clientType !== 'tcv') return false
    const start = new Date(c.projectStartDate ?? c.contractStartDate)
    return start.getMonth() === currentMonth && start.getFullYear() === currentYear
  })
  const tcvForecast = newTCVThisMonth.reduce((sum, c) => sum + (c.totalProjectValue ?? 0), 0)

  return {
    mrrForecast,
    tcvForecast,
    total: mrrForecast + tcvForecast,
    newTCVClients: newTCVThisMonth,
    currentMonthLabel: now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
  }
}

export function getMRRSafe(): number {
  return mockClients
    .filter((c) => c.clientType === 'mrr' && c.healthScore?.churnRisk === 'low')
    .reduce((sum, c) => sum + c.contractValue, 0)
}

export function getMRRAtRisk(): number {
  return mockClients
    .filter((c) => c.clientType === 'mrr' && (c.healthScore?.churnRisk === 'high' || c.healthScore?.churnRisk === 'medium'))
    .reduce((sum, c) => sum + c.contractValue, 0)
}

export function getClientsRenewingSoon(days = 30) {
  const now = new Date()
  return mockClients.filter((c) => {
    if (c.clientType !== 'mrr') return false
    const end = new Date(c.contractEndDate)
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 && diff <= days
  })
}

export function getTCVExpiringSoon(days = 15) {
  const now = new Date()
  return mockClients.filter((c) => {
    if (c.clientType !== 'tcv') return false
    const end = new Date(c.contractEndDate)
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return diff > 0 && diff <= days
  })
}

export function getClientsWithIntegrationErrors() {
  return mockClients.filter((c) =>
    c.integrations.some((i) => i.status === 'error' || i.status === 'expired')
  )
}

export function getClientsWithPendingForms() {
  const cutoff = 7
  return mockClients.filter((c) => {
    const forms = mockFormSubmissions[c.id] ?? []
    const lastSent = forms[0]
    if (!lastSent) return false
    if (lastSent.respondedAt) return false
    const sentAt = new Date(lastSent.sentAt)
    const now = new Date()
    const days = Math.ceil((now.getTime() - sentAt.getTime()) / (1000 * 60 * 60 * 24))
    return days >= cutoff
  })
}

export function getClientsWithoutRecentNPS() {
  return mockClients.filter((c) => {
    const forms = mockFormSubmissions[c.id] ?? []
    const lastResponse = forms.find((f) => f.respondedAt)
    if (!lastResponse) return true
    const respondedAt = new Date(lastResponse.respondedAt!)
    const now = new Date()
    const days = Math.ceil((now.getTime() - respondedAt.getTime()) / (1000 * 60 * 60 * 24))
    return days > 45
  })
}

export function getMRRClients() {
  return mockClients.filter((c) => c.clientType === 'mrr')
}

export function getTCVClients() {
  return mockClients.filter((c) => c.clientType === 'tcv')
}

export function getTotalMRR(): number {
  return getMRRClients().reduce((sum, c) => sum + c.contractValue, 0)
}

export function getTotalTCVInExecution(): number {
  return getTCVClients().reduce((sum, c) => sum + (c.totalProjectValue ?? 0), 0)
}

export function getTCVDaysRemaining(client: { projectStartDate?: string; projectDeadlineDays?: number }): number {
  if (!client.projectStartDate || !client.projectDeadlineDays) return 0
  const start = new Date(client.projectStartDate)
  const end = new Date(start.getTime() + client.projectDeadlineDays * 24 * 60 * 60 * 1000)
  const now = new Date()
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
}

export function getTCVProgressPercent(client: { projectStartDate?: string; projectDeadlineDays?: number }): number {
  if (!client.projectStartDate || !client.projectDeadlineDays) return 0
  const start = new Date(client.projectStartDate)
  const now = new Date()
  const elapsed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return Math.min(100, Math.round((elapsed / client.projectDeadlineDays) * 100))
}

export function getActiveClientsCount(): number {
  const now = new Date()
  return mockClients.filter((c) => new Date(c.contractEndDate) > now).length
}

export function getLastMonthAvgChurn(): number {
  return mockChurnHistory[mockChurnHistory.length - 1].avgChurnProbability
}

export function getLast3MonthsAvgChurn(): number {
  const last3 = mockChurnHistory.slice(-3)
  return Math.round(last3.reduce((sum, m) => sum + m.avgChurnProbability, 0) / last3.length)
}

export function getRiskCounts() {
  const counts = { high: 0, medium: 0, low: 0, observacao: 0 }
  mockClients.forEach((c) => {
    const risk = c.healthScore?.churnRisk ?? 'observacao'
    counts[risk]++
  })
  return counts
}

export function getRevenueByRisk() {
  const revenue = { high: 0, medium: 0, low: 0 }
  mockClients.forEach((c) => {
    const risk = c.healthScore?.churnRisk
    if (risk === 'high') revenue.high += c.contractValue
    else if (risk === 'medium') revenue.medium += c.contractValue
    else if (risk === 'low') revenue.low += c.contractValue
  })
  return revenue
}

// ── Resumo executivo da base de clientes ─────────────────────────

export function getClientSummary() {
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const in45Days = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const ativos = mockClients.filter(c => new Date(c.contractEndDate) > now).length
  const novos = mockClients.filter(c => new Date(c.createdAt) >= thirtyDaysAgo).length
  const mrr = mockClients.filter(c => c.clientType === 'mrr').length
  const tcv = mockClients.filter(c => c.clientType === 'tcv').length

  // MRR renovando nos próximos 45 dias
  const renovacao = mockClients.filter(c => {
    if (c.clientType !== 'mrr') return false
    const end = new Date(c.contractEndDate)
    return end > now && end <= in45Days
  }).length

  // TCV encerrando nos próximos 30 dias
  const tcvEncerrando = mockClients.filter(c => {
    if (c.clientType !== 'tcv') return false
    const end = new Date(c.contractEndDate)
    return end > now && end <= in30Days
  }).length

  // Clientes em alto risco
  const emRisco = mockClients.filter(c =>
    c.healthScore?.churnRisk === 'high'
  ).length

  return { ativos, novos, mrr, tcv, renovacao, tcvEncerrando, emRisco }
}

export function getClientsSortedByRisk(): ClientWithScore[] {
  const riskOrder: Record<string, number> = { high: 0, medium: 1, low: 2, observacao: 3 }
  return [...mockClients].sort((a, b) => {
    const riskA = riskOrder[a.healthScore?.churnRisk ?? 'observacao']
    const riskB = riskOrder[b.healthScore?.churnRisk ?? 'observacao']
    if (riskA !== riskB) return riskA - riskB
    return (a.healthScore?.scoreTotal ?? 0) - (b.healthScore?.scoreTotal ?? 0)
  })
}
