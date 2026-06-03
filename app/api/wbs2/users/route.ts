import { NextResponse } from "next/server"
import { getWbs2Supabase } from "@/app/wbs2/lib/supabase"

// GET /api/wbs2/users — list all active users for assignment dropdown
export async function GET() {
  const db = getWbs2Supabase()
  const { data, error } = await db
    .from("users")
    .select("id, full_name, email")
    .eq("is_active", true)
    .order("full_name")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
