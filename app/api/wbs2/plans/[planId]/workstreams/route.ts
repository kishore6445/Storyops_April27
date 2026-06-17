import { NextRequest, NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// POST /api/wbs2/plans/[planId]/workstreams — add a workstream
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params
  const db = getWbs2Supabase()
  const body = await req.json()

  const { data, error } = await db
    .from("wbs2_workstreams")
    .insert({ plan_id: planId, ...body })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
