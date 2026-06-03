-- ⚠️  DO NOT RUN THIS SCRIPT — it requires a "projects" table that does not exist.
-- This file is legacy/unused. For the /wbs2 page, run 029-create-wbs2-tables.sql instead.

-- WBS (Work Breakdown Structure) Tables for Supabase

-- WBS Items table - Hierarchical nodes in the WBS tree
CREATE TABLE IF NOT EXISTS wbs_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES wbs_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  wbs_code TEXT NOT NULL, -- e.g., "1", "1.1", "1.1.2"
  status TEXT DEFAULT 'not-started', -- not-started, in-progress, completed
  priority TEXT DEFAULT 'medium', -- low, medium, high, critical
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  due_date DATE,
  estimated_hours DECIMAL(10, 2),
  progress_percentage INTEGER DEFAULT 0, -- Auto-calculated from children if has children
  linked_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL, -- Link to auto-created task
  is_leaf_node BOOLEAN DEFAULT FALSE, -- TRUE if no children (can create tasks)
  position INTEGER DEFAULT 0, -- For ordering siblings
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(project_id, wbs_code)
);

-- WBS Dependencies table - Links between WBS items for precedence
CREATE TABLE IF NOT EXISTS wbs_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_id UUID NOT NULL REFERENCES wbs_items(id) ON DELETE CASCADE,
  successor_id UUID NOT NULL REFERENCES wbs_items(id) ON DELETE CASCADE,
  dependency_type TEXT DEFAULT 'finish-start', -- finish-start, start-start, finish-finish
  lead_lag_days INTEGER DEFAULT 0, -- Negative for lag, positive for lead
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  UNIQUE(predecessor_id, successor_id, dependency_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_wbs_items_project_id ON wbs_items(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_parent_id ON wbs_items(parent_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_project_parent ON wbs_items(project_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_assignee_id ON wbs_items(assignee_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_sprint_id ON wbs_items(sprint_id);
CREATE INDEX IF NOT EXISTS idx_wbs_items_linked_task_id ON wbs_items(linked_task_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dependencies_predecessor ON wbs_dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_wbs_dependencies_successor ON wbs_dependencies(successor_id);

-- Enable Row Level Security
ALTER TABLE wbs_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_dependencies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for wbs_items (Manager role only)
CREATE POLICY "Project members can view WBS items" ON wbs_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = wbs_items.project_id
      AND (projects.owner_id = auth.uid() OR projects.team_id IN (
        SELECT team_id FROM team_members WHERE user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Project managers can create WBS items" ON wbs_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = wbs_items.project_id
      AND (projects.owner_id = auth.uid() OR (
        projects.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        AND (SELECT role FROM team_members WHERE user_id = auth.uid() AND team_id = projects.team_id) = 'manager'
      ))
    )
  );

CREATE POLICY "Project managers can update WBS items" ON wbs_items
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = wbs_items.project_id
      AND (projects.owner_id = auth.uid() OR (
        projects.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        AND (SELECT role FROM team_members WHERE user_id = auth.uid() AND team_id = projects.team_id) = 'manager'
      ))
    )
  );

CREATE POLICY "Project managers can delete WBS items" ON wbs_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = wbs_items.project_id
      AND (projects.owner_id = auth.uid() OR (
        projects.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
        AND (SELECT role FROM team_members WHERE user_id = auth.uid() AND team_id = projects.team_id) = 'manager'
      ))
    )
  );

-- RLS Policies for wbs_dependencies (same as items - manager only)
CREATE POLICY "Project members can view WBS dependencies" ON wbs_dependencies
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM wbs_items
      WHERE (wbs_items.id = wbs_dependencies.predecessor_id OR wbs_items.id = wbs_dependencies.successor_id)
      AND EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = wbs_items.project_id
        AND (projects.owner_id = auth.uid() OR projects.team_id IN (
          SELECT team_id FROM team_members WHERE user_id = auth.uid()
        ))
      )
    )
  );

CREATE POLICY "Project managers can manage WBS dependencies" ON wbs_dependencies
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM wbs_items
      WHERE wbs_items.id = wbs_dependencies.predecessor_id
      AND EXISTS (
        SELECT 1 FROM projects
        WHERE projects.id = wbs_items.project_id
        AND (projects.owner_id = auth.uid() OR (
          projects.team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid())
          AND (SELECT role FROM team_members WHERE user_id = auth.uid() AND team_id = projects.team_id) = 'manager'
        ))
      )
    )
  );
