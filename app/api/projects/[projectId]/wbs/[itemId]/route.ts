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

    const { title, description, status, priority, assignee_id, sprint_id, due_date, estimated_hours, progress_percentage } =
      await request.json()

    const supabase = getSupabaseAdminClient()

    // Verify WBS item exists and belongs to project
    const { data: item, error: itemError } = await supabase
      .from("wbs_items")
      .select("*")
      .eq("id", params.itemId)
      .eq("project_id", params.projectId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: "WBS item not found" }, { status: 404 })
    }

    // Update WBS item
    const { data: updatedItem, error } = await supabase
      .from("wbs_items")
      .update({
        title: title ?? item.title,
        description: description ?? item.description,
        status: status ?? item.status,
        priority: priority ?? item.priority,
        assignee_id: assignee_id ?? item.assignee_id,
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

    // Auto-create task if assignee and sprint are provided together
    const newAssigneeId = assignee_id ?? item.assignee_id
    const newSprintId = sprint_id ?? item.sprint_id

    if (newAssigneeId && newSprintId && !item.linked_task_id) {
      // Create new task
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .insert({
          sprint_id: newSprintId,
          title: title ?? item.title,
          assigned_to: newAssigneeId,
          due_date: due_date ?? item.due_date,
          priority: priority ?? item.priority,
          estimated_hours: estimated_hours ?? item.estimated_hours,
          status: "to-do",
          progress_percentage: 0,
        })
        .select()
        .single()

      if (!taskError && task) {
        // Link the task to WBS item
        await supabase
          .from("wbs_items")
          .update({ linked_task_id: task.id })
          .eq("id", params.itemId)

        // Update the response to include linked task info
        updatedItem.linked_task_id = task.id
      }
    }

    // If linked task exists and properties changed, update it
    if (item.linked_task_id) {
      const taskUpdates: any = {}
      if (title && title !== item.title) taskUpdates.title = title
      if (status) taskUpdates.status = status === "completed" ? "done" : status === "in-progress" ? "in-progress" : "to-do"
      if (assignee_id) taskUpdates.assigned_to = assignee_id
      if (due_date) taskUpdates.due_date = due_date
      if (estimated_hours !== undefined) taskUpdates.estimated_hours = estimated_hours
      if (progress_percentage !== undefined) taskUpdates.progress_percentage = progress_percentage

      if (Object.keys(taskUpdates).length > 0) {
        await supabase
          .from("tasks")
          .update(taskUpdates)
          .eq("id", item.linked_task_id)
      }
    }

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

    // Verify WBS item exists
    const { data: item, error: itemError } = await supabase
      .from("wbs_items")
      .select("*")
      .eq("id", params.itemId)
      .eq("project_id", params.projectId)
      .single()

    if (itemError || !item) {
      return NextResponse.json({ error: "WBS item not found" }, { status: 404 })
    }

    // Delete linked task if exists
    if (item.linked_task_id) {
      await supabase
        .from("tasks")
        .delete()
        .eq("id", item.linked_task_id)
    }

    // Delete WBS item (cascade delete children)
    const { error } = await supabase
      .from("wbs_items")
      .delete()
      .eq("id", params.itemId)

    if (error) throw error

    return NextResponse.json({ success: true, message: "WBS item deleted" })
  } catch (error) {
    console.error("[v0] Error deleting WBS item:", error)
    return NextResponse.json({ error: "Failed to delete WBS item" }, { status: 500 })
  }
}
