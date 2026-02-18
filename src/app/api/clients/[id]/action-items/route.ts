/**
 * PATCH /api/clients/[id]/action-items
 * Marca ou desmarca um action item como concluído.
 *
 * Body: { itemId: string, isDone: boolean }
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toErrorMsg } from '@/lib/utils'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { itemId, isDone } = body as { itemId: string; isDone: boolean }

    if (!itemId || typeof isDone !== 'boolean') {
      return NextResponse.json({ error: 'itemId e isDone são obrigatórios' }, { status: 400 })
    }

    const updateData: Record<string, unknown> = {
      is_done: isDone,
    }

    if (isDone) {
      updateData.done_by = user.id
      updateData.done_at = new Date().toISOString()
    } else {
      updateData.done_by = null
      updateData.done_at = null
    }

    const { data: item, error } = await supabase
      .from('action_items')
      .update(updateData)
      .eq('id', itemId)
      .eq('client_id', clientId)
      .select('id, is_done, done_at')
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 })
      }
      throw error
    }

    return NextResponse.json({ item })
  } catch (err) {
    console.error('[PATCH /api/clients/[id]/action-items]', err)
    return NextResponse.json({ error: toErrorMsg(err) }, { status: 500 })
  }
}
