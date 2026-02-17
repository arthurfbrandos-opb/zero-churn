import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clients/[id] — busca um cliente com dados completos
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: client, error } = await supabase
      .from('clients')
      .select(`
        *,
        client_integrations ( * ),
        health_scores (
          id, score_total, score_financeiro, score_proximidade,
          score_resultado, score_nps, churn_risk, diagnosis,
          flags, triggered_by, analyzed_at
        ),
        form_submissions (
          id, score_resultado, nps_score, comment, submitted_at
        ),
        churn_records ( * ),
        action_items ( * )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('[GET /api/clients/[id]]', error)
    return NextResponse.json({ error: 'Erro ao buscar cliente' }, { status: 500 })
  }
}

// PATCH /api/clients/[id] — atualiza dados do cliente
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()

    // Remove campos que não devem ser atualizados diretamente
    const { id: _id, agency_id: _aid, created_at: _cat, ...updateData } = body

    const { data: client, error } = await supabase
      .from('clients')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ client })
  } catch (error) {
    console.error('[PATCH /api/clients/[id]]', error)
    return NextResponse.json({ error: 'Erro ao atualizar cliente' }, { status: 500 })
  }
}

// DELETE /api/clients/[id] — exclui cliente (com todos os dados relacionados via CASCADE)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/clients/[id]]', error)
    return NextResponse.json({ error: 'Erro ao excluir cliente' }, { status: 500 })
  }
}
