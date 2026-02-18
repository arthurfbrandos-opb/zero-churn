/**
 * POST /api/clients/[id]/contract  — faz upload do contrato PDF para o Supabase Storage
 * DELETE /api/clients/[id]/contract — remove o contrato
 *
 * Storage bucket: "contracts" (precisa ser criado no Supabase Dashboard com acesso privado)
 * Caminho do arquivo: {agencyId}/{clientId}/{filename}
 */
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { toErrorMsg } from '@/lib/utils'

const BUCKET = 'contracts'
const MAX_SIZE_MB = 10

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Busca agency_id
    const { data: au } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).maybeSingle()
    if (!au?.agency_id) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    // Verifica que o cliente pertence à agência
    const { data: client } = await supabase
      .from('clients').select('id').eq('id', clientId).eq('agency_id', au.agency_id).maybeSingle()
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    // Lê o arquivo do form-data
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })

    // Validações
    const allowedTypes = ['application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Apenas PDF e DOC/DOCX são aceitos' }, { status: 400 })
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `Arquivo muito grande (máx. ${MAX_SIZE_MB}MB)` }, { status: 400 })
    }

    const ext      = file.name.split('.').pop() ?? 'pdf'
    const filename = `contrato_${clientId}_${Date.now()}.${ext}`
    const path     = `${au.agency_id}/${clientId}/${filename}`

    // Remove contrato anterior se existir
    const { data: prev } = await supabase
      .from('clients').select('contract_url').eq('id', clientId).maybeSingle()
    if (prev?.contract_url) {
      // Extrai o path do storage da URL
      const prevPath = prev.contract_url.split('/storage/v1/object/')[1]?.replace(`sign/${BUCKET}/`, '')
      if (prevPath) {
        await supabase.storage.from(BUCKET).remove([prevPath]).catch(() => {})
      }
    }

    // Upload
    const arrayBuffer = await file.arrayBuffer()
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, arrayBuffer, {
        contentType: file.type,
        upsert: true,
      })

    if (uploadErr) {
      console.error('[contract upload]', uploadErr)
      return NextResponse.json({ error: toErrorMsg(uploadErr) }, { status: 500 })
    }

    // Gera URL assinada (válida por 1 ano)
    const { data: signedData, error: signErr } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 60 * 60 * 24 * 365)

    if (signErr || !signedData?.signedUrl) {
      return NextResponse.json({ error: 'Upload OK mas erro ao gerar URL' }, { status: 500 })
    }

    // Salva URL no cliente
    await supabase.from('clients').update({
      contract_url:         signedData.signedUrl,
      contract_filename:    file.name,
      contract_uploaded_at: new Date().toISOString(),
    }).eq('id', clientId)

    return NextResponse.json({
      ok:       true,
      url:      signedData.signedUrl,
      filename: file.name,
      size:     file.size,
    })
  } catch (err) {
    return NextResponse.json({ error: toErrorMsg(err) }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clientId } = await params
    const supabase = await createClient()

    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data: au } = await supabase
      .from('agency_users').select('agency_id').eq('user_id', user.id).maybeSingle()
    if (!au?.agency_id) return NextResponse.json({ error: 'Agência não encontrada' }, { status: 404 })

    const { data: client } = await supabase
      .from('clients').select('id, contract_url').eq('id', clientId).eq('agency_id', au.agency_id).maybeSingle()
    if (!client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    // Remove do storage
    if (client.contract_url) {
      const prevPath = client.contract_url.split('/storage/v1/object/')[1]?.replace(`sign/${BUCKET}/`, '')
      if (prevPath) {
        await supabase.storage.from(BUCKET).remove([prevPath]).catch(() => {})
      }
    }

    await supabase.from('clients').update({
      contract_url:         null,
      contract_filename:    null,
      contract_uploaded_at: null,
    }).eq('id', clientId)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: toErrorMsg(err) }, { status: 500 })
  }
}
