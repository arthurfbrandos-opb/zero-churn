-- Zero Churn - Seed de dados para arthur@emadigital.com.br
-- Execute no SQL Editor do Supabase

-- Pega o agency_id do usuario
DO $$
DECLARE
  v_user_id  uuid;
  v_agency_id uuid;
  c1 uuid; c2 uuid; c3 uuid; c4 uuid; c5 uuid;
BEGIN

  -- Busca o user_id pelo email
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = 'arthur@emadigital.com.br'
  LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario arthur@emadigital.com.br nao encontrado. Crie a conta primeiro.';
  END IF;

  -- Busca o agency_id
  SELECT agency_id INTO v_agency_id
  FROM agency_users
  WHERE user_id = v_user_id
  LIMIT 1;

  IF v_agency_id IS NULL THEN
    RAISE EXCEPTION 'Agencia nao encontrada para este usuario.';
  END IF;

  RAISE NOTICE 'Inserindo clientes para agency_id: %', v_agency_id;

  -- CLIENTE 1: Clinica estetica - MRR - alto risco - inadimplente
  INSERT INTO clients (
    id, agency_id, name, nome_resumido, razao_social, cnpj, segment,
    client_type, mrr_value, contract_start, contract_end,
    payment_status, status, created_at
  ) VALUES (
    gen_random_uuid(), v_agency_id,
    'Clinica Estetica Bella Forma',
    'Bella Forma',
    'Bella Forma Estetica Ltda.',
    '12.345.678/0001-90',
    'Saude e Estetica',
    'mrr', 4500.00,
    '2025-06-01', '2026-06-01',
    'inadimplente', 'active',
    '2025-06-01'
  ) RETURNING id INTO c1;

  -- CLIENTE 2: Imobiliaria - MRR - risco medio - vencendo
  INSERT INTO clients (
    id, agency_id, name, nome_resumido, razao_social, cnpj, segment,
    client_type, mrr_value, contract_start, contract_end,
    payment_status, status, created_at
  ) VALUES (
    gen_random_uuid(), v_agency_id,
    'Imobiliaria Casa Certa',
    'Casa Certa',
    'Casa Certa Imoveis S.A.',
    '23.456.789/0001-01',
    'Imobiliario',
    'mrr', 6800.00,
    '2025-03-01', '2026-03-01',
    'vencendo', 'active',
    '2025-03-01'
  ) RETURNING id INTO c2;

  -- CLIENTE 3: Consultoria - TCV - novo (observacao)
  INSERT INTO clients (
    id, agency_id, name, nome_resumido, razao_social, cnpj, segment,
    client_type, tcv_value, contract_start, contract_end,
    payment_status, status, created_at
  ) VALUES (
    gen_random_uuid(), v_agency_id,
    'TechStart Consultoria',
    'TechStart',
    'TechStart Tecnologia ME',
    '34.567.890/0001-12',
    'Tecnologia',
    'tcv', 18000.00,
    '2026-01-20', '2026-07-20',
    'em_dia', 'active',
    '2026-01-20'
  ) RETURNING id INTO c3;

  -- CLIENTE 4: Restaurante - MRR - baixo risco - em dia
  INSERT INTO clients (
    id, agency_id, name, nome_resumido, razao_social, cnpj, segment,
    client_type, mrr_value, contract_start, contract_end,
    payment_status, status, created_at
  ) VALUES (
    gen_random_uuid(), v_agency_id,
    'Sabor e Arte Gastronomia',
    'Sabor & Arte',
    'Sabor e Arte Restaurante Ltda.',
    '45.678.901/0001-23',
    'Gastronomia',
    'mrr', 2900.00,
    '2025-01-01', '2026-01-01',
    'em_dia', 'active',
    '2025-01-01'
  ) RETURNING id INTO c4;

  -- CLIENTE 5: Academia - TCV - novo (observacao)
  INSERT INTO clients (
    id, agency_id, name, nome_resumido, razao_social, cnpj, segment,
    client_type, tcv_value, contract_start, contract_end,
    payment_status, status, created_at
  ) VALUES (
    gen_random_uuid(), v_agency_id,
    'FitLife Academia',
    'FitLife',
    'FitLife Fitness Ltda.',
    '56.789.012/0001-34',
    'Fitness e Bem-estar',
    'tcv', 12000.00,
    '2026-02-01', '2026-08-01',
    'em_dia', 'active',
    '2026-02-01'
  ) RETURNING id INTO c5;

  -- Integracoes para cada cliente
  INSERT INTO client_integrations (client_id, agency_id, type, status) VALUES
    (c1, v_agency_id, 'whatsapp',       'connected'),
    (c1, v_agency_id, 'asaas',          'connected'),
    (c1, v_agency_id, 'dom_pagamentos', 'disconnected'),
    (c2, v_agency_id, 'whatsapp',       'connected'),
    (c2, v_agency_id, 'asaas',          'connected'),
    (c2, v_agency_id, 'dom_pagamentos', 'disconnected'),
    (c3, v_agency_id, 'whatsapp',       'connected'),
    (c3, v_agency_id, 'asaas',          'disconnected'),
    (c3, v_agency_id, 'dom_pagamentos', 'disconnected'),
    (c4, v_agency_id, 'whatsapp',       'connected'),
    (c4, v_agency_id, 'asaas',          'connected'),
    (c4, v_agency_id, 'dom_pagamentos', 'disconnected'),
    (c5, v_agency_id, 'whatsapp',       'disconnected'),
    (c5, v_agency_id, 'asaas',          'disconnected'),
    (c5, v_agency_id, 'dom_pagamentos', 'disconnected');

  -- Health scores para clientes com mais de 60 dias
  INSERT INTO health_scores (
    client_id, agency_id, score_total, score_financeiro,
    score_proximidade, score_resultado, score_nps,
    churn_risk, diagnosis, flags, triggered_by, analyzed_at
  ) VALUES
    -- Bella Forma: risco alto, inadimplente
    (c1, v_agency_id, 32, 10, 55, 40, 30,
     'high',
     'Cliente apresenta inadimplencia recorrente nos ultimos 2 meses. Engajamento no WhatsApp reduziu 40% e o ultimo formulario indicou insatisfacao com resultados. Recomenda-se contato urgente da gestao.',
     '["Pagamento em atraso ha mais de 30 dias","Queda de engajamento no grupo","NPS abaixo de 6"]',
     'scheduled', NOW() - INTERVAL '5 days'),
    -- Casa Certa: risco medio
    (c2, v_agency_id, 58, 60, 65, 55, 45,
     'medium',
     'Cliente com performance moderada. Financeiro sob controle porem proximo ao vencimento. Comunicacao ativa mas resultados ainda abaixo do esperado. Priorizar reuniao de alinhamento.',
     '["Contrato vencendo em 15 dias","Resultados abaixo da meta"]',
     'scheduled', NOW() - INTERVAL '3 days'),
    -- Sabor & Arte: risco baixo
    (c4, v_agency_id, 82, 95, 80, 78, 85,
     'low',
     'Cliente saudavel e satisfeito. Pagamentos em dia, comunicacao ativa e resultados consistentes. NPS elevado indica potencial de indicacao. Considere proposta de upsell.',
     '[]',
     'scheduled', NOW() - INTERVAL '7 days');

  -- Formularios NPS para clientes com historico
  INSERT INTO form_submissions (
    client_id, agency_id, score_resultado, nps_score, comment, submitted_at
  ) VALUES
    (c1, v_agency_id, 5, 6, 'Os resultados melhoraram um pouco mas ainda nao sao os que esperavamos. O atendimento e bom mas precisamos ver mais retorno financeiro.', NOW() - INTERVAL '20 days'),
    (c2, v_agency_id, 6, 5, 'Estamos vendo alguma evolucao mas esperavamos mais leads qualificados ate agora. Vamos conversar na proxima reuniao.', NOW() - INTERVAL '15 days'),
    (c4, v_agency_id, 9, 9, 'Muito satisfeito com os resultados! O movimento no restaurante aumentou visivelmente apos as campanhas. Recomendaria a agencia sim!', NOW() - INTERVAL '10 days');

  RAISE NOTICE 'Seed concluido com sucesso! 5 clientes inseridos.';
END $$;
