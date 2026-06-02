-- Create projects table for WBS
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  goal TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'active', 'completed', 'archived')),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add WBS fields to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS wbs_code VARCHAR(50);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours DECIMAL(10, 2);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS auto_assigned_at TIMESTAMPTZ;

-- Create unique constraint for wbs_code within each project
CREATE UNIQUE INDEX IF NOT EXISTS idx_wbs_code_per_project ON tasks(project_id, wbs_code) WHERE wbs_code IS NOT NULL;

-- Create wbs_assignments table for auto-assignment rules
CREATE TABLE IF NOT EXISTS wbs_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  wbs_code_pattern VARCHAR(100) NOT NULL,
  assignee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  auto_assign_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for WBS queries
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_wbs_code ON tasks(wbs_code);
CREATE INDEX IF NOT EXISTS idx_wbs_assignments_project ON wbs_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_assignments_pattern ON wbs_assignments(wbs_code_pattern);
