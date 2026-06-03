import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// GET /api/wbs2/my-tasks?assignee=<name>
// Returns all wbs2_nodes assigned to the given user, joined with plan info
export async function GET(req: NextRequest) {
  const assignee = req.nextUrl.searchParams.get("assignee")
  if (!assignee) return NextResponse.json({ error: "assignee param required" }, { status: 400 })

  const db = getWbs2Supabase()
  const { data, error } = await db
    .from("wbs2_nodes")
    .select(`
      id,
      plan_id,
      workstream_id,
      parent_id,
      code,
      title,
      type,
      description,
      assignee,
      status,
      priority,
      sprint,
      client_promised_date,
      internal_due_date,
      updated_at,
      wbs2_plans ( client_name, wbs_name ),
      wbs2_workstreams ( name )
    `)
    .eq("assignee", assignee)
    .order("updated_at", { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(Array.isArray(data) ? data : [])
}

// PATCH /api/wbs2/my-tasks?nodeId=<id>
// Updates the status of a single node
export async function PATCH(req: NextRequest) {
  const nodeId = req.nextUrl.searchParams.get("nodeId")
  if (!nodeId) return NextResponse.json({ error: "nodeId param required" }, { status: 400 })

  const db = getWbs2Supabase()
  const body = await req.json()

  const { data, error } = await db
    .from("wbs2_nodes")
    .update({ status: body.status, updated_at: new Date().toISOString() })
    .eq("id", nodeId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
