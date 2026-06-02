import { NextRequest, NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { validateSession } from "@/lib/auth"

export async function PUT(
  request: NextRequest,
  { params }: { params: { projectId: string; itemId: string } }
) {
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

    const { title, description, status, priority, assigned_to, sprint_id, due_date, estimated_hours, progress_percentage } =
      await request.json()

    const supabase = getSupabaseAdminClient()

    // Verify task exists and belongs to project
    const { data: item, error: itemError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", params.itemId)
      .eq("project_id", params.projectId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: "WBS item not found" }, { status: 404 })
    }

    // Update WBS item
    const { data: updatedItem, error } = await supabase
      .from("tasks")
      .update({
        title: title ?? item.title,
        description: description ?? item.description,
        status: status ?? item.status,
        priority: priority ?? item.priority,
        assigned_to: assigned_to ?? item.assigned_to,
        sprint_id: sprint_id ?? item.sprint_id,
        due_date: due_date ?? item.due_date,
        estimated_hours: estimated_hours ?? item.estimated_hours,
        progress_percentage: progress_percentage ?? item.progress_percentage,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.itemId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item: updatedItem, success: true })
  } catch (error) {
    console.error("[v0] Error updating WBS item:", error)
    return NextResponse.json({ error: "Failed to update WBS item" }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { projectId: string; itemId: string } }
) {
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

    // Verify task exists
    const { data: item, error: itemError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", params.itemId)
      .eq("project_id", params.projectId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: "WBS item not found" }, { status: 404 })
    }

    // Delete all child items first
    await supabase.from("tasks").delete().eq("parent_id", params.itemId)

    // Delete the item
    const { error } = await supabase.from("tasks").delete().eq("id", params.itemId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error deleting WBS item:", error)
    return NextResponse.json({ error: "Failed to delete WBS item" }, { status: 500 })
  }
}
