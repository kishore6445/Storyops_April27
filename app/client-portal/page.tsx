"use client"

import useSWR from "swr"
import { AuthGuard } from "@/components/auth-guard"
import { RoleBasedLayout } from "@/components/role-based-layout"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Calendar,
  Users,
  Copy,
  Download,
  Share2,
  Loader2,
  Instagram,
  Linkedin,
  Youtube,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"

const fetcher = (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json())
}

function fmt(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", d: "numeric", year: "numeric" } as any)
}

function fmtShort(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function fmtDate(dateStr: string | null | undefined) {
  if (!dateStr) return "—"
  const d = new Date(dateStr)
  return d.toLocaleDateString("en-US", { month: "short", d: "numeric", year: "numeric" } as any) + " • " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
}

// ── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, string> = {
    "On Track": "bg-[#E6F9F0] text-[#12B76A] border border-[#A6F4C5]",
    "At Risk":  "bg-[#FFF4EC] text-[#F97316] border border-[#FED7AA]",
    Published:  "bg-[#E6F9F0] text-[#12B76A] border border-[#A6F4C5]",
    "In Review":"bg-[#FFF4EC] text-[#F97316] border border-[#FED7AA]",
    Draft:      "bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]",
  }
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", cfg[status] || "bg-[#F5F5F7] text-[#86868B]")}>
      {status}
    </span>
  )
}

// ── Deliverable type icon ─────────────────────────────────────────────────────
function TypeIcon({ type }: { type: string }) {
  const base = "w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
  if (type === "PDF")   return <div className={cn(base, "bg-[#FFF0F0] text-[#EF4444]")}>PDF</div>
  if (type === "Video") return <div className={cn(base, "bg-[#FFF0F0] text-[#EF4444]")}><Youtube className="w-4 h-4" /></div>
  if (type === "Image") return <div className={cn(base, "bg-[#FFF0F0] text-[#F97316]")}><Instagram className="w-4 h-4" /></div>
  return <div className={cn(base, "bg-[#F0F6FF] text-[#3B82F6]")}>F</div>
}

// ── Social row ────────────────────────────────────────────────────────────────
function SocialRow({
  icon,
  label,
  count,
  unit,
}: {
  icon: React.ReactNode
  label: string
  count: number
  unit: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F5F5F7] last:border-0">
      <div className="flex items-center gap-2.5">
        {icon}
        <span className="text-[13px] text-[#1D1D1F]">{label}</span>
      </div>
      <div className="flex items-center gap-1">
        <span className="text-[15px] font-bold text-[#1D1D1F]">{count}</span>
        <span className="text-[12px] text-[#86868B]">{unit}</span>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ClientPortalPage() {
  const { data, isLoading } = useSWR("/api/client-portal", fetcher, { revalidateOnFocus: false })

  if (isLoading) {
    return (
      <AuthGuard>
        <RoleBasedLayout userRole="client">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
          </div>
        </RoleBasedLayout>
      </AuthGuard>
    )
  }

  if (!data || data.error) {
    return (
      <AuthGuard>
        <RoleBasedLayout userRole="client">
          <div className="flex items-center justify-center h-64 text-[#86868B] text-sm">
            {data?.error === "No client account found for this user"
              ? "Your account is not linked to a client organization yet. Please contact your project manager."
              : "Unable to load portal data."}
          </div>
        </RoleBasedLayout>
      </AuthGuard>
    )
  }

  const {
    client,
    userName,
    currentSprint,
    nextSprint,
    completedTasks = [],
    inProgressTasks = [],
    delayedTasks = [],
    meetings = [],
    deliverables = [],
    socialCounts = {},
    team = {},
    project = {},
  } = data

  return (
    <AuthGuard>
      <RoleBasedLayout userRole="client">
        <div className="min-h-screen bg-[#F8F9FB] pb-10">
          <div className="max-w-[1100px] mx-auto px-6 pt-6">

            {/* ── Header ── */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-[22px] font-bold text-[#1D1D1F] flex items-center gap-2">
                  Welcome, {client?.name || userName}! <span>👋</span>
                </h1>
                <p className="text-[13px] text-[#86868B] mt-0.5">{"Here's what's happening with your project."}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D1D6] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
                  <Copy className="w-3.5 h-3.5 text-[#007AFF]" />
                  Copy Client Report
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D1D6] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
                  <Download className="w-3.5 h-3.5 text-[#EF4444]" />
                  Download PDF
                </button>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[#D1D1D6] bg-white text-[13px] font-medium text-[#1D1D1F] hover:bg-[#F5F5F7] transition-colors">
                  <Share2 className="w-3.5 h-3.5 text-[#12B76A]" />
                  Share
                </button>
              </div>
            </div>

            {/* ── Row 1: Current Sprint + Timeline ── */}
            <div className="grid grid-cols-5 gap-4 mb-4">
              {/* Current Sprint card */}
              <div className="col-span-3 bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[12px] font-medium text-[#86868B]">Current Sprint</span>
                  <StatusBadge status={currentSprint?.status || "On Track"} />
                </div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-[17px] font-bold text-[#1D1D1F]">
                    {currentSprint
                      ? `${currentSprint.name}: ${fmtShort(currentSprint.startDate)} – ${fmtShort(currentSprint.endDate)}`
                      : "No active sprint"}
                  </h2>
                  <span className="text-[13px] font-bold text-[#12B76A]">{currentSprint?.completionPct ?? 0}% Complete</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-[#E5E5E7] rounded-full mb-4">
                  <div
                    className="h-2 bg-[#12B76A] rounded-full transition-all"
                    style={{ width: `${currentSprint?.completionPct ?? 0}%` }}
                  />
                </div>
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Completed",   val: currentSprint?.completed ?? 0,  color: "text-[#1D1D1F]" },
                    { label: "In Progress", val: currentSprint?.inProgress ?? 0, color: "text-[#007AFF]" },
                    { label: "Pending",     val: currentSprint?.pending ?? 0,    color: "text-[#86868B]" },
                    { label: "Delayed",     val: currentSprint?.delayed ?? 0,    color: "text-[#EF4444]" },
                  ].map((s) => (
                    <div key={s.label}>
                      <div className={cn("text-[22px] font-bold", s.color)}>{s.val}</div>
                      <div className="text-[11px] text-[#86868B]">{s.label}</div>
                    </div>
                  ))}
                </div>
                <button className="flex items-center gap-1 text-[13px] font-semibold text-[#007AFF] hover:underline">
                  View Current Sprint <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Sprint Timeline card */}
              <div className="col-span-2 bg-white rounded-xl border border-[#E5E5E7] p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <Calendar className="w-4 h-4 text-[#007AFF]" />
                    <span className="text-[13px] font-semibold text-[#1D1D1F]">Sprint Timeline</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                      <div className="text-[11px] text-[#86868B] mb-1">Start Date</div>
                      <div className="text-[14px] font-bold text-[#1D1D1F]">{fmtShort(currentSprint?.startDate)}</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B] mb-1">End Date</div>
                      <div className="text-[14px] font-bold text-[#1D1D1F]">{fmtShort(currentSprint?.endDate)}</div>
                    </div>
                  </div>
                </div>
                <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#12B76A] flex-shrink-0" />
                  <div>
                    <div className="text-[13px] font-semibold text-[#1D1D1F]">
                      {currentSprint?.daysRemaining ?? 0} days remaining
                    </div>
                    <div className="text-[11px] text-[#86868B]">{"We're on track to deliver on time!"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Row 2: Done / In Progress / Needs Attention ── */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* What we've done */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-4 h-4 text-[#12B76A]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">What We&apos;ve Done This Sprint</span>
                </div>
                <div className="space-y-2">
                  {completedTasks.length === 0 && (
                    <p className="text-[12px] text-[#86868B]">No completed tasks yet</p>
                  )}
                  {completedTasks.slice(0, 6).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#12B76A] flex-shrink-0" />
                      <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
                    </div>
                  ))}
                </div>
                {completedTasks.length > 0 && (
                  <button className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline">
                    View All Completed Items <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* In Progress */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-[#F97316]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">In Progress</span>
                </div>
                <div className="space-y-2">
                  {inProgressTasks.length === 0 && (
                    <p className="text-[12px] text-[#86868B]">No tasks in progress</p>
                  )}
                  {inProgressTasks.slice(0, 6).map((t: any) => (
                    <div key={t.id} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-[#F97316] flex-shrink-0" />
                      <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
                    </div>
                  ))}
                </div>
                {inProgressTasks.length > 0 && (
                  <button className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline">
                    View All In Progress <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Needs Attention */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-4 h-4 text-[#EF4444]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">Needs Attention</span>
                </div>
                <div className="space-y-3">
                  {delayedTasks.length === 0 && (
                    <p className="text-[12px] text-[#86868B]">No delayed tasks</p>
                  )}
                  {delayedTasks.slice(0, 4).map((t: any) => (
                    <div key={t.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#EF4444] flex-shrink-0" />
                        <span className="text-[13px] font-semibold text-[#1D1D1F]">{t.title}</span>
                      </div>
                      <p className="text-[11px] text-[#86868B] ml-4">Reason: Past due date</p>
                    </div>
                  ))}
                </div>
                {delayedTasks.length > 0 && (
                  <button className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#EF4444] hover:underline">
                    View All Delayed Items <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* ── Row 3: Next Sprint Plan + Meetings + Social ── */}
            <div className="grid grid-cols-3 gap-4 mb-4">
              {/* Next Sprint Plan */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-[#7C3AED]" />
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">
                    Next Sprint Plan
                    {nextSprint && (
                      <span className="ml-1 font-normal text-[#86868B]">
                        ({fmtShort(nextSprint.startDate)} – {fmtShort(nextSprint.endDate)})
                      </span>
                    )}
                  </span>
                </div>
                {!nextSprint ? (
                  <p className="text-[12px] text-[#86868B]">No upcoming sprint planned</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {nextSprint.tasks.slice(0, 6).map((t: any) => (
                        <div key={t.id} className="flex items-center gap-2">
                          <div className="w-3.5 h-3.5 border border-[#D1D1D6] rounded flex-shrink-0" />
                          <span className="text-[13px] text-[#1D1D1F]">{t.title}</span>
                        </div>
                      ))}
                    </div>
                    <button className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline">
                      View Full Plan <ArrowRight className="w-3 h-3" />
                    </button>
                  </>
                )}
              </div>

              {/* Recent Meetings & MOMs */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#86868B]" />
                    <span className="text-[13px] font-semibold text-[#1D1D1F]">Recent Meetings &amp; MOMs</span>
                  </div>
                  <button className="flex items-center gap-0.5 text-[12px] text-[#007AFF] hover:underline font-medium">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {meetings.length === 0 && (
                  <p className="text-[12px] text-[#86868B]">No meetings recorded</p>
                )}
                <div className="space-y-3">
                  {meetings.slice(0, 3).map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between py-2 border-b border-[#F5F5F7] last:border-0">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <div className="w-7 h-7 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-[#86868B]" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-[#1D1D1F] truncate">{m.title}</div>
                          <div className="text-[11px] text-[#86868B]">
                            {fmtShort(m.date)}{m.time ? ` • ${m.time}` : ""}
                          </div>
                        </div>
                      </div>
                      <button className="ml-2 px-2.5 py-1 bg-[#F0F6FF] text-[#007AFF] text-[11px] font-semibold rounded-lg hover:bg-[#E0EDFF] flex-shrink-0">
                        View MOM
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Social Media This Sprint */}
              <div className="bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">Social Media This Sprint</span>
                  <button className="flex items-center gap-0.5 text-[12px] text-[#007AFF] hover:underline font-medium">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-gradient-to-br from-[#E1306C] to-[#F77737] flex items-center justify-center"><Instagram className="w-3.5 h-3.5 text-white" /></div>}
                  label="Instagram"
                  count={socialCounts.instagram ?? 0}
                  unit="Posts"
                />
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-[#0077B5] flex items-center justify-center"><Linkedin className="w-3.5 h-3.5 text-white" /></div>}
                  label="LinkedIn"
                  count={socialCounts.linkedin ?? 0}
                  unit="Posts"
                />
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-[#EF4444] flex items-center justify-center"><Youtube className="w-3.5 h-3.5 text-white" /></div>}
                  label="YouTube"
                  count={socialCounts.youtube ?? 0}
                  unit="Videos"
                />
                <SocialRow
                  icon={<div className="w-6 h-6 rounded bg-[#1D1D1F] flex items-center justify-center"><span className="text-white text-[9px] font-bold">R</span></div>}
                  label="Reels"
                  count={socialCounts.reels ?? 0}
                  unit="Reels"
                />
                <button className="flex items-center gap-1 mt-3 text-[12px] font-semibold text-[#007AFF] hover:underline">
                  View Creatives &amp; Captions <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* ── Row 4: Deliverables + Project Overview ── */}
            <div className="grid grid-cols-5 gap-4">
              {/* Latest Deliverables */}
              <div className="col-span-3 bg-white rounded-xl border border-[#E5E5E7] p-5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[14px] font-semibold text-[#1D1D1F]">Latest Deliverables</span>
                  <button className="flex items-center gap-0.5 text-[12px] text-[#007AFF] hover:underline font-medium">
                    View All <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                {deliverables.length === 0 ? (
                  <p className="text-[12px] text-[#86868B]">No deliverables uploaded yet for this sprint</p>
                ) : (
                  <>
                    <div className="grid grid-cols-4 pb-2 mb-1">
                      <span className="col-span-2 text-[11px] text-[#86868B] font-medium"></span>
                      <span className="text-[11px] text-[#86868B] font-medium">Type</span>
                      <span className="text-[11px] text-[#86868B] font-medium">Status</span>
                    </div>
                    <div className="space-y-1">
                      {deliverables.slice(0, 6).map((d: any) => (
                        <div key={d.id} className="grid grid-cols-4 items-center py-2.5 border-b border-[#F5F5F7] last:border-0">
                          <div className="col-span-2 flex items-center gap-2.5 min-w-0">
                            <TypeIcon type={d.type} />
                            <span className="text-[13px] text-[#1D1D1F] truncate">{d.name}</span>
                          </div>
                          <span className="text-[13px] text-[#86868B]">{d.type}</span>
                          <div className="flex items-center justify-between gap-2">
                            <StatusBadge status={d.status} />
                            <div className="flex items-center gap-1.5 text-[11px] text-[#86868B]">
                              <span>{fmtShort(d.date)}</span>
                              {d.url && (
                                <a href={d.url} target="_blank" rel="noopener noreferrer" className="hover:text-[#007AFF]">
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Project Overview */}
              <div className="col-span-2 bg-white rounded-xl border border-[#E5E5E7] p-5">
                <span className="text-[14px] font-semibold text-[#1D1D1F] block mb-4">Project Overview</span>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-4 h-4 text-[#86868B]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B]">Project Manager</div>
                      <div className="text-[13px] font-semibold text-[#1D1D1F]">{team.projectManager || "—"}</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Users className="w-4 h-4 text-[#86868B]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B]">Your Team</div>
                      <div className="text-[13px] font-semibold text-[#1D1D1F]">{team.memberCount ?? 0} Members</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-[#86868B]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B]">Project Duration</div>
                      <div className="text-[13px] font-semibold text-[#1D1D1F]">
                        {project.startDate && project.endDate
                          ? `${fmtShort(project.startDate)} – ${fmtShort(project.endDate)}`
                          : "—"}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-[#F5F5F7] rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Calendar className="w-4 h-4 text-[#86868B]" />
                    </div>
                    <div>
                      <div className="text-[11px] text-[#86868B]">Working Days</div>
                      <div className="text-[13px] font-semibold text-[#1D1D1F]">Mon – Sat</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </RoleBasedLayout>
    </AuthGuard>
  )
}
