import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// PATCH /api/wbs2/plans/[planId]/workstreams/[wsId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; wsId: string }> }
) {
  const { wsId } = await params
  const db = getWbs2Supabase()
  const body = await req.json()

  const { data, error } = await db
    .from("wbs2_workstreams")
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq("id", wsId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/wbs2/plans/[planId]/workstreams/[wsId]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ planId: string; wsId: string }> }
) {
  const { wsId } = await params
  const db = getWbs2Supabase()
  const { error } = await db.from("wbs2_workstreams").delete().eq("id", wsId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
