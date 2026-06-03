import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// POST /api/wbs2/plans/[planId]/nodes — create a node
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const db = getWbs2Supabase()
  const body = await req.json()

  // Normalise optional date fields: empty string → null
  const insert = {
    plan_id: planId,
    workstream_id: body.workstream_id,
    parent_id: body.parent_id || null,
    code: body.code,
    title: body.title ?? "New Task",
    type: body.type ?? "Task",
    description: body.description ?? "",
    assignee: body.assignee ?? "Unassigned",
    status: body.status ?? "Not Started",
    priority: body.priority ?? "Medium",
    sprint: body.sprint ?? "Unassigned",
    client_promised_date: body.client_promised_date || null,
    internal_due_date: body.internal_due_date || null,
    position: body.position ?? 0,
  }

  const { data, error } = await db
    .from("wbs2_nodes")
    .insert(insert)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
