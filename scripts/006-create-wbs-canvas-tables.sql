-- Create WBS Canvas tables for StoryOps

-- Table: wbs_boards
-- Represents a project's WBS canvas at the highest level
CREATE TABLE IF NOT EXISTS wbs_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(project_id) -- One WBS board per project
);

-- Table: wbs_lanes
-- Horizontal lanes representing different areas (Facebook, Website, SEO, etc.)
CREATE TABLE IF NOT EXISTS wbs_lanes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES wbs_boards(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL, -- e.g., "Facebook", "Website", "SEO"
  color VARCHAR(7) DEFAULT '#3B82F6', -- Hex color code
  position INT NOT NULL, -- Order of lanes
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Table: wbs_nodes
-- Hierarchical nodes with auto-numbered WBS codes
CREATE TABLE IF NOT EXISTS wbs_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lane_id UUID NOT NULL REFERENCES wbs_lanes(id) ON DELETE CASCADE,
  board_id UUID NOT NULL REFERENCES wbs_boards(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES wbs_nodes(id) ON DELETE CASCADE,
  
  -- Hierarchical numbering: 1, 1.1, 1.1.1, 2, 2.1, etc.
  wbs_code VARCHAR(50) NOT NULL,
  
  -- Content
  title VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Status and tracking
  status VARCHAR(50) DEFAULT 'not-started', -- not-started, in-progress, completed
  priority VARCHAR(50) DEFAULT 'medium', -- low, medium, high, critical
  progress_percentage INT DEFAULT 0,
  
  -- Assignment and timing
  assigned_to UUID,
  due_date DATE,
  estimated_hours NUMERIC(10, 2),
  
  -- Publishing to sprint
  sprint_id UUID REFERENCES sprints(id) ON DELETE SET NULL,
  linked_sprint_task_id UUID, -- Task created when published to sprint
  
  -- Positioning
  position INT NOT NULL,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  CONSTRAINT valid_wbs_code CHECK (wbs_code ~ '^\d+(\.\d+)*$')
);

-- Table: wbs_task_mapping
-- Tracks which WBS nodes have been published to which sprints
CREATE TABLE IF NOT EXISTS wbs_task_mapping (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wbs_node_id UUID NOT NULL REFERENCES wbs_nodes(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sprint_id UUID NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  
  published_at TIMESTAMP DEFAULT NOW(),
  published_by UUID NOT NULL,
  
  UNIQUE(wbs_node_id, task_id, sprint_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wbs_boards_project_id ON wbs_boards(project_id);
CREATE INDEX IF NOT EXISTS idx_wbs_lanes_board_id ON wbs_lanes(board_id);
CREATE INDEX IF NOT EXISTS idx_wbs_lanes_position ON wbs_lanes(board_id, position);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_board_id ON wbs_nodes(board_id);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_lane_id ON wbs_nodes(lane_id);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_parent_id ON wbs_nodes(parent_id);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_wbs_code ON wbs_nodes(board_id, wbs_code);
CREATE INDEX IF NOT EXISTS idx_wbs_nodes_position ON wbs_nodes(lane_id, position);
CREATE INDEX IF NOT EXISTS idx_wbs_task_mapping_wbs_node ON wbs_task_mapping(wbs_node_id);
CREATE INDEX IF NOT EXISTS idx_wbs_task_mapping_task ON wbs_task_mapping(task_id);

-- RLS Policies (if using Supabase)
ALTER TABLE wbs_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_lanes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE wbs_task_mapping ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see WBS for projects they have access to (via team/ownership)
-- (Specific policies depend on your auth/project structure)
