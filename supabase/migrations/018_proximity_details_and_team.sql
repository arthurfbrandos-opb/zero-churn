-- Migration 018: Proximity details in health_scores + whatsapp_team_members table
-- Feature A: Persist proximity analysis details (sentiment, engagement, summary, etc.)
-- Feature B: Separate team vs client messages via whatsapp_team_members

-- ── A1. New columns in health_scores ──────────────────────────────
ALTER TABLE health_scores
  ADD COLUMN IF NOT EXISTS proximity_sentiment       TEXT,
  ADD COLUMN IF NOT EXISTS proximity_engagement      TEXT,
  ADD COLUMN IF NOT EXISTS proximity_summary         TEXT,
  ADD COLUMN IF NOT EXISTS proximity_messages_total  INTEGER,
  ADD COLUMN IF NOT EXISTS proximity_messages_client INTEGER,
  ADD COLUMN IF NOT EXISTS proximity_weekly_batches  INTEGER;

-- ── B1. Table for team member identification ──────────────────────
CREATE TABLE IF NOT EXISTS whatsapp_team_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id     UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  jid           TEXT NOT NULL,
  display_name  TEXT,
  auto_detected BOOLEAN DEFAULT false,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agency_id, jid)
);

-- RLS
ALTER TABLE whatsapp_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "whatsapp_team_members_select" ON whatsapp_team_members
  FOR SELECT USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
  );

CREATE POLICY "whatsapp_team_members_insert" ON whatsapp_team_members
  FOR INSERT WITH CHECK (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
  );

CREATE POLICY "whatsapp_team_members_update" ON whatsapp_team_members
  FOR UPDATE USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
  );

CREATE POLICY "whatsapp_team_members_delete" ON whatsapp_team_members
  FOR DELETE USING (
    agency_id IN (SELECT agency_id FROM agency_users WHERE user_id = auth.uid())
  );

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_whatsapp_team_members_agency
  ON whatsapp_team_members (agency_id);
