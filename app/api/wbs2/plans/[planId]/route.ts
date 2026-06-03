import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// GET /api/wbs2/plans/[planId] — fetch one plan with workstreams + nodes
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const db = getWbs2Supabase()

  const [planRes, wsRes, nodeRes] = await Promise.all([
    db.from("wbs2_plans").select("*").eq("id", planId).single(),
    db.from("wbs2_workstreams").select("*").eq("plan_id", planId).order("position"),
    db.from("wbs2_nodes").select("*").eq("plan_id", planId).order("position"),
  ])

  if (planRes.error) return NextResponse.json({ error: planRes.error.message }, { status: 500 })
  if (wsRes.error) return NextResponse.json({ error: wsRes.error.message }, { status: 500 })
  if (nodeRes.error) return NextResponse.json({ error: nodeRes.error.message }, { status: 500 })

  return NextResponse.json({
    plan: planRes.data,
    workstreams: wsRes.data,
    nodes: nodeRes.data,
  })
}

// PATCH /api/wbs2/plans/[planId] — update plan metadata
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const db = getWbs2Supabase()
  const body = await req.json()

  const { data, error } = await db
    .from("wbs2_plans")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/wbs2/plans/[planId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const db = getWbs2Supabase()
  const { error } = await db.from("wbs2_plans").delete().eq("id", planId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
