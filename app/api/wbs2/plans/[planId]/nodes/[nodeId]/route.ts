import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// PATCH /api/wbs2/plans/[planId]/nodes/[nodeId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; nodeId: string }> }
) {
  const { nodeId } = await params
  const db = getWbs2Supabase()
  const body = await req.json()

  // Normalise optional date fields: empty string → null
  const patch: Record<string, unknown> = { ...body, updated_at: new Date().toISOString() }
  if (patch.client_promised_date === "") patch.client_promised_date = null
  if (patch.internal_due_date === "") patch.internal_due_date = null

  const { data, error } = await db
    .from("wbs2_nodes")
    .update(patch)
    .eq("id", nodeId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/wbs2/plans/[planId]/nodes/[nodeId]
// Cascades to children via ON DELETE CASCADE
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string; nodeId: string }> }
) {
  const { nodeId } = await params
  const db = getWbs2Supabase()
  const { error } = await db.from("wbs2_nodes").delete().eq("id", nodeId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
