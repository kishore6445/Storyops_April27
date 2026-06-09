-- Run this in the Supabase SQL editor
-- Adds meeting_id to tasks so tasks created from a meeting are linked back to it

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS meeting_id uuid REFERENCES meetings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tasks_meeting_id_idx ON tasks(meeting_id);
