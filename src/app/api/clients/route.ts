import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/clients — lista todos os clientes da agência logada
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_integrations ( id, type, status, last_sync_at ),
        health_scores ( id, score_total, churn_risk, analyzed_at, flags, diagnosis )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ clients: data })
  } catch (error) {
    console.error('[GET /api/clients]', error)
    return NextResponse.json({ error: 'Erro ao buscar clientes' }, { status: 500 })
  }
}

// POST /api/clients — cria novo cliente
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Busca agency_id do usuário logado
    const { data: agencyUser, error: auError } = await admin
      .from('agency_users')
      .select('agency_id')
      .eq('user_id', user.id)
      .single()

    if (auError || !agencyUser) {
      return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })
    }

    const body = await request.json()
    const {
      name, nome_resumido, razao_social, cnpj, segment,
      nome_decisor, email, telefone, email_financeiro,
      cep, logradouro, numero, complemento, bairro, cidade, estado,
      service_id, entregaveis_incluidos, bonus_incluidos,
      client_type, mrr_value, tcv_value,
      contract_start, contract_end,
      // MRR
      contract_months, has_implementation_fee, implementation_fee_value, implementation_fee_date,
      // TCV
      project_deadline_days, has_installments, installments_type, installments_count,
      first_installment_date, parcelas,
      // Contexto
      nicho_especifico, resumo_reuniao, expectativas_cliente, principais_dores,
      whatsapp_group_id, observations, payment_status,
    } = body

    if (!name || !client_type) {
      return NextResponse.json({ error: 'Nome e tipo de cliente são obrigatórios' }, { status: 400 })
    }

    // #4 — Verificar CNPJ duplicado dentro da mesma agência
    if (cnpj) {
      const cnpjLimpo = String(cnpj).replace(/\D/g, '')
      if (cnpjLimpo.length >= 11) {
        const { data: dup } = await supabase
          .from('clients')
          .select('id, name')
          .eq('agency_id', agencyUser.agency_id)
          .eq('cnpj', cnpjLimpo)
          .maybeSingle()
        if (dup) {
          return NextResponse.json(
            { error: `Já existe um cliente com este CNPJ: ${dup.name}`, existingId: dup.id },
            { status: 409 }
          )
        }
      }
    }

    const { data: client, error } = await supabase
      .from('clients')
      .insert({
        agency_id: agencyUser.agency_id,
        name, nome_resumido, razao_social, cnpj, segment,
        nome_decisor, email, telefone, email_financeiro,
        cep, logradouro, numero, complemento, bairro, cidade, estado,
        service_id, entregaveis_incluidos, bonus_incluidos,
        client_type, mrr_value, tcv_value,
        contract_months, has_implementation_fee, implementation_fee_value, implementation_fee_date,
        project_deadline_days, has_installments, installments_type, installments_count,
        first_installment_date, parcelas,
        nicho_especifico, resumo_reuniao, expectativas_cliente, principais_dores,
        contract_start, contract_end,
        whatsapp_group_id, observations,
        payment_status: payment_status ?? 'em_dia',
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ client }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/clients]', error)
    return NextResponse.json({ error: 'Erro ao criar cliente' }, { status: 500 })
  }
}
