-- WBS2 Dedicated Tables
-- ✅ THIS is the correct script to run for the /wbs2 page.
-- Prerequisites: 001-create-social-media-tables.sql must have been run first
--   (it creates the "clients" and "users" tables that this script references).
-- Run this entire script in the Supabase SQL editor once.

-- ─── wbs2_plans ────────────────────────────────────────────────────────────────
-- One plan = one Client + WBS Name + date range
CREATE TABLE IF NOT EXISTS wbs2_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id   UUID REFERENCES clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL,           -- denormalised for display
  wbs_name    TEXT NOT NULL,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── wbs2_workstreams ──────────────────────────────────────────────────────────
-- Top-level streams inside a plan (1.0 Website, 2.0 Facebook Marketing, …)
CREATE TABLE IF NOT EXISTS wbs2_workstreams (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id   UUID NOT NULL REFERENCES wbs2_plans(id) ON DELETE CASCADE,
  code      TEXT NOT NULL,   -- e.g. "1.0"
  title     TEXT NOT NULL,
  color     TEXT NOT NULL DEFAULT '#6172f3',
  position  INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── wbs2_nodes ───────────────────────────────────────────────────────────────
-- Every card (vertical / sibling / child) inside a workstream.
-- Hierarchy: parent_id NULL  →  top-level vertical card
--            parent_id set   →  child (subtask) card
CREATE TABLE IF NOT EXISTS wbs2_nodes (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id             UUID NOT NULL REFERENCES wbs2_plans(id) ON DELETE CASCADE,
  workstream_id       UUID NOT NULL REFERENCES wbs2_workstreams(id) ON DELETE CASCADE,
  parent_id           UUID REFERENCES wbs2_nodes(id) ON DELETE CASCADE,
  code                TEXT NOT NULL,   -- e.g. "1.1", "1.1.1"
  title               TEXT NOT NULL DEFAULT 'New Task',
  type                TEXT NOT NULL DEFAULT 'Task' CHECK (type IN ('Workstream','Task','Subtask','Ad')),
  description         TEXT DEFAULT '',
  assignee            TEXT DEFAULT 'Unassigned',
  status              TEXT NOT NULL DEFAULT 'Not Started'
                        CHECK (status IN ('Not Started','In Progress','Waiting Client','Blocked','Done')),
  priority            TEXT NOT NULL DEFAULT 'Medium'
                        CHECK (priority IN ('Low','Medium','High')),
  sprint              TEXT DEFAULT 'Unassigned',
  client_promised_date DATE,
  internal_due_date   DATE,
  position            INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_wbs2_plans_client_id         ON wbs2_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_wbs2_workstreams_plan_id     ON wbs2_workstreams(plan_id);
CREATE INDEX IF NOT EXISTS idx_wbs2_nodes_plan_id           ON wbs2_nodes(plan_id);
CREATE INDEX IF NOT EXISTS idx_wbs2_nodes_workstream_id     ON wbs2_nodes(workstream_id);
CREATE INDEX IF NOT EXISTS idx_wbs2_nodes_parent_id         ON wbs2_nodes(parent_id);

-- ─── RLS (disabled — service role key used by API routes) ─────────────────────
ALTER TABLE wbs2_plans        DISABLE ROW LEVEL SECURITY;
ALTER TABLE wbs2_workstreams  DISABLE ROW LEVEL SECURITY;
ALTER TABLE wbs2_nodes        DISABLE ROW LEVEL SECURITY;
