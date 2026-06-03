"use client"

import { useState, useRef } from "react"
import useSWR from "swr"
import { useAuth } from "@/hooks/use-auth"

// ── Types ────────────────────────────────────────────────────────────────────

type Status = "Not Started" | "In Progress" | "Waiting Client" | "Blocked" | "Done"

interface TaskNode {
  id: string
  plan_id: string
  code: string
  title: string
  type: string
  assignee: string
  status: Status
  priority: string
  sprint: string
  client_promised_date: string | null
  internal_due_date: string | null
  wbs2_plans: { client_name: string; wbs_name: string } | null
  wbs2_workstreams: { name: string } | null
}

// ── Column config ─────────────────────────────────────────────────────────────

const COLUMNS: {
  id: string
  label: string
  statuses: Status[]
  color: string
  headerColor: string
}[] = [
  {
    id: "waiting",
    label: "Waiting",
    statuses: ["Not Started", "Blocked"],
    color: "bg-gray-50 border-gray-200",
    headerColor: "bg-gray-100 text-gray-700 border-gray-200",
  },
  {
    id: "working",
    label: "Working",
    statuses: ["In Progress"],
    color: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    id: "review",
    label: "Review",
    statuses: ["Waiting Client"],
    color: "bg-yellow-50 border-yellow-200",
    headerColor: "bg-yellow-100 text-yellow-800 border-yellow-200",
  },
  {
    id: "done",
    label: "Done",
    statuses: ["Done"],
    color: "bg-green-50 border-green-200",
    headerColor: "bg-green-100 text-green-800 border-green-200",
  },
]

// Map column → the default status to assign when a card is dropped there
const COLUMN_DEFAULT_STATUS: Record<string, Status> = {
  waiting: "Not Started",
  working: "In Progress",
  review: "Waiting Client",
  done: "Done",
}

const STATUS_BADGE: Record<Status, string> = {
  "Not Started": "bg-gray-100 text-gray-600",
  "In Progress": "bg-blue-100 text-blue-700",
  "Waiting Client": "bg-yellow-100 text-yellow-700",
  Blocked: "bg-red-100 text-red-700",
  Done: "bg-green-100 text-green-700",
}

const ALL_STATUSES: Status[] = [
  "Not Started",
  "In Progress",
  "Waiting Client",
  "Blocked",
  "Done",
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

// ── Main page ─────────────────────────────────────────────────────────────────

export default function TasksPage() {
  const { user, loading: authLoading } = useAuth()
  const assignee = user?.fullName ?? ""

  const { data: tasks = [], mutate } = useSWR<TaskNode[]>(
    assignee ? `/api/wbs2/my-tasks?assignee=${encodeURIComponent(assignee)}` : null,
    (url: string) => fetcher(url).then((d) => (Array.isArray(d) ? d : [])),
    { refreshInterval: 15000 }
  )

  // ── Drag state ──────────────────────────────────────────────────────────────
  const draggingId = useRef<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  const handleDragStart = (taskId: string) => {
    draggingId.current = taskId
  }

  const handleDrop = async (columnId: string) => {
    const taskId = draggingId.current
    draggingId.current = null
    setDragOverCol(null)
    if (!taskId) return

    const newStatus = COLUMN_DEFAULT_STATUS[columnId]
    await updateStatus(taskId, newStatus)
  }

  // ── Status update ──────────────────────────────────────────────────────────
  const updateStatus = async (taskId: string, newStatus: Status) => {
    // Optimistic update
    mutate(
      (prev = []) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
      false
    )
    await fetch(`/api/wbs2/my-tasks?nodeId=${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    })
    mutate()
  }

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Loading...
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500 text-sm">
        Please log in to view your tasks.
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tasks assigned to <span className="font-medium text-gray-700">{assignee}</span> from WBS
          {tasks.length > 0 && (
            <span className="ml-2 text-gray-400">· {tasks.length} task{tasks.length !== 1 ? "s" : ""}</span>
          )}
        </p>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400">
          <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm">No tasks assigned to you yet.</p>
          <p className="text-xs mt-1 text-gray-300">Go to WBS and assign tasks to yourself.</p>
        </div>
      ) : (
        /* Kanban Board */
        <div className="grid grid-cols-4 gap-4 min-h-[60vh]">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => col.statuses.includes(t.status))
            const isOver = dragOverCol === col.id

            return (
              <div
                key={col.id}
                className={`rounded-xl border-2 transition-colors ${col.color} ${isOver ? "ring-2 ring-blue-400 ring-offset-1" : ""}`}
                onDragOver={(e) => {
                  e.preventDefault()
                  setDragOverCol(col.id)
                }}
                onDragLeave={() => setDragOverCol(null)}
                onDrop={() => handleDrop(col.id)}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between px-4 py-3 rounded-t-xl border-b ${col.headerColor}`}>
                  <span className="text-sm font-semibold">{col.label}</span>
                  <span className="text-xs font-medium bg-white bg-opacity-60 rounded-full px-2 py-0.5">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards */}
                <div className="p-3 space-y-3 min-h-[100px]">
                  {colTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onStatusChange={(newStatus) => updateStatus(task.id, newStatus)}
                      onDragStart={() => handleDragStart(task.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── TaskCard ──────────────────────────────────────────────────────────────────

function TaskCard({
  task,
  onStatusChange,
  onDragStart,
}: {
  task: TaskNode
  onStatusChange: (s: Status) => void
  onDragStart: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="bg-white rounded-lg border border-gray-200 shadow-sm p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow"
    >
      {/* Code + type */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-400 font-mono">{task.code}</span>
        <span className="text-xs text-gray-400">{task.type}</span>
      </div>

      {/* Title */}
      <p className="text-sm font-semibold text-gray-800 leading-snug mb-2">{task.title}</p>

      {/* Client / WBS */}
      {task.wbs2_plans && (
        <p className="text-xs text-gray-400 mb-2 truncate">
          {task.wbs2_plans.client_name} &mdash; {task.wbs2_plans.wbs_name}
        </p>
      )}

      {/* Sprint */}
      {task.sprint && task.sprint !== "Unassigned" && (
        <p className="text-xs text-indigo-500 mb-2">{task.sprint}</p>
      )}

      {/* Due date */}
      {task.internal_due_date && (
        <p className="text-xs text-gray-400 mb-2">
          Due: {task.internal_due_date}
        </p>
      )}

      {/* Status dropdown */}
      <div className="mt-2">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(e.target.value as Status)}
          className={`w-full text-xs font-medium rounded-full px-2 py-1 border-0 outline-none cursor-pointer ${STATUS_BADGE[task.status]}`}
          onClick={(e) => e.stopPropagation()}
        >
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
