import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const sessionToken = authHeader?.replace("Bearer ", "") || request.cookies.get("session")?.value

    if (!sessionToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const session = await validateSession(sessionToken)
    if (!session) {
      return NextResponse.json({ error: "Invalid session" }, { status: 401 })
    }

    const supabase = getSupabaseAdminClient()

    const { data: tasks, error } = await supabase
      .from("tasks")
      .select(`
        id,
        task_id,
        title,
        description,
        status,
        priority,
        due_date,
        due_time,
        promised_date,
        promised_time,
        assigned_to,
        sprint_id,
        client_id,
        section_id,
        phase,
        created_at,
        clients (
          id,
          name
        )
      `)
      .not("status", "eq", "done")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("[v0] Error fetching backlog tasks:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Enrich with assignee names
    const assigneeIds = [...new Set((tasks || []).map((t: any) => t.assigned_to).filter(Boolean))] as string[]
    const usersMap: Record<string, { id: string; full_name: string; email: string }> = {}
    if (assigneeIds.length > 0) {
      const { data: usersRows } = await supabase
        .from("users")
        .select("id, full_name, email")
        .in("id", assigneeIds)
      if (usersRows) {
        for (const u of usersRows as { id: string; full_name: string; email: string }[]) usersMap[u.id] = u
      }
    }

    // Enrich with sprint names
    const sprintIds = [...new Set((tasks || []).map((t: any) => t.sprint_id).filter(Boolean))] as string[]
    const sprintsMap: Record<string, { id: string; name: string }> = {}
    if (sprintIds.length > 0) {
      const { data: sprintRows } = await supabase
        .from("sprints")
        .select("id, name")
        .in("id", sprintIds)
      if (sprintRows) {
        for (const s of sprintRows as { id: string; name: string }[]) sprintsMap[s.id] = s
      }
    }

    const enriched = (tasks || []).map((t: any) => ({
      ...t,
      assignee: t.assigned_to ? (usersMap[t.assigned_to] || null) : null,
      sprint: t.sprint_id ? (sprintsMap[t.sprint_id] || null) : null,
    }))

    return NextResponse.json({ tasks: enriched })
  } catch (error: any) {
    console.error("[v0] Error in backlog GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization")
    const sessionToken = authHeader?.replace("Bearer ", "") || request.cookies.get("session")?.value
    if (!sessionToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const session = await validateSession(sessionToken)
    if (!session) return NextResponse.json({ error: "Invalid session" }, { status: 401 })

    const body: Record<string, any> = await request.json()
    const { taskId, ...updates } = body
    if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 })

    const supabase = getSupabaseAdminClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("tasks")
      .update(updates)
      .eq("id", taskId)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ task: data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
