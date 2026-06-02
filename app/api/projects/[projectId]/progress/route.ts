import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface TaskProgress {
  wbs_code: string
  progress: number
  status: string
}

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all tasks for the project
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", params.projectId)

    if (error) throw error

    const taskProgress: TaskProgress[] = []
    let totalProgress = 0

    // Calculate progress for each task
    tasks?.forEach((task) => {
      if (task.wbs_code) {
        taskProgress.push({
          wbs_code: task.wbs_code,
          progress: task.progress_percentage || 0,
          status: task.status || "to-do",
        })
        totalProgress += task.progress_percentage || 0
      }
    })

    // Calculate average progress
    const projectProgress = tasks && tasks.length > 0 
      ? Math.round(totalProgress / tasks.length)
      : 0

    // Update project progress
    await supabase
      .from("projects")
      .update({
        progress_percentage: projectProgress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.projectId)

    return NextResponse.json({
      project_progress: projectProgress,
      tasks: taskProgress,
      total_tasks: tasks?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error calculating progress:", error)
    return NextResponse.json(
      { error: "Failed to calculate progress" },
      { status: 500 }
    )
  }
}

// POST endpoint to recalculate and sync progress
export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Same as GET - recalculate progress
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("project_id", params.projectId)

    if (error) throw error

    let totalProgress = 0
    tasks?.forEach((task) => {
      totalProgress += task.progress_percentage || 0
    })

    const projectProgress = tasks && tasks.length > 0 
      ? Math.round(totalProgress / tasks.length)
      : 0

    await supabase
      .from("projects")
      .update({
        progress_percentage: projectProgress,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.projectId)

    return NextResponse.json({
      success: true,
      project_progress: projectProgress,
      total_tasks: tasks?.length || 0,
    })
  } catch (error) {
    console.error("[v0] Error recalculating progress:", error)
    return NextResponse.json(
      { error: "Failed to recalculate progress" },
      { status: 500 }
    )
  }
}
