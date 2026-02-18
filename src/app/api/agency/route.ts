import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// GET /api/agency — retorna dados da agência do usuário logado
export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { data: agency, error } = await supabase
      .from('agencies')
      .select('*')
      .single()

    if (error) throw error

    return NextResponse.json({ agency })
  } catch (error) {
    console.error('[GET /api/agency]', error)
    return NextResponse.json({ error: 'Erro ao buscar agência' }, { status: 500 })
  }
}

// PATCH /api/agency — atualiza dados da agência
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    // Busca agency_id
    const { data: agencyUser } = await admin
      .from('agency_users')
      .select('agency_id, role')
      .eq('user_id', user.id)
      .single()

    if (!agencyUser || agencyUser.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado — apenas admins podem editar a agência' }, { status: 403 })
    }

    const body = await request.json()
    const { name, analysis_day, analysis_nps_day, plan, onboarding_done } = body

    const { data: agency, error } = await supabase
      .from('agencies')
      .update({ name, analysis_day, analysis_nps_day, plan, onboarding_done, updated_at: new Date().toISOString() })
      .eq('id', agencyUser.agency_id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ agency })
  } catch (error) {
    console.error('[PATCH /api/agency]', error)
    return NextResponse.json({ error: 'Erro ao atualizar agência' }, { status: 500 })
  }
}
