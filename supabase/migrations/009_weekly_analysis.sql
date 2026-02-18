-- ============================================================
-- Migration 004 — Análise Semanal de Sentimento
-- ============================================================
-- Separa as duas cadências:
--   analysis_day      → dia da SEMANA para análise de sentimento (0=Dom, 1=Seg ... 6=Sáb)
--   analysis_nps_day  → dia do MÊS   para lembrete do NPS mensal (1–28)
--
-- IMPORTANTE: analysis_day existia antes como "dia do mês" (1-28).
-- Esta migration zera o valor para o padrão 1 (Segunda-feira).
-- Cada agência deve reconfigurar pelo painel em Configurações → Analisador.
-- ============================================================

-- 1. Altera semântica de analysis_day: agora é dia da semana (0–6)
--    Reseta para 1 (Segunda) para não ter valores inválidos (ex: 15 não é dia da semana)
UPDATE agencies
SET analysis_day = 1
WHERE analysis_day IS NULL OR analysis_day > 6;

-- Garante que o valor fique entre 0 e 6
ALTER TABLE agencies
  ADD CONSTRAINT agencies_analysis_day_weekday
  CHECK (analysis_day BETWEEN 0 AND 6);

-- 2. Adiciona coluna para dia do NPS mensal (1–28)
ALTER TABLE agencies
  ADD COLUMN IF NOT EXISTS analysis_nps_day INTEGER NOT NULL DEFAULT 5
  CHECK (analysis_nps_day BETWEEN 1 AND 28);

-- 3. Comentários nas colunas para documentar a semântica
COMMENT ON COLUMN agencies.analysis_day     IS 'Dia da semana para análise semanal de sentimento (0=Dom, 1=Seg, 2=Ter, 3=Qua, 4=Qui, 5=Sex, 6=Sáb)';
COMMENT ON COLUMN agencies.analysis_nps_day IS 'Dia do mês (1-28) para lembrete de envio do formulário NPS mensal';
