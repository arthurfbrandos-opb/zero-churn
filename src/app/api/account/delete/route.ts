/**
 * DELETE /api/account/delete
 *
 * LGPD — Direito ao Esquecimento (S4-08)
 *
 * Exclui permanentemente todos os dados da agência e do usuário.
 *
 * PROCESSO (em ordem):
 *   1. Verifica autenticação + confirma password para 2ª verificação
 *   2. Busca agency_id do usuário
 *   3. Deleta dados da agência em cascata (clients, health_scores, etc. via FK cascade)
 *   4. Deleta a agência
 *   5. Deleta o usuário do Supabase Auth
 *
 * Body: { password: string }  (confirmação)
 *
 * NOTA: as FKs com ON DELETE CASCADE no schema garantem que
 * deletar a agência remove tudo em cascata:
 *   agencies → clients → health_scores, action_items, form_tokens, etc.
 *   agencies → agency_users → (user removido do auth separadamente)
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'

const supabaseAdmin = () => createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function DELETE(req: NextRequest) {
  const supabase = await createClient()

  // 1. Autenticação
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // 2. Requer confirmação de senha (2ª verificação)
  let body: { password?: unknown }
  try { body = await req.json() } catch { body = {} }

  const password = typeof body.password === 'string' ? body.password : null
  if (!password) {
    return NextResponse.json({ error: 'Senha é obrigatória para confirmar a exclusão' }, { status: 422 })
  }

  // Verifica a senha re-autenticando
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email:    user.email!,
    password,
  })

  if (signInErr) {
    return NextResponse.json({ error: 'Senha incorreta. Confirme sua senha atual.' }, { status: 403 })
  }

  // 3. Busca agency_id
  const admin = supabaseAdmin()
  const { data: au } = await admin
    .from('agency_users')
    .select('agency_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!au?.agency_id) {
    // Usuário sem agência — apenas deleta o auth user
    await admin.auth.admin.deleteUser(user.id)
    return NextResponse.json({ success: true })
  }

  const agencyId = au.agency_id

  // 4. Deleta a agência (cascata remove: clients, health_scores,
  //    action_items, form_tokens, form_submissions, alerts,
  //    analysis_logs, client_integrations, agency_integrations, agency_users)
  const { error: delAgencyErr } = await admin
    .from('agencies')
    .delete()
    .eq('id', agencyId)

  if (delAgencyErr) {
    console.error('[account/delete] Erro ao deletar agência:', delAgencyErr)
    return NextResponse.json({ error: 'Erro ao excluir dados da agência' }, { status: 500 })
  }

  // 5. Deleta o usuário do Auth
  const { error: delUserErr } = await admin.auth.admin.deleteUser(user.id)

  if (delUserErr) {
    console.error('[account/delete] Erro ao deletar usuário Auth:', delUserErr)
    // Não é crítico — dados já foram removidos
  }

  // Faz signOut local para limpar a sessão
  await supabase.auth.signOut()

  return NextResponse.json({ success: true })
}
