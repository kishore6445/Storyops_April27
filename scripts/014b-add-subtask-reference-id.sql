-- Add reference_id column for subtasks and populate existing rows
ALTER TABLE task_subtasks
  ADD COLUMN IF NOT EXISTS reference_id TEXT;

UPDATE task_subtasks AS s
SET reference_id = generated.generated_reference_id
FROM (
  SELECT
    sub.id,
    CONCAT(
      COALESCE(t.task_id, 'TASK'),
      '_Subtask',
      ROW_NUMBER() OVER (PARTITION BY sub.task_id ORDER BY sub.created_at)
    ) AS generated_reference_id
  FROM task_subtasks sub
  LEFT JOIN tasks t ON t.id = sub.task_id
) AS generated
WHERE s.id = generated.id
  AND s.reference_id IS NULL;
