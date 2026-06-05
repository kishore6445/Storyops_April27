"use client"

import { useState, useMemo } from "react"
import useSWR from "swr"
import {
  Plus,
  ChevronRight,
  ChevronDown,
  X,
  Flag,
  Calendar,
  User,
  Users,
  CheckCircle2,
  LayoutGrid,
  Search,
  SlidersHorizontal,
  Package,
  CheckSquare,
  Loader2,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────
interface BacklogTask {
  id: string
  task_id: string
  title: string
  description?: string
  status: string
  priority: "low" | "medium" | "high"
  due_date?: string
  due_time?: string
  promised_date?: string
  promised_time?: string
  assigned_to?: string
  sprint_id?: string
  client_id?: string
  phase?: string
  assignee?: { id: string; full_name: string; email: string } | null
  sprint?: { id: string; name: string } | null
  clients?: { id: string; name: string } | null
}

// ─── Config ───────────────────────────────────────────────────────────────────
const PRIORITY_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  high:   { label: "High",   color: "text-[#FF3B30] bg-[#FFF1F0] border border-[#FFCCC7]", dot: "bg-[#FF3B30]" },
  medium: { label: "Medium", color: "text-[#FF9500] bg-[#FFF8ED] border border-[#FFE0A3]", dot: "bg-[#FF9500]" },
  low:    { label: "Low",    color: "text-[#34C759] bg-[#F0FFF4] border border-[#B7EACB]", dot: "bg-[#34C759]" },
}

const fetcher = (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json())
}

function formatDate(d?: string) {
  if (!d) return ""
  try {
    return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return d
  }
}

function formatDateTime(date?: string, time?: string) {
  const d = date ? formatDate(date) : ""
  if (!time) return d
  try {
    const [h, m] = time.split(":").map(Number)
    const ampm = h >= 12 ? "PM" : "AM"
    const hour = h % 12 || 12
    return d ? `${d}   ${hour}:${String(m).padStart(2, "0")} ${ampm}` : `${hour}:${String(m).padStart(2, "0")} ${ampm}`
  } catch {
    return d
  }
}

function bufferDays(promisedDate?: string) {
  if (!promisedDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const pd = new Date(promisedDate)
  pd.setHours(0, 0, 0, 0)
  return Math.round((pd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

// ─── Task Card ────────────────────────────────────────────────────────────────
function TaskCard({
  task,
  selected,
  onSelect,
  onClick,
  actionLabel,
  onAction,
}: {
  task: BacklogTask
  selected: boolean
  onSelect: (id: string) => void
  onClick: (task: BacklogTask) => void
  actionLabel: string
  onAction: (task: BacklogTask, e: React.MouseEvent) => void
}) {
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low
  const clientName = (task.clients as any)?.name || ""

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2 bg-white border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-md",
        selected ? "border-[#007AFF] ring-1 ring-[#007AFF]" : "border-[#E5E5E7]"
      )}
      style={{ minWidth: 0 }}
      onClick={() => onClick(task)}
    >
      {/* Checkbox */}
      <div
        className="absolute top-3 left-3"
        onClick={(e) => { e.stopPropagation(); onSelect(task.id) }}
      >
        <div
          className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
            selected ? "bg-[#007AFF] border-[#007AFF]" : "border-[#D1D5DB] bg-white"
          )}
        >
          {selected && <svg width="9" height="7" viewBox="0 0 9 7" fill="none"><path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
        </div>
      </div>

      {/* Priority badge */}
      <div className="pl-6 flex items-center gap-2">
        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", p.color)}>{p.label}</span>
      </div>

      {/* Title */}
      <div className="pl-6">
        <p className="text-sm font-semibold text-[#1D1D1F] leading-snug line-clamp-2">{task.title}</p>
      </div>

      {/* Client */}
      {clientName && (
        <div className="pl-6 flex items-center gap-1.5">
          <LayoutGrid className="w-3.5 h-3.5 text-[#86868B] flex-shrink-0" />
          <span className="text-[12px] text-[#86868B] truncate">{clientName}</span>
        </div>
      )}

      {/* Due date */}
      {(task.due_date || task.promised_date) && (
        <div className="pl-6 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#86868B] flex-shrink-0" />
          <span className="text-[12px] text-[#86868B]">
            Due: {formatDate(task.due_date || task.promised_date)}
          </span>
        </div>
      )}

      {/* Assignee row */}
      <div className="pl-6 flex items-center justify-between mt-1">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-[#86868B] flex-shrink-0" />
          {task.assignee ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-[#007AFF] flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0">
                {(task.assignee.full_name || task.assignee.email || "?")[0].toUpperCase()}
              </div>
              <span className="text-[12px] text-[#86868B]">{task.assignee.full_name || task.assignee.email}</span>
            </div>
          ) : (
            <span className="text-[12px] text-[#86868B]">No Assignee</span>
          )}
        </div>
        {!task.assignee && (
          <button
            className="text-[12px] font-semibold text-[#007AFF] hover:underline"
            onClick={(e) => { e.stopPropagation(); onAction(task, e) }}
          >
            {actionLabel === "Assign Sprint" ? "" : "Assign"}
          </button>
        )}
      </div>

      {/* Action button */}
      <button
        className="mt-1 text-[12px] font-semibold text-[#007AFF] text-center hover:underline w-full"
        onClick={(e) => { e.stopPropagation(); onAction(task, e) }}
      >
        {actionLabel}
      </button>
    </div>
  )
}

// ─── Section Row ──────────────────────────────────────────────────────────────
function SectionRow({
  icon,
  iconBg,
  title,
  count,
  subtitle,
  tasks,
  selectedIds,
  onSelect,
  onCardClick,
  actionLabel,
  onAction,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  count: number
  subtitle: string
  tasks: BacklogTask[]
  selectedIds: Set<string>
  onSelect: (id: string) => void
  onCardClick: (task: BacklogTask) => void
  actionLabel: string
  onAction: (task: BacklogTask, e: React.MouseEvent) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const visible = tasks.slice(0, 4)
  const hasMore = tasks.length > 4

  return (
    <div className="mb-6">
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", iconBg)}>
            {icon}
          </div>
          <div>
            <span className="text-[13px] font-bold text-[#1D1D1F] uppercase tracking-wide">{title}</span>
            <span className="ml-2 text-[13px] font-bold text-[#1D1D1F]">({count})</span>
          </div>
          <span className="text-[12px] text-[#86868B] ml-1">{subtitle}</span>
        </div>
        <button className="flex items-center gap-1 text-[12px] font-semibold text-[#007AFF] hover:underline">
          View all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards grid */}
      <div className="relative">
        <div className="grid grid-cols-4 gap-3">
          {visible.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              selected={selectedIds.has(task.id)}
              onSelect={onSelect}
              onClick={onCardClick}
              actionLabel={actionLabel}
              onAction={onAction}
            />
          ))}
          {/* Empty fill slots */}
          {visible.length < 4 && Array.from({ length: 4 - visible.length }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
        </div>
        {hasMore && (
          <button className="absolute right-0 top-1/2 -translate-y-1/2 -mr-4 w-8 h-8 bg-white border border-[#E5E5E7] rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-shadow">
            <ChevronRight className="w-4 h-4 text-[#1D1D1F]" />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────
function DetailPanel({
  task,
  sprints,
  users,
  onClose,
  onSave,
}: {
  task: BacklogTask
  sprints: { id: string; name: string }[]
  users: { id: string; full_name: string; email: string }[]
  onClose: () => void
  onSave: (taskId: string, updates: Record<string, any>) => Promise<void>
}) {
  const p = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.low
  const clientName = (task.clients as any)?.name || ""
  const [assigneeId, setAssigneeId] = useState(task.assigned_to || "")
  const [sprintId, setSprintId] = useState(task.sprint_id || "")
  const [priority, setPriority] = useState(task.priority || "medium")
  const [internalDate, setInternalDate] = useState(task.due_date || "")
  const [internalTime, setInternalTime] = useState(task.due_time || "17:00")
  const [promisedDate, setPromisedDate] = useState(task.promised_date || "")
  const [promisedTime, setPromisedTime] = useState(task.promised_time || "17:00")
  const [saving, setSaving] = useState(false)

  const buf = bufferDays(promisedDate || task.promised_date)
  const isOnTrack = buf !== null && buf >= 0

  const handleSave = async () => {
    setSaving(true)
    await onSave(task.id, {
      assigned_to: assigneeId || null,
      sprint_id: sprintId || null,
      priority,
      due_date: internalDate || null,
      due_time: internalTime || null,
      promised_date: promisedDate || null,
      promised_time: promisedTime || null,
    })
    setSaving(false)
  }

  function formatTimeValue(t: string) {
    if (!t) return ""
    try {
      const [h, m] = t.split(":").map(Number)
      const ampm = h >= 12 ? "PM" : "AM"
      const hour = h % 12 || 12
      return `${hour}:${String(m).padStart(2, "0")} ${ampm}`
    } catch { return t }
  }

  return (
    <div className="fixed top-0 right-0 h-full w-[340px] bg-white border-l border-[#E5E5E7] shadow-2xl z-40 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-[#E5E5E7]">
        <h2 className="text-[15px] font-bold text-[#1D1D1F] leading-snug pr-4">{task.title}</h2>
        <button onClick={onClose} className="p-1.5 hover:bg-[#F5F5F7] rounded-lg transition-colors flex-shrink-0">
          <X className="w-4 h-4 text-[#86868B]" />
        </button>
      </div>

      {/* Badges */}
      <div className="px-5 pt-3 pb-2 flex items-center gap-2 flex-wrap">
        <span className={cn("flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full", p.color)}>
          <Flag className="w-3 h-3" /> {p.label}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F7] text-[#86868B] border border-[#E5E5E7]">
          Backlog
        </span>
      </div>

      <div className="px-5 py-4 space-y-5 flex-1">
        {/* Client */}
        {clientName && (
          <div>
            <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Client</p>
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#F5F5F7] rounded flex items-center justify-center">
                <LayoutGrid className="w-3 h-3 text-[#86868B]" />
              </div>
              <span className="text-[13px] font-medium text-[#1D1D1F]">{clientName}</span>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Description</p>
          <p className="text-[13px] text-[#1D1D1F] leading-relaxed line-clamp-3">
            {task.description || "No description provided."}
          </p>
          {task.description && task.description.length > 80 && (
            <button className="text-[12px] text-[#007AFF] font-semibold mt-1 hover:underline">View more</button>
          )}
        </div>

        {/* Assignee */}
        <div>
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Assignee</p>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full text-[13px] border border-[#E5E5E7] rounded-lg px-3 py-2 bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none"
          >
            <option value="">Select assignee</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
            ))}
          </select>
        </div>

        {/* Sprint */}
        <div>
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Sprint</p>
          <select
            value={sprintId}
            onChange={(e) => setSprintId(e.target.value)}
            className="w-full text-[13px] border border-[#E5E5E7] rounded-lg px-3 py-2 bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none"
          >
            <option value="">Select sprint</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Priority */}
        <div>
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Priority</p>
          <div className="relative">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full text-[13px] border border-[#E5E5E7] rounded-lg px-3 py-2 bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none pl-7"
            >
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <Flag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#FF3B30] pointer-events-none" />
          </div>
        </div>

        {/* Internal Due Date */}
        <div>
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Internal Due Date</p>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 border border-[#E5E5E7] rounded-lg px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-[#86868B] flex-shrink-0" />
              <input
                type="date"
                value={internalDate}
                onChange={(e) => setInternalDate(e.target.value)}
                className="text-[13px] text-[#1D1D1F] bg-transparent w-full focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 border border-[#E5E5E7] rounded-lg px-3 py-2 w-[110px]">
              <input
                type="time"
                value={internalTime}
                onChange={(e) => setInternalTime(e.target.value)}
                className="text-[13px] text-[#1D1D1F] bg-transparent w-full focus:outline-none"
              />
            </div>
          </div>
          {internalDate && (
            <p className="text-[12px] text-[#86868B] mt-1 ml-1">
              {formatDateTime(internalDate, internalTime)}
            </p>
          )}
        </div>

        {/* Client Promise Date */}
        <div>
          <p className="text-[11px] font-semibold text-[#86868B] uppercase tracking-wider mb-1.5">Client Promise Date</p>
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 border border-[#E5E5E7] rounded-lg px-3 py-2">
              <Calendar className="w-3.5 h-3.5 text-[#86868B] flex-shrink-0" />
              <input
                type="date"
                value={promisedDate}
                onChange={(e) => setPromisedDate(e.target.value)}
                className="text-[13px] text-[#1D1D1F] bg-transparent w-full focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 border border-[#E5E5E7] rounded-lg px-3 py-2 w-[110px]">
              <input
                type="time"
                value={promisedTime}
                onChange={(e) => setPromisedTime(e.target.value)}
                className="text-[13px] text-[#1D1D1F] bg-transparent w-full focus:outline-none"
              />
            </div>
          </div>
          {promisedDate && (
            <p className="text-[12px] text-[#86868B] mt-1 ml-1">
              {formatDateTime(promisedDate, promisedTime)}
            </p>
          )}
        </div>

        {/* Task Health */}
        <div className="border border-[#E5E5E7] rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#34C759]" />
            <span className="text-[13px] font-bold text-[#1D1D1F]">Task Health</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className={cn("text-[13px] font-bold", isOnTrack ? "text-[#34C759]" : "text-[#FF3B30]")}>
                {isOnTrack ? "On Track" : buf === null ? "No Date Set" : "Overdue"}
              </p>
              <p className="text-[11px] text-[#86868B] mt-0.5">
                {buf !== null
                  ? `${Math.abs(buf)} days ${isOnTrack ? "buffer before" : "past"} client promise`
                  : "Set a promised date to track health"}
              </p>
            </div>
            {buf !== null && (
              <div className={cn(
                "w-14 h-14 rounded-full border-4 flex flex-col items-center justify-center",
                isOnTrack ? "border-[#34C759]" : "border-[#FF3B30]"
              )}>
                <span className={cn("text-[15px] font-bold leading-none", isOnTrack ? "text-[#34C759]" : "text-[#FF3B30]")}>
                  {Math.abs(buf)}
                </span>
                <span className="text-[9px] text-[#86868B] mt-0.5">Days</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-5 border-t border-[#E5E5E7] flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-2.5 text-[13px] font-semibold text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#E5E5E7] rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-2.5 text-[13px] font-semibold text-white bg-[#007AFF] hover:bg-[#0051D5] rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Save &amp; Move
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export function BacklogDashboard() {
  const { data: backlogData, isLoading, mutate } = useSWR("/api/backlog", fetcher, { revalidateOnFocus: false })
  const { data: sprintsData } = useSWR("/api/sprints", fetcher, { revalidateOnFocus: false })
  const { data: usersData } = useSWR("/api/users", fetcher, { revalidateOnFocus: false })
  const { data: clientsData } = useSWR("/api/clients", fetcher, { revalidateOnFocus: false })

  const tasks: BacklogTask[] = backlogData?.tasks || []
  const sprints: { id: string; name: string }[] = sprintsData?.sprints || []
  const users: { id: string; full_name: string; email: string }[] = usersData?.users || []
  const clients: { id: string; name: string }[] = clientsData?.clients || []

  const [activeTab, setActiveTab] = useState<"all" | "unassigned" | "no-sprint" | "high-priority">("all")
  const [clientFilter, setClientFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailTask, setDetailTask] = useState<BacklogTask | null>(null)

  // ── Derived stats ──────────────────────────────────────────────────────────
  const totalCount        = tasks.length
  const unassignedCount   = tasks.filter((t) => !t.assigned_to).length
  const noSprintCount     = tasks.filter((t) => !t.sprint_id).length
  const highPriorityCount = tasks.filter((t) => t.priority === "high").length
  const readyCount        = tasks.filter((t) => t.assigned_to && !t.sprint_id).length

  // ── Filter tasks ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let base = [...tasks]
    if (activeTab === "unassigned")    base = base.filter((t) => !t.assigned_to)
    if (activeTab === "no-sprint")     base = base.filter((t) => !t.sprint_id)
    if (activeTab === "high-priority") base = base.filter((t) => t.priority === "high")
    if (clientFilter !== "all")        base = base.filter((t) => t.client_id === clientFilter)
    if (priorityFilter !== "all")      base = base.filter((t) => t.priority === priorityFilter)
    if (search.trim())                 base = base.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    return base
  }, [tasks, activeTab, clientFilter, priorityFilter, search])

  // ── Sections ───────────────────────────────────────────────────────────────
  const unassignedTasks  = filtered.filter((t) => !t.assigned_to)
  const noSprintTasks    = filtered.filter((t) => !t.sprint_id && t.assigned_to)
  const readyTasks       = filtered.filter((t) => t.assigned_to && !t.sprint_id)

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filtered.map((t) => t.id)))
    }
  }

  const handleSaveTask = async (taskId: string, updates: Record<string, any>) => {
    const token = localStorage.getItem("sessionToken")
    await fetch("/api/backlog", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ taskId, ...updates }),
    })
    await mutate()
    setDetailTask(null)
  }

  const TABS = [
    { key: "all",           label: "All",           count: totalCount },
    { key: "unassigned",    label: "Unassigned",     count: unassignedCount },
    { key: "no-sprint",     label: "No Sprint",      count: noSprintCount },
    { key: "high-priority", label: "High Priority",  count: highPriorityCount },
  ] as const

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-[#007AFF]" />
      </div>
    )
  }

  return (
    <div className={cn("relative", detailTask ? "mr-[340px]" : "")}>
      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1D1D1F]">Backlog</h1>
          <p className="text-[13px] text-[#86868B] mt-0.5">Tasks without assignee or sprint. Plan and move them to sprints.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Bulk Actions */}
          <button className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#1D1D1F] bg-white border border-[#E5E5E7] rounded-xl hover:bg-[#F5F5F7] transition-colors">
            <SlidersHorizontal className="w-4 h-4" />
            Bulk Actions
            <ChevronDown className="w-3.5 h-3.5 text-[#86868B]" />
          </button>
          {/* Create New Task */}
          <button className="flex items-center gap-2 px-4 py-2.5 text-[13px] font-bold text-white bg-[#007AFF] rounded-xl hover:bg-[#0051D5] transition-colors shadow-sm">
            <Plus className="w-4 h-4" />
            Create New Task
          </button>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {/* Total Backlog */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#EFF6FF] rounded-xl flex items-center justify-center flex-shrink-0">
            <Package className="w-5 h-5 text-[#007AFF]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1D1D1F] leading-none">{totalCount}</p>
            <p className="text-[12px] font-semibold text-[#1D1D1F] mt-0.5">Total Backlog</p>
            <p className="text-[11px] text-[#86868B]">All unplanned tasks</p>
          </div>
        </div>

        {/* Unassigned */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F5F0FF] rounded-xl flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-[#8B5CF6]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#1D1D1F] leading-none">{unassignedCount}</p>
            <p className="text-[12px] font-semibold text-[#1D1D1F] mt-0.5">Unassigned Tasks</p>
            <p className="text-[11px] text-[#86868B]">No one is assigned</p>
          </div>
        </div>

        {/* No Sprint */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFF8ED] rounded-xl flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5 text-[#FF9500]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#FF9500] leading-none">{noSprintCount}</p>
            <p className="text-[12px] font-semibold text-[#1D1D1F] mt-0.5">No Sprint Assigned</p>
            <p className="text-[11px] text-[#86868B]">Not added to any sprint</p>
          </div>
        </div>

        {/* High Priority */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#FFF1F0] rounded-xl flex items-center justify-center flex-shrink-0">
            <Flag className="w-5 h-5 text-[#FF3B30]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#FF3B30] leading-none">{highPriorityCount}</p>
            <p className="text-[12px] font-semibold text-[#1D1D1F] mt-0.5">High Priority</p>
            <p className="text-[11px] text-[#86868B]">High priority tasks</p>
          </div>
        </div>

        {/* Ready for Sprint */}
        <div className="bg-white border border-[#E5E5E7] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-[#F0FFF4] rounded-xl flex items-center justify-center flex-shrink-0">
            <CheckCircle2 className="w-5 h-5 text-[#34C759]" />
          </div>
          <div>
            <p className="text-2xl font-bold text-[#34C759] leading-none">{readyCount}</p>
            <p className="text-[12px] font-semibold text-[#1D1D1F] mt-0.5">Ready for Sprint</p>
            <p className="text-[11px] text-[#86868B]">Assigned &amp; ready</p>
          </div>
        </div>
      </div>

      {/* ── Filters Row ── */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        {/* Tabs */}
        <div className="flex items-center bg-[#F5F5F7] rounded-xl p-1 gap-0.5">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors",
                activeTab === tab.key
                  ? "bg-[#007AFF] text-white shadow-sm"
                  : "text-[#86868B] hover:text-[#1D1D1F]"
              )}
            >
              {tab.label}
              <span className={cn(
                "text-[11px] font-bold px-1.5 py-0.5 rounded-full",
                activeTab === tab.key ? "bg-white/20 text-white" : "bg-[#E5E5E7] text-[#1D1D1F]"
              )}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Client filter */}
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="text-[13px] border border-[#E5E5E7] rounded-xl px-3 py-2 bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none pr-7"
        >
          <option value="all">All Clients</option>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Priority filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-[13px] border border-[#E5E5E7] rounded-xl px-3 py-2 bg-white text-[#1D1D1F] focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none pr-7"
        >
          <option value="all">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>

        {/* Search */}
        <div className="flex items-center gap-2 flex-1 max-w-xs bg-white border border-[#E5E5E7] rounded-xl px-3 py-2">
          <Search className="w-4 h-4 text-[#86868B] flex-shrink-0" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="text-[13px] text-[#1D1D1F] bg-transparent w-full focus:outline-none placeholder:text-[#86868B]"
          />
        </div>

        <button className="p-2 border border-[#E5E5E7] rounded-xl bg-white hover:bg-[#F5F5F7] transition-colors">
          <SlidersHorizontal className="w-4 h-4 text-[#86868B]" />
        </button>
      </div>

      {/* ── Sections ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white border border-[#E5E5E7] rounded-2xl">
          <Package className="w-10 h-10 text-[#E5E5E7] mx-auto mb-3" />
          <p className="text-[#86868B] font-medium">No backlog tasks found</p>
          <p className="text-[12px] text-[#86868B] mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          {unassignedTasks.length > 0 && (
            <SectionRow
              icon={<User className="w-4 h-4 text-[#FF9500]" />}
              iconBg="bg-[#FFF8ED]"
              title="UNASSIGNED TASKS"
              count={unassignedTasks.length}
              subtitle="Tasks that don't have an assignee"
              tasks={unassignedTasks}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onCardClick={setDetailTask}
              actionLabel="Assign"
              onAction={(task) => setDetailTask(task)}
            />
          )}

          {noSprintTasks.length > 0 && (
            <SectionRow
              icon={<Calendar className="w-4 h-4 text-[#FF9500]" />}
              iconBg="bg-[#FFF8ED]"
              title="NO SPRINT ASSIGNED"
              count={noSprintTasks.length}
              subtitle="Tasks that are assigned but not added to any sprint"
              tasks={noSprintTasks}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onCardClick={setDetailTask}
              actionLabel="Assign Sprint"
              onAction={(task) => setDetailTask(task)}
            />
          )}

          {readyTasks.length > 0 && (
            <SectionRow
              icon={<CheckCircle2 className="w-4 h-4 text-[#34C759]" />}
              iconBg="bg-[#F0FFF4]"
              title="READY FOR SPRINT"
              count={readyTasks.length}
              subtitle="Tasks assigned and ready to be moved to sprint"
              tasks={readyTasks}
              selectedIds={selectedIds}
              onSelect={handleSelect}
              onCardClick={setDetailTask}
              actionLabel="Move to Sprint"
              onAction={(task) => setDetailTask(task)}
            />
          )}
        </>
      )}

      {/* ── Bottom Bulk Bar ── */}
      <div className="fixed bottom-0 left-[var(--sidebar-width,16rem)] right-0 bg-white border-t border-[#E5E5E7] px-6 py-3 flex items-center gap-4 z-30">
        <div
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={handleSelectAll}
        >
          <div className={cn(
            "w-4 h-4 rounded border-2 flex items-center justify-center transition-all",
            selectedIds.size > 0 ? "bg-[#007AFF] border-[#007AFF]" : "border-[#D1D5DB] bg-white"
          )}>
            {selectedIds.size > 0 && (
              <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
          <span className="text-[13px] font-semibold text-[#1D1D1F]">{selectedIds.size} selected</span>
        </div>

        <div className="h-4 w-px bg-[#E5E5E7]" />

        <button className="text-[13px] font-semibold text-[#1D1D1F] hover:text-[#007AFF] transition-colors">Assign User</button>
        <button className="text-[13px] font-semibold text-[#1D1D1F] hover:text-[#007AFF] transition-colors">Assign Sprint</button>
        <button className="text-[13px] font-semibold text-[#1D1D1F] hover:text-[#007AFF] transition-colors">Set Priority</button>
        <button className="text-[13px] font-semibold text-[#1D1D1F] hover:text-[#007AFF] transition-colors">Set Due Date</button>

        <div className="h-4 w-px bg-[#E5E5E7] ml-auto" />

        <button className="text-[13px] font-semibold text-[#FF3B30] hover:opacity-80 transition-opacity">Remove</button>

        <div className="h-4 w-px bg-[#E5E5E7]" />

        <span className="text-[12px] text-[#86868B]">
          Showing 1 – {filtered.length} of {totalCount}
        </span>
        <div className="flex items-center gap-1">
          <button className="w-6 h-6 border border-[#E5E5E7] rounded flex items-center justify-center hover:bg-[#F5F5F7]">
            <ChevronRight className="w-3.5 h-3.5 rotate-180 text-[#86868B]" />
          </button>
          <span className="text-[12px] font-semibold text-[#1D1D1F] px-1">1</span>
          <button className="w-6 h-6 border border-[#E5E5E7] rounded flex items-center justify-center hover:bg-[#F5F5F7]">
            <ChevronRight className="w-3.5 h-3.5 text-[#86868B]" />
          </button>
        </div>
      </div>

      {/* Spacer for bottom bar */}
      <div className="h-16" />

      {/* ── Detail Panel ── */}
      {detailTask && (
        <DetailPanel
          task={detailTask}
          sprints={sprints}
          users={users}
          onClose={() => setDetailTask(null)}
          onSave={handleSaveTask}
        />
      )}
    </div>
  )
}
