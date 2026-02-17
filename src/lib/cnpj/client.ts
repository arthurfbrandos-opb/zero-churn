/**
 * CNPJ Enrichment via BrasilAPI
 * Gratuito, sem chave de API.
 * Retorna: razão social, nome fantasia, decisor (QSA), segmento (CNAE), endereço, telefone.
 *
 * Docs: https://brasilapi.com.br/docs#tag/CNPJ
 */

// ── Tipos BrasilAPI ────────────────────────────────────────────
export interface BrasilApiCnpjSocio {
  nome_socio:                  string
  qualificacao_socio:          { descricao: string }
  identificador_de_socio:      number // 1=PJ, 2=PF, 3=Estrangeiro
}

export interface BrasilApiCnpjResponse {
  cnpj:                    string
  razao_social:            string
  nome_fantasia:           string | null
  cnae_fiscal:             number
  cnae_fiscal_descricao:   string
  situacao_cadastral:      string // 'ATIVA' | 'BAIXADA' | ...
  data_inicio_atividade:   string
  logradouro:              string | null
  numero:                  string | null
  complemento:             string | null
  bairro:                  string | null
  municipio:               string | null
  uf:                      string | null
  cep:                     string | null
  ddd_telefone_1:          string | null
  ddd_telefone_2:          string | null
  email:                   string | null
  qsa:                     BrasilApiCnpjSocio[]
}

// ── Resultado enriquecido que o resto do app usa ───────────────
export interface CnpjEnrichment {
  razaoSocial:      string
  nomeFantasia:     string | null
  nomeDecisor:      string | null  // 1º sócio administrador
  segment:          string | null  // derivado do CNAE
  cep:              string | null
  logradouro:       string | null
  numero:           string | null
  complemento:      string | null
  bairro:           string | null
  cidade:           string | null
  estado:           string | null
  telefone:         string | null  // da Receita (pode ser do decisor)
  email:            string | null
  cnaeDescricao:    string
  situacaoAtiva:    boolean
}

// ── CNAE → Segmento ────────────────────────────────────────────
// Mapeamento por faixa de código e palavras-chave da descrição
const CNAE_SEGMENTS: Array<{ keywords: RegExp; segment: string }> = [
  { keywords: /saúde|médic|clínic|hospital|odonto|farmác|psicolog|nutri|fisioter|optometr/i,    segment: 'Saúde'                },
  { keywords: /academia|fitness|esporte|ginástica|personal|pilates|yoga/i,                        segment: 'Saúde & Bem-estar'    },
  { keywords: /beleza|estética|salão|cabeleireiro|manicure|spa|barbeiro/i,                         segment: 'Beleza & Estética'    },
  { keywords: /restaurante|lanchonete|alimentação|buffet|bar |pizzar|sanduíche|sushi/i,            segment: 'Alimentação'          },
  { keywords: /software|programas de computador|tecnologia da informação|desenvolviment|sistemas/i, segment: 'Tecnologia'           },
  { keywords: /publicidade|propaganda|marketing|agência de|relações públicas/i,                   segment: 'Marketing & Agências' },
  { keywords: /educação|escola|curso|ensino|faculdade|treinamento|capacitação/i,                   segment: 'Educação'             },
  { keywords: /imóveis|imobiliária|locação de imóveis|incorporação|construtora/i,                  segment: 'Imobiliário'          },
  { keywords: /construção|reforma|engenharia|arquitetura|obras/i,                                  segment: 'Construção'           },
  { keywords: /varejo|comércio varejista|lojas|supermercado|hipermercado/i,                        segment: 'Varejo'               },
  { keywords: /atacado|comércio atacadista|distribuidor/i,                                         segment: 'Atacado & Distribuição' },
  { keywords: /contabilidade|auditoria|perícia|escritório de contab/i,                             segment: 'Contabilidade'        },
  { keywords: /advocacia|jurídic|direito|escritório de advoc/i,                                    segment: 'Jurídico'             },
  { keywords: /logística|transporte|frete|armazém|carga/i,                                         segment: 'Logística'            },
  { keywords: /indústria|fabricação|manufatur|produção/i,                                          segment: 'Indústria'            },
  { keywords: /finanças|financeira|crédito|banco|seguros|previdência/i,                            segment: 'Financeiro'           },
  { keywords: /turismo|hotel|pousada|viagem|hospedagem/i,                                          segment: 'Turismo & Hotelaria'  },
  { keywords: /pet|veterinário|animal/i,                                                            segment: 'Pet'                  },
  { keywords: /moda|vestuário|confecção|têxtil|roupa/i,                                            segment: 'Moda'                 },
  { keywords: /agropecuária|agricultura|pecuária|rural/i,                                          segment: 'Agronegócio'          },
  { keywords: /consultoria|assessoria|gestão empresarial/i,                                        segment: 'Consultoria'          },
]

export function cnaeToSegment(descricao: string): string | null {
  for (const { keywords, segment } of CNAE_SEGMENTS) {
    if (keywords.test(descricao)) return segment
  }
  return null
}

// ── Quem é o decisor pelo QSA ──────────────────────────────────
const ADMIN_QUALIFICACOES = [
  'administrador', 'sócio-administrador', 'diretor', 'presidente',
  'ceo', 'coo', 'responsável', 'gerente', 'gestor',
]

export function decisorFromQsa(qsa: BrasilApiCnpjSocio[]): string | null {
  if (!qsa?.length) return null
  // Prefere sócio-administrador, senão pega o primeiro
  const admin = qsa.find(s =>
    ADMIN_QUALIFICACOES.some(q => s.qualificacao_socio?.descricao?.toLowerCase().includes(q))
  )
  const socio = admin ?? qsa[0]
  // Nome vem em MAIÚSCULAS da Receita — converte para Title Case
  return socio.nome_socio
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, c => c.toUpperCase())
}

// ── Função principal ───────────────────────────────────────────
export async function lookupCnpj(cnpj: string): Promise<CnpjEnrichment | null> {
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return null

  try {
    const res = await fetch(
      `https://brasilapi.com.br/api/cnpj/v1/${cleaned}`,
      { next: { revalidate: 86400 } } // cache 24h — dado da Receita muda raramente
    )
    if (!res.ok) return null

    const d: BrasilApiCnpjResponse = await res.json()

    return {
      razaoSocial:   d.razao_social,
      nomeFantasia:  d.nome_fantasia || null,
      nomeDecisor:   decisorFromQsa(d.qsa),
      segment:       cnaeToSegment(d.cnae_fiscal_descricao),
      cep:           d.cep?.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2') ?? null,
      logradouro:    d.logradouro || null,
      numero:        d.numero || null,
      complemento:   d.complemento || null,
      bairro:        d.bairro || null,
      cidade:        d.municipio || null,
      estado:        d.uf || null,
      telefone:      formatTelefone(d.ddd_telefone_1) ?? formatTelefone(d.ddd_telefone_2) ?? null,
      email:         d.email || null,
      cnaeDescricao: d.cnae_fiscal_descricao,
      situacaoAtiva: d.situacao_cadastral === 'ATIVA',
    }
  } catch {
    return null
  }
}

function formatTelefone(dddPhone: string | null | undefined): string | null {
  if (!dddPhone) return null
  const d = dddPhone.replace(/\D/g, '')
  if (d.length < 10) return null
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
}
