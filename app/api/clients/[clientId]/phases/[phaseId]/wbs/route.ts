"use server"

import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
)

export async function GET(
  request: NextRequest,
  { params }: { params: { clientId: string; phaseId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch main tasks for the phase (parent_task_id is null)
    const { data: tasks, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("phase_id", params.phaseId)
      .eq("client_id", params.clientId)
      .is("parent_task_id", null)
      .order("created_at", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching WBS tasks:", error)
      throw error
    }

    // For each main task, fetch its subtasks
    const tasksWithSubtasks = await Promise.all(
      tasks.map(async (task) => {
        const { data: subtasks } = await supabase
          .from("tasks")
          .select("*")
          .eq("parent_task_id", task.id)
          .order("created_at", { ascending: true })

        return {
          ...task,
          subtasks: subtasks || [],
        }
      })
    )

    return NextResponse.json({ tasks: tasksWithSubtasks })
  } catch (error) {
    console.error("[v0] Error fetching WBS:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clientId: string; phaseId: string } }
) {
  try {
    const authHeader = request.headers.get("authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, assigned_to, due_date, promised_date } = body

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 })
    }

    // Get the next WBS code (1, 2, 3, etc.)
    const { data: existingTasks } = await supabase
      .from("tasks")
      .select("wbs_code")
      .eq("phase_id", params.phaseId)
      .eq("client_id", params.clientId)
      .is("parent_task_id", null)

    const nextCode = (existingTasks?.length || 0) + 1
    const wbsCode = String(nextCode)

    // Create the task
    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        client_id: params.clientId,
        phase_id: params.phaseId,
        title,
        assigned_to,
        due_date,
        promised_date,
        wbs_code: wbsCode,
        status: "to-do",
        progress_percentage: 0,
      })
      .select()
      .single()

    if (error) {
      console.error("[v0] Error creating task:", error)
      throw error
    }

    return NextResponse.json({ task }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating WBS task:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
