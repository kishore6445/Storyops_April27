-- Modify WBS to align with existing clients
-- Drop the separate projects table and use clients with WBS enhancements

-- Add WBS fields directly to clients table for WBS tracking
ALTER TABLE clients ADD COLUMN IF NOT EXISTS has_wbs BOOLEAN DEFAULT false;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wbs_goal TEXT;
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wbs_status TEXT DEFAULT 'planning' CHECK (wbs_status IN ('planning', 'active', 'completed', 'archived'));
ALTER TABLE clients ADD COLUMN IF NOT EXISTS wbs_progress_percentage INTEGER DEFAULT 0 CHECK (wbs_progress_percentage >= 0 AND wbs_progress_percentage <= 100);

-- Enhance tasks table for WBS hierarchy
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS wbs_code VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_main_task BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS is_subtask BOOLEAN DEFAULT false;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10, 2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_assigned_at TIMESTAMPTZ;

-- Create unique constraint for wbs_code within each client
CREATE UNIQUE INDEX IF NOT EXISTS idx_wbs_code_per_client ON tasks(client_id, wbs_code) WHERE wbs_code IS NOT NULL;

-- Create wbs_assignments table for auto-assignment rules (tied to client WBS)
CREATE TABLE IF NOT EXISTS wbs_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  wbs_code_pattern VARCHAR(100) NOT NULL,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auto_assign_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for WBS queries
CREATE INDEX IF NOT EXISTS idx_tasks_wbs_code ON tasks(wbs_code);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_main_task ON tasks(is_main_task);
CREATE INDEX IF NOT EXISTS idx_tasks_is_subtask ON tasks(is_subtask);
CREATE INDEX IF NOT EXISTS idx_wbs_assignments_client ON wbs_assignments(client_id);
CREATE INDEX IF NOT EXISTS idx_wbs_assignments_pattern ON wbs_assignments(wbs_code_pattern);
CREATE INDEX IF NOT EXISTS idx_clients_has_wbs ON clients(has_wbs);
