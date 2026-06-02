import { createClient } from "@supabase/supabase-js"
import { NextRequest, NextResponse } from "next/server"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user from token
    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await authClient.auth.getUser(token)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all projects for user's team(s)
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
      .eq("team_id", user.user_metadata?.team_id)
      .order("created_at", { ascending: false })

    if (error) throw error

    return NextResponse.json({ projects })
  } catch (error) {
    console.error("[v0] Error fetching projects:", error)
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get("authorization")?.split("Bearer ")[1]
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const authClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: { user } } = await authClient.auth.getUser(token)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name, description, goal } = await req.json()

    if (!name || !goal) {
      return NextResponse.json(
        { error: "Missing required fields: name, goal" },
        { status: 400 }
      )
    }

    // Create new project
    const { data: project, error } = await supabase
      .from("projects")
      .insert({
        team_id: user.user_metadata?.team_id,
        name,
        description,
        goal,
        owner_id: user.id,
        status: "planning",
        progress_percentage: 0,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ project }, { status: 201 })
  } catch (error) {
    console.error("[v0] Error creating project:", error)
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    )
  }
}
