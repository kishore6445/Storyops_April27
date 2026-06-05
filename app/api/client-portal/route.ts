import { NextResponse } from "next/server"
import { getSupabaseAdminClient } from "@/lib/db"
import { getUserFromToken } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const user = await getUserFromToken(request)

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    if (user.role !== "client") {
      return NextResponse.json({ error: "Forbidden - Client access only" }, { status: 403 })
    }

    const supabase = getSupabaseAdminClient()

    // ── Fetch full user record for name ───────────────────────────────────
    const { data: userRecord } = await supabase
      .from("users")
      .select("id, full_name, email")
      .eq("id", user.id)
      .single()

    const userName: string = (userRecord as any)?.full_name || "User"

    // ── Client org ────────────────────────────────────────────────────────
    const { data: clientRow, error: clientError } = await supabase
      .from("clients")
      .select("id, name, description")
      .eq("user_id", user.id)
      .limit(1)
      .single()

    if (clientError || !clientRow) {
      return NextResponse.json({ error: "No client account found for this user" }, { status: 404 })
    }

    const clientId = (clientRow as any).id

    // ── Sprints ───────────────────────────────────────────────────────────
    const { data: allSprints } = await supabase
      .from("sprints")
      .select("id, name, start_date, end_date, status")
      .eq("client_id", clientId)
      .order("start_date", { ascending: false })

    const today = new Date()
    const sprints: any[] = allSprints || []

    const currentSprint = sprints.find((s) =>
      s.status === "active" ||
      (new Date(s.start_date) <= today && new Date(s.end_date) >= today)
    ) || sprints[0] || null

    const nextSprint = sprints.find((s) => new Date(s.start_date) > today) || null

    // ── Tasks for current sprint ──────────────────────────────────────────
    let sprintTasks: any[] = []
    let nextSprintTasks: any[] = []

    if (currentSprint) {
      const { data: t } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date, promised_date, assigned_to, phase")
        .eq("client_id", clientId)
        .eq("sprint_id", currentSprint.id)
      sprintTasks = t || []
    }

    if (nextSprint) {
      const { data: t } = await supabase
        .from("tasks")
        .select("id, title, status, priority, due_date")
        .eq("client_id", clientId)
        .eq("sprint_id", nextSprint.id)
      nextSprintTasks = t || []
    }

    const completedTasks  = sprintTasks.filter((t) => t.status === "done")
    const inProgressTasks = sprintTasks.filter((t) => t.status === "in_progress")
    const inReviewTasks   = sprintTasks.filter((t) => t.status === "in_review")
    const pendingTasks    = sprintTasks.filter((t) => t.status === "todo")
    const delayedTasks    = sprintTasks.filter((t) => {
      const deadline = t.promised_date || t.due_date
      if (!deadline) return false
      return new Date(deadline) < today && t.status !== "done"
    })
    // Needs attention = past-due + in_review
    const attentionTasks = [
      ...delayedTasks.map((t: any) => ({ ...t, reason: "Past due date" })),
      ...inReviewTasks.map((t: any) => ({ ...t, reason: "Awaiting content approval" })),
    ]

    const totalTasks = sprintTasks.length
    const completionPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0

    let daysRemaining = 0
    let sprintStatus = "On Track"
    if (currentSprint) {
      const end = new Date(currentSprint.end_date)
      daysRemaining = Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))
      if (delayedTasks.length > 0) sprintStatus = "At Risk"
    }

    // ── Meetings ──────────────────────────────────────────────────────────
    const { data: meetingsData } = await supabase
      .from("meetings")
      .select("id, title, date, time, status, summary")
      .eq("client_id", clientId)
      .order("date", { ascending: false })
      .limit(5)

    // ── Deliverables (task files from done tasks only) ────────────────────
    let deliverables: any[] = []
    if (completedTasks.length > 0) {
      const doneTaskIds = completedTasks.map((t: any) => t.id)
      const { data: files } = await supabase
        .from("task_files")
        .select("id, task_id, name, url, mime_type, uploaded_at, tasks(title, status)")
        .in("task_id", doneTaskIds)
        .order("uploaded_at", { ascending: false })
        .limit(8)

      deliverables = (files || []).map((f: any) => ({
        id: f.id,
        name: f.tasks?.title || f.name,
        fileName: f.name,
        type: f.mime_type?.includes("pdf") ? "PDF"
          : f.mime_type?.includes("video") ? "Video"
          : f.mime_type?.includes("image") ? "Image"
          : "File",
        status: f.tasks?.status === "done" ? "Published"
          : f.tasks?.status === "in_review" ? "In Review"
          : "Draft",
        date: f.uploaded_at,
        url: f.url,
      }))
    }

    // ── Team ──────────────────────────────────────────────────────────────
    const assigneeIds = [...new Set(sprintTasks.map((t) => t.assigned_to).filter(Boolean))] as string[]
    let team: any[] = []
    if (assigneeIds.length > 0) {
      const { data: teamData } = await supabase
        .from("users")
        .select("id, full_name, role")
        .in("id", assigneeIds)
      team = teamData || []
    }
    const projectManager = team.find((u) => u.role === "manager" || u.role === "admin") || team[0] || null

    // ── Social media counts ───────────────────────────────────────────────
    const socialCounts = {
      instagram: sprintTasks.filter((t) =>
        t.title?.toLowerCase().includes("instagram") || t.phase?.toLowerCase().includes("instagram")).length,
      linkedin: sprintTasks.filter((t) =>
        t.title?.toLowerCase().includes("linkedin") || t.phase?.toLowerCase().includes("linkedin")).length,
      youtube: sprintTasks.filter((t) =>
        t.title?.toLowerCase().includes("youtube") || t.phase?.toLowerCase().includes("youtube")).length,
      reels: sprintTasks.filter((t) =>
        t.title?.toLowerCase().includes("reel") || t.phase?.toLowerCase().includes("reel")).length,
    }

    // ── Project date range ────────────────────────────────────────────────
    const sortedAsc = [...sprints].sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    const sortedDesc = [...sprints].sort((a, b) => new Date(b.end_date).getTime() - new Date(a.end_date).getTime())

    return NextResponse.json({
      client: { id: (clientRow as any).id, name: (clientRow as any).name },
      userName,
      currentSprint: currentSprint ? {
        id: currentSprint.id,
        name: currentSprint.name,
        startDate: currentSprint.start_date,
        endDate: currentSprint.end_date,
        status: sprintStatus,
        completionPct,
        daysRemaining,
        completed: completedTasks.length,
        inProgress: inProgressTasks.length,
        pending: pendingTasks.length,
        delayed: delayedTasks.length,
      } : null,
      nextSprint: nextSprint ? {
        name: nextSprint.name,
        startDate: nextSprint.start_date,
        endDate: nextSprint.end_date,
        tasks: nextSprintTasks.map((t) => ({ id: t.id, title: t.title })),
      } : null,
      completedTasks: completedTasks.map((t: any) => ({ id: t.id, title: t.title })),
      inProgressTasks: inProgressTasks.map((t: any) => ({ id: t.id, title: t.title })),
      delayedTasks: delayedTasks.map((t: any) => ({ id: t.id, title: t.title })),
      attentionTasks: attentionTasks.map((t: any) => ({ id: t.id, title: t.title, reason: t.reason })),
      meetings: (meetingsData || []).map((m: any) => ({
        id: m.id,
        title: m.title || "Team Meeting",
        date: m.date,
        time: m.time || "",
      })),
      deliverables,
      socialCounts,
      team: {
        projectManager: projectManager?.full_name || "—",
        memberCount: team.length,
      },
      project: {
        startDate: sortedAsc[0]?.start_date || null,
        endDate: sortedDesc[0]?.end_date || null,
      },
    })
  } catch (error: any) {
    console.error("[v0] Error in client-portal GET:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
