'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, Circle, Loader2, Clock, AlertTriangle,
  GitBranch, Shuffle, ChevronDown, ArrowDown, Zap,
  Database, Plug, Bot, Calendar, Shield, Rocket,
  X,
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────

type TaskStatus   = 'done' | 'in_progress' | 'todo' | 'backlog'
type TaskType     = 'bloqueante' | 'paralelo' | 'sequencial' | 'independente' | 'risco'
type SprintId     = 's0' | 's1' | 's2' | 's3' | 's4'

interface KanbanTask {
  id: string
  sprint: SprintId
  status: TaskStatus
  type: TaskType
  title: string
  note?: string
  extra?: boolean   // task além do plano original
}

// ─────────────────────────────────────────────────────────────────
// DADOS
// ─────────────────────────────────────────────────────────────────

const TASKS: KanbanTask[] = [
  // ── SPRINT 0 — CONCLUÍDOS ────────────────────────────────────
  { id: 'S0-01', sprint: 's0', status: 'done', type: 'bloqueante',  title: 'Setup Next.js 14 + TypeScript + Tailwind + shadcn/ui' },
  { id: 'S0-02', sprint: 's0', status: 'done', type: 'sequencial',  title: 'Mock data centralizado — /lib/mock-data.ts com 6 clientes' },
  { id: 'S0-03', sprint: 's0', status: 'done', type: 'sequencial',  title: 'Layout base: Sidebar + Header + rotas autenticadas' },
  { id: 'S0-04', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Telas públicas: Login, Cadastro e Recuperar Senha' },
  { id: 'S0-05', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Dashboard principal (4 camadas + Radar da Operação)' },
  { id: 'S0-06', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Cadastro de cliente — wizard 5 etapas (CEP, método, WhatsApp, contexto)' },
  { id: 'S0-08', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Configurações — 7 seções (Agência, Serviços, Formulário NPS, Integrações, Usuários, Analisador, Notificações)' },
  { id: 'S0-09', sprint: 's0', status: 'done', type: 'sequencial',  title: 'Perfil do Cliente 360° — 4 tabs (Visão Geral, Integrações, Formulários, Histórico)' },
  { id: 'S0-CL', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Base de Clientes — filtros por risco/tipo/pagamento, banners de prioridade, busca', extra: true },
  { id: 'S0-CR', sprint: 's0', status: 'done', type: 'independente',title: 'Sistema de créditos de análise por plano (Starter 2/dia → Enterprise ilimitado)', extra: true },
  { id: 'S0-NP', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Modal de envio NPS em massa + botão rápido por cliente + badge Detrator/Neutro/Promotor', extra: true },
  { id: 'S0-OB', sprint: 's0', status: 'done', type: 'independente',title: 'Período de observação configurável — bloqueia NPS para clientes novos', extra: true },
  { id: 'S0-DB', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Dashboard: NPS Snapshot + Status de Pagamentos + badges por cliente', extra: true },
  { id: 'S0-KN', sprint: 's0', status: 'done', type: 'independente',title: 'Tela Planejamento — Kanban de sprints e tasks', extra: true },

  // ── SPRINT 0 — A FAZER ────────────────────────────────────────
  { id: 'S0-07', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Formulário público — /f/[token] (link único, sem login, LGPD)', note: 'Layout separado sem sidebar' },
  { id: 'S0-10', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Central de Alertas — /alertas (filtros por severidade, marcar como tratado)' },
  { id: 'S0-11', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Painel Operacional — /operacional (saúde das integrações + custo de IA + job mensal)' },
  { id: 'S0-ED', sprint: 's0', status: 'done', type: 'paralelo',    title: 'Edição de cliente — /clientes/[id]/editar (reutiliza wizard de cadastro)', note: 'Botão já existe no perfil' },
  { id: 'S0-13', sprint: 's0', status: 'done', type: 'sequencial',  title: 'Estados vazios em todas as telas (sem clientes, sem alertas, sem formulários)' },
  { id: 'S0-15', sprint: 's0', status: 'done', type: 'sequencial',  title: 'Revisão geral — consistência visual + responsividade mobile' },
  { id: 'S0-16', sprint: 's0', status: 'done', type: 'sequencial', title: 'Deploy na Vercel + validação do link compartilhável', note: 'zero-churn.vercel.app no ar ✓' },
  { id: 'S0-FIN', sprint: 's0', status: 'done', type: 'paralelo', title: 'Tela Financeiro — Contas a Receber com visão consolidada da carteira', note: 'Recebido, Previsto, Em atraso, Sem identificação', extra: true },

  // ── SPRINT 1 — FUNDAÇÃO TÉCNICA ───────────────────────────────
  { id: 'S1-01', sprint: 's1', status: 'done', type: 'bloqueante',  title: 'Schema Supabase completo com RLS (isolamento por agência)', note: '8 migrations aplicadas' },
  { id: 'S1-02', sprint: 's1', status: 'done', type: 'sequencial',  title: 'Supabase Auth no Next.js — email/senha + sessão persistente' },
  { id: 'S1-03', sprint: 's1', status: 'done', type: 'paralelo',    title: 'Criptografia AES-256 para credenciais de integrações' },
  { id: 'S1-04', sprint: 's1', status: 'done', type: 'sequencial',  title: 'Proxy Next.js — proteger rotas + redirecionar para login' },
  { id: 'S1-05', sprint: 's1', status: 'todo', type: 'sequencial',  title: 'Resend (e-mail) — configurar + template base de e-mail', note: 'API key configurada, templates pendentes' },
  { id: 'S1-06', sprint: 's1', status: 'done', type: 'paralelo',    title: 'API Route: CRUD de agências (criar, editar, buscar perfil)' },
  { id: 'S1-07', sprint: 's1', status: 'done', type: 'paralelo',    title: 'API Route: CRUD de clientes (criar, editar, listar, deletar)' },
  { id: 'S1-08', sprint: 's1', status: 'done', type: 'sequencial',  title: 'API Route: CRUD de integrações com criptografia (Asaas)' },
  { id: 'S1-09', sprint: 's1', status: 'todo', type: 'paralelo',    title: 'API Route: CRUD de form_submissions (salvar + listar por cliente)' },
  { id: 'S1-10', sprint: 's1', status: 'todo', type: 'paralelo',    title: 'API Route: CRUD de referrals (indicações)' },
  { id: 'S1-11', sprint: 's1', status: 'done', type: 'sequencial',  title: 'Script de seed — popular banco com clientes realistas para testes' },
  { id: 'S1-12', sprint: 's1', status: 'done', type: 'sequencial',  title: 'Conectar telas ao backend real — clientes, alertas, integrações, perfil 360°' },
  { id: 'S1-13', sprint: 's1', status: 'done', type: 'sequencial',  title: 'Onboarding funcional (salva perfil + dados da agência)' },
  { id: 'S1-14', sprint: 's1', status: 'done', type: 'sequencial',  title: 'Loading states e estados de erro em todas as telas conectadas' },
  { id: 'S1-15', sprint: 's1', status: 'todo', type: 'independente',title: 'Teste DoD: criar conta → onboarding → cadastrar → editar → dashboard' },

  // ── SPRINT 2 — INTEGRAÇÕES ────────────────────────────────────
  { id: 'S2-01', sprint: 's2', status: 'done', type: 'paralelo',    title: 'Asaas: autenticar + buscar cobranças, pagamentos, assinaturas', note: 'Import bulk/single, histórico financeiro, nova cobrança' },
  { id: 'S2-02', sprint: 's2', status: 'done', type: 'paralelo',    title: 'Asaas: validar credenciais ao salvar + criar/vincular customer' },
  { id: 'S2-03', sprint: 's2', status: 'in_progress', type: 'paralelo', title: 'Dom Pagamentos: autenticar + buscar cobranças (API client + credenciais no banco)' },
  { id: 'S2-04', sprint: 's2', status: 'in_progress', type: 'paralelo', title: 'Dom Pagamentos: integrar na tela Financeiro ao lado do Asaas' },
  { id: 'S2-05', sprint: 's2', status: 'backlog', type: 'risco',     title: 'Evolution API: autenticar + buscar mensagens do grupo (60 dias)', note: 'Formato de retorno pode variar — mapear antes do sprint' },
  { id: 'S2-06', sprint: 's2', status: 'backlog', type: 'paralelo',  title: 'Evolution API: validar group_id ao salvar + confirmar acesso' },
  { id: 'S2-07', sprint: 's2', status: 'done', type: 'sequencial',   title: 'Tratamento de erros — integração falha não trava análise inteira', note: 'Asaas com fallback e mensagens amigáveis' },
  { id: 'S2-08', sprint: 's2', status: 'done', type: 'sequencial',   title: 'Status das integrações: verificar se ainda são válidas (tab Integrações)' },
  { id: 'S2-09', sprint: 's2', status: 'done', type: 'sequencial',   title: 'Alerta automático de cadastro incompleto + integração com problema' },
  { id: 'S2-10', sprint: 's2', status: 'todo', type: 'paralelo',     title: 'Formulário público real: salvar no banco + bloquear reenvio do mesmo link' },
  { id: 'S2-11', sprint: 's2', status: 'todo', type: 'sequencial',   title: 'Detecção de não resposta: flag automático após 7 e 15 dias' },
  { id: 'S2-12', sprint: 's2', status: 'todo', type: 'paralelo',     title: 'E-mail automático: lembrete de enviar formulário 5 dias antes da análise' },
  { id: 'S2-13', sprint: 's2', status: 'todo', type: 'independente', title: 'Teste DoD: 1 cliente real com Asaas conectado + formulário respondido' },

  // ── SPRINT 3 — AGENTES DE IA ──────────────────────────────────
  { id: 'S3-01', sprint: 's3', status: 'backlog', type: 'paralelo',    title: 'Ag. Financeiro: consolidar dados Asaas + Dom em linha do tempo única' },
  { id: 'S3-02', sprint: 's3', status: 'backlog', type: 'paralelo',    title: 'Ag. Financeiro: calcular score financeiro (0–100)' },
  { id: 'S3-03', sprint: 's3', status: 'backlog', type: 'paralelo',    title: 'Ag. Financeiro: detectar flags críticos (chargeback, cobrança em aberto)' },
  { id: 'S3-04', sprint: 's3', status: 'backlog', type: 'paralelo',    title: 'Ag. Resultado/NPS: ler respostas dos formulários (últimos 90 dias)' },
  { id: 'S3-05', sprint: 's3', status: 'backlog', type: 'paralelo',    title: 'Ag. Resultado/NPS: calcular score com penalidades de não resposta' },
  { id: 'S3-06', sprint: 's3', status: 'backlog', type: 'paralelo',    title: 'Ag. Resultado/NPS: detectar flags críticos (Detrator + silêncio, queda consecutiva)' },
  { id: 'S3-07', sprint: 's3', status: 'backlog', type: 'risco',       title: 'Ag. Proximidade: coletar + separar mensagens do grupo por remetente', note: 'Volume imprevisível — testar antes' },
  { id: 'S3-08', sprint: 's3', status: 'backlog', type: 'risco',       title: 'Ag. Proximidade: batching GPT-3.5 — dividir em blocos de 7 dias e resumir', note: 'Prompts podem precisar de várias iterações' },
  { id: 'S3-09', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Ag. Proximidade: análise final GPT-4o — extrair score, keywords, tendência' },
  { id: 'S3-10', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Ag. Proximidade: calcular score + detectar flags críticos' },
  { id: 'S3-11', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Ag. Calculador: combinar os 4 scores com pesos + overrides por flags' },
  { id: 'S3-12', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Ag. Diagnóstico: montar prompt + GPT-4o + parsear JSON de saída' },
  { id: 'S3-13', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Lock de análise: prevenir análise duplicada simultânea' },
  { id: 'S3-14', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Orquestrador: executar 5 agentes em sequência com tratamento de falha por agente' },
  { id: 'S3-15', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Supabase Edge Function: publicar orquestrador sem limite de timeout' },
  { id: 'S3-16', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Rate limiting: respeitar limites das APIs externas (Asaas, Dom, Evolution, OpenAI)' },
  { id: 'S3-17', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Frontend: conectar botão "Analisar agora" ao Edge Function + loading por agente' },
  { id: 'S3-18', sprint: 's3', status: 'backlog', type: 'sequencial',  title: 'Log de execução: tokens usados, tempo por agente, status, erros' },
  { id: 'S3-19', sprint: 's3', status: 'backlog', type: 'risco',       title: 'Buffer de ajuste: 5 clientes reais → avaliar prompts e pesos → ajustar', note: 'Reservar mínimo 2 dias' },
  { id: 'S3-20', sprint: 's3', status: 'backlog', type: 'independente',title: 'Teste DoD: 3 clientes reais com perfis distintos — score e diagnóstico coerentes' },

  // ── SPRINT 4 — SCHEDULER + LGPD + POLISH ─────────────────────
  { id: 'S4-01', sprint: 's4', status: 'backlog', type: 'paralelo',    title: 'Vercel Cron Job: disparar análise às 6h do dia configurado pela agência' },
  { id: 'S4-02', sprint: 's4', status: 'backlog', type: 'sequencial',  title: 'Fila sequencial: processar 1 cliente por vez (sem sobrecarga de APIs)' },
  { id: 'S4-03', sprint: 's4', status: 'backlog', type: 'sequencial',  title: 'Log do job mensal: status por cliente (sucesso / falha / pulado + motivo)' },
  { id: 'S4-04', sprint: 's4', status: 'backlog', type: 'sequencial',  title: 'E-mail ao término do job: "X de Y clientes analisados"' },
  { id: 'S4-05', sprint: 's4', status: 'backlog', type: 'paralelo',    title: 'Config. do dia no frontend + preview da próxima análise' },
  { id: 'S4-06', sprint: 's4', status: 'backlog', type: 'paralelo',    title: 'LGPD: aceite obrigatório de Termos e Política de Privacidade no cadastro' },
  { id: 'S4-07', sprint: 's4', status: 'backlog', type: 'paralelo',    title: 'LGPD: aviso explícito na integração WhatsApp — "mensagens processadas por IA"' },
  { id: 'S4-08', sprint: 's4', status: 'backlog', type: 'paralelo',    title: 'LGPD: exclusão de conta e todos os dados (direito ao esquecimento) — 2 etapas' },
  { id: 'S4-09', sprint: 's4', status: 'backlog', type: 'sequencial',  title: 'Gráfico de evolução do health score (dados reais do banco)' },
  { id: 'S4-10', sprint: 's4', status: 'backlog', type: 'sequencial',  title: 'Painel operacional funcional: custo OpenAI real + status do job mensal' },
  { id: 'S4-11', sprint: 's4', status: 'backlog', type: 'independente',title: 'Testes end-to-end com 20 clientes reais da agência — critério DoD final' },
  { id: 'S4-12', sprint: 's4', status: 'backlog', type: 'sequencial',  title: 'Correção de bugs e inconsistências encontradas nos testes' },
  { id: 'S4-13', sprint: 's4', status: 'backlog', type: 'sequencial',  title: 'Ajustes finais de UX baseados no uso real — última tarefa antes do lançamento' },
]

// ─────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DE SPRINTS
// ─────────────────────────────────────────────────────────────────

const SPRINTS: Record<SprintId, {
  label: string; goal: string; dod: string; duration: string; icon: React.ElementType; color: string
}> = {
  s0: {
    label: 'Sprint 0 — MVP de Telas',
    goal: 'Sistema navegável com dados mockados para validar com potenciais clientes',
    dod: 'Link na Vercel com todas as telas navegáveis, dados consistentes, sem travamentos',
    duration: '15 dias',
    icon: Rocket,
    color: 'violet',
  },
  s1: {
    label: 'Sprint 1 — Fundação Técnica',
    goal: 'Banco, autenticação e CRUD funcionando com dados reais',
    dod: 'Agência cria conta, loga, cadastra clientes. Dados persistem. Credenciais criptografadas.',
    duration: '2 semanas',
    icon: Database,
    color: 'blue',
  },
  s2: {
    label: 'Sprint 2 — Integrações',
    goal: 'Sistema coletando dados reais das 3 fontes (Asaas, Dom, WhatsApp)',
    dod: 'Para 1 cliente real, as 3 integrações coletam dados sem erro. Formulário salva respostas.',
    duration: '2 semanas',
    icon: Plug,
    color: 'emerald',
  },
  s3: {
    label: 'Sprint 3 — Agentes de IA',
    goal: 'Motor de análise funcionando end-to-end com 5 agentes',
    dod: '"Analisar agora" funciona. Score e diagnóstico gerados fazem sentido para 3 perfis distintos.',
    duration: '2 semanas',
    icon: Bot,
    color: 'orange',
  },
  s4: {
    label: 'Sprint 4 — Scheduler + LGPD + Polish',
    goal: 'Produto completo, automático e pronto para clientes reais',
    dod: 'Job mensal roda automaticamente, LGPD implementada, testado com 20 clientes reais.',
    duration: '1 semana',
    icon: Calendar,
    color: 'yellow',
  },
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

const TYPE_CONFIG: Record<TaskType, { label: string; color: string }> = {
  bloqueante:   { label: '🔴 Bloqueante',  color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  paralelo:     { label: '🔀 Paralelo',    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  sequencial:   { label: '⬇️ Sequencial',  color: 'text-zinc-400 bg-zinc-800 border-zinc-700' },
  independente: { label: '✅ Livre',        color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  risco:        { label: '⚠️ Risco',        color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
}

const SPRINT_BADGE: Record<SprintId, string> = {
  s0: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  s1: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  s2: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  s3: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
  s4: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
}

const COLUMN_CONFIG: Record<TaskStatus, { label: string; color: string; icon: React.ElementType; dot: string }> = {
  done:        { label: 'Concluído',    color: 'border-emerald-500/30', icon: CheckCircle2, dot: 'bg-emerald-500' },
  in_progress: { label: 'Em Progresso', color: 'border-blue-500/30',    icon: Loader2,      dot: 'bg-blue-500'   },
  todo:        { label: 'A Fazer',      color: 'border-yellow-500/30',  icon: Circle,       dot: 'bg-yellow-500' },
  backlog:     { label: 'Backlog',      color: 'border-zinc-700',       icon: Clock,        dot: 'bg-zinc-600'   },
}

const STATUS_ORDER: TaskStatus[] = ['done', 'in_progress', 'todo', 'backlog']

// ─────────────────────────────────────────────────────────────────
// COMPONENTE — TASK CARD
// ─────────────────────────────────────────────────────────────────

function TaskCard({ task, onClick }: { task: KanbanTask; onClick: () => void }) {
  const sprint = SPRINTS[task.sprint]
  const type   = TYPE_CONFIG[task.type]

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left p-3 rounded-xl border bg-zinc-900 hover:bg-zinc-800/80 transition-all group',
        task.status === 'done'
          ? 'border-zinc-800 opacity-75 hover:opacity-100'
          : task.type === 'bloqueante'
          ? 'border-red-500/20'
          : task.type === 'risco'
          ? 'border-yellow-500/20'
          : 'border-zinc-800',
      )}
    >
      {/* Header: ID + sprint badge */}
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-zinc-600 text-xs font-mono font-bold">{task.id}</span>
        <span className={cn('text-xs px-1.5 py-0.5 rounded border', SPRINT_BADGE[task.sprint])}>
          {sprint.label.split('—')[0].trim()}
        </span>
        {task.extra && (
          <span className="text-xs px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20">
            Extra ✨
          </span>
        )}
      </div>

      {/* Título */}
      <p className={cn('text-sm leading-snug mb-2',
        task.status === 'done' ? 'text-zinc-400 line-through-none' : 'text-zinc-200')}>
        {task.title}
      </p>

      {/* Footer: tipo + nota */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn('text-xs px-1.5 py-0.5 rounded border', type.color)}>
          {type.label}
        </span>
        {task.note && (
          <span className="text-zinc-600 text-xs italic truncate max-w-[180px]" title={task.note}>
            {task.note}
          </span>
        )}
      </div>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────

export default function PlanejamentoPage() {
  const [sprintFilter, setSprintFilter] = useState<SprintId | 'all'>('all')
  const [selectedTask, setSelectedTask] = useState<KanbanTask | null>(null)

  const filtered = sprintFilter === 'all'
    ? TASKS
    : TASKS.filter(t => t.sprint === sprintFilter)

  const byStatus = (status: TaskStatus) => filtered.filter(t => t.status === status)

  // Stats gerais
  const total  = TASKS.length
  const done   = TASKS.filter(t => t.status === 'done').length
  const todo   = TASKS.filter(t => t.status === 'todo').length
  const backlog = TASKS.filter(t => t.status === 'backlog').length
  const pct    = Math.round((done / total) * 100)

  return (
    <div className="min-h-screen">
      <Header
        title="Planejamento"
        description="Kanban de sprints e tasks do projeto Zero Churn"
      />

      <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">

        {/* ── Progresso geral ────────────────────────────────────── */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-white font-semibold text-sm">Progresso do Projeto</h2>
              <p className="text-zinc-500 text-xs mt-0.5">
                {done} de {total} tasks concluídas · Sprint 0 em finalização
              </p>
            </div>
            <div className="text-right">
              <p className="text-emerald-400 text-3xl font-black">{pct}%</p>
              <p className="text-zinc-600 text-xs">concluído</p>
            </div>
          </div>

          {/* Barra de progresso */}
          <div className="h-2.5 bg-zinc-800 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Stats por status */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {([
              { label: 'Concluídas',  value: done,       color: 'text-emerald-400' },
              { label: 'Em progresso',value: 0,           color: 'text-blue-400'   },
              { label: 'A fazer',     value: todo,        color: 'text-yellow-400' },
              { label: 'Backlog',     value: backlog,     color: 'text-zinc-500'   },
            ] as const).map(s => (
              <div key={s.label} className="bg-zinc-800/50 rounded-xl p-3 text-center">
                <p className={cn('text-xl font-bold', s.color)}>{s.value}</p>
                <p className="text-zinc-500 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Sprints summary ────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          {(Object.entries(SPRINTS) as [SprintId, typeof SPRINTS[SprintId]][]).map(([id, sp]) => {
            const spTasks = TASKS.filter(t => t.sprint === id)
            const spDone  = spTasks.filter(t => t.status === 'done').length
            const Icon    = sp.icon
            const isActive = sprintFilter === id

            return (
              <button
                key={id}
                onClick={() => setSprintFilter(isActive ? 'all' : id)}
                className={cn(
                  'p-3 rounded-xl border text-left transition-all',
                  isActive
                    ? 'border-zinc-600 bg-zinc-800'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                )}
              >
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Icon className={cn('w-3.5 h-3.5',
                    sp.color === 'violet'  ? 'text-violet-400'  :
                    sp.color === 'blue'    ? 'text-blue-400'    :
                    sp.color === 'emerald' ? 'text-emerald-400' :
                    sp.color === 'orange'  ? 'text-orange-400'  : 'text-yellow-400'
                  )} />
                  <span className="text-zinc-300 text-xs font-semibold">{id.toUpperCase()}</span>
                </div>
                <p className="text-zinc-500 text-xs leading-tight mb-2">{sp.duration}</p>
                <div className="flex items-center gap-1.5">
                  <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                    <div
                      className={cn('h-full rounded-full',
                        sp.color === 'violet'  ? 'bg-violet-500'  :
                        sp.color === 'blue'    ? 'bg-blue-500'    :
                        sp.color === 'emerald' ? 'bg-emerald-500' :
                        sp.color === 'orange'  ? 'bg-orange-500'  : 'bg-yellow-500'
                      )}
                      style={{ width: spTasks.length > 0 ? `${(spDone / spTasks.length) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-zinc-500 text-xs">{spDone}/{spTasks.length}</span>
                </div>
              </button>
            )
          })}
        </div>

        {/* Sprint ativa — detalhes */}
        {sprintFilter !== 'all' && (
          <div className={cn('rounded-xl border p-4 space-y-1',
            SPRINTS[sprintFilter].color === 'violet'  ? 'bg-violet-500/5 border-violet-500/20' :
            SPRINTS[sprintFilter].color === 'blue'    ? 'bg-blue-500/5 border-blue-500/20'     :
            SPRINTS[sprintFilter].color === 'emerald' ? 'bg-emerald-500/5 border-emerald-500/20':
            SPRINTS[sprintFilter].color === 'orange'  ? 'bg-orange-500/5 border-orange-500/20' : 'bg-yellow-500/5 border-yellow-500/20'
          )}>
            <p className="text-zinc-200 text-sm font-semibold">{SPRINTS[sprintFilter].label}</p>
            <p className="text-zinc-400 text-xs">🎯 {SPRINTS[sprintFilter].goal}</p>
            <p className="text-zinc-500 text-xs">✅ DoD: {SPRINTS[sprintFilter].dod}</p>
          </div>
        )}

        {/* ── Kanban ─────────────────────────────────────────────── */}
        {/* Kanban — scroll horizontal em mobile, grid em desktop */}
        <div className="overflow-x-auto -mx-4 px-4 lg:mx-0 lg:px-0 pb-2">
        <div className="grid grid-cols-4 gap-3 min-w-[720px] lg:min-w-0 items-start">
          {STATUS_ORDER.map(status => {
            const col   = COLUMN_CONFIG[status]
            const tasks = byStatus(status)
            const Icon  = col.icon

            return (
              <div key={status} className="space-y-3">
                {/* Cabeçalho da coluna */}
                <div className={cn('flex items-center gap-2 pb-2 border-b', col.color)}>
                  <div className={cn('w-2 h-2 rounded-full', col.dot)} />
                  <span className="text-zinc-300 text-sm font-semibold">{col.label}</span>
                  <span className="text-zinc-600 text-xs ml-auto">{tasks.length}</span>
                </div>

                {/* Cards */}
                <div className="space-y-2">
                  {tasks.length === 0 ? (
                    <div className="flex items-center justify-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                      <p className="text-zinc-700 text-xs">Vazio</p>
                    </div>
                  ) : (
                    tasks.map(task => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        onClick={() => setSelectedTask(task)}
                      />
                    ))
                  )}
                </div>
              </div>
            )
          })}
        </div>
        </div>{/* fim scroll wrapper */}

      </div>

      {/* ── Modal de detalhes da task ─────────────────────────────── */}
      {selectedTask && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedTask(null)}
        >
          <div
            className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-zinc-500 font-mono text-sm font-bold">{selectedTask.id}</span>
                <span className={cn('text-xs px-1.5 py-0.5 rounded border', SPRINT_BADGE[selectedTask.sprint])}>
                  {SPRINTS[selectedTask.sprint].label.split('—')[0].trim()}
                </span>
                {selectedTask.extra && (
                  <span className="text-xs px-1.5 py-0.5 rounded border text-violet-400 bg-violet-500/10 border-violet-500/20">
                    Extra ✨
                  </span>
                )}
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-zinc-600 hover:text-zinc-300 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Título */}
            <p className="text-white text-base font-semibold leading-snug">{selectedTask.title}</p>

            {/* Status + tipo */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border',
                selectedTask.status === 'done'        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
                selectedTask.status === 'in_progress' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20'         :
                selectedTask.status === 'todo'        ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20'   : 'text-zinc-400 bg-zinc-800 border-zinc-700'
              )}>
                {selectedTask.status === 'done'        ? <CheckCircle2 className="w-3 h-3" /> :
                 selectedTask.status === 'in_progress' ? <Loader2 className="w-3 h-3" />      :
                 selectedTask.status === 'todo'        ? <Circle className="w-3 h-3" />        : <Clock className="w-3 h-3" />}
                {COLUMN_CONFIG[selectedTask.status].label}
              </div>
              <span className={cn('text-xs px-2 py-1 rounded-lg border', TYPE_CONFIG[selectedTask.type].color)}>
                {TYPE_CONFIG[selectedTask.type].label}
              </span>
            </div>

            {/* Nota */}
            {selectedTask.note && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3">
                <p className="text-zinc-400 text-xs leading-relaxed">📌 {selectedTask.note}</p>
              </div>
            )}

            {/* Sprint goal */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 space-y-1">
              <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wider">Sprint</p>
              <p className="text-zinc-300 text-sm font-medium">{SPRINTS[selectedTask.sprint].label}</p>
              <p className="text-zinc-500 text-xs">{SPRINTS[selectedTask.sprint].goal}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
