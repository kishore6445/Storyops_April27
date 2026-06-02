import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

function matchesPattern(wbs_code: string, pattern: string): boolean {
  const regex = pattern.replace(/\*/g, ".*").replace(/\./g, "\\.")
  return new RegExp(`^${regex}$`).test(wbs_code)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all assignment rules for this project
    const { data: rules, error: rulesError } = await supabase
      .from("wbs_assignments")
      .select("*")
      .eq("project_id", params.projectId)
      .eq("auto_assign_enabled", true)

    if (rulesError) throw rulesError

    // Get all tasks for this project
    const { data: tasks, error: tasksError } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", params.projectId)

    if (tasksError) throw tasksError

    let assignedCount = 0
    const updates: any[] = []

    // For each task, check if it matches any rule
    tasks?.forEach((task) => {
      if (!task.wbs_code || task.assignee_id) return // Skip if no wbs_code or already assigned

      for (const rule of rules || []) {
        if (matchesPattern(task.wbs_code, rule.wbs_code_pattern)) {
          updates.push({
            id: task.id,
            assignee_id: rule.assignee_id,
            auto_assigned_at: new Date().toISOString(),
          })
          assignedCount++
          break
        }
      }
    })

    // Apply updates in batch
    if (updates.length > 0) {
      for (const update of updates) {
        await supabase
          .from("tasks")
          .update({
            assignee_id: update.assignee_id,
            auto_assigned_at: update.auto_assigned_at,
            updated_at: new Date().toISOString(),
          })
          .eq("id", update.id)
      }
    }

    return NextResponse.json({ 
      success: true, 
      assigned_count: assignedCount 
    })
  } catch (error) {
    console.error("[v0] Error applying assignment rules:", error)
    return NextResponse.json(
      { error: "Failed to apply rules" },
      { status: 500 }
    )
  }
}
