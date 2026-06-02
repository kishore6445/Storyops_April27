import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function PATCH(
  req: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const updates = await req.json()

    // Track if assignee changed
    if (updates.assignee_id && !updates.auto_assigned_at) {
      updates.auto_assigned_at = new Date().toISOString()
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.taskId)
      .eq("project_id", params.projectId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ task })
  } catch (error) {
    console.error("[v0] Error updating task:", error)
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { projectId: string; taskId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", params.taskId)
      .eq("project_id", params.projectId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting task:", error)
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    )
  }
}
