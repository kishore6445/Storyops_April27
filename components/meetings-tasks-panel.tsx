"use client"

import { useState } from "react"
import { Plus, Loader2, X, Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import useSWR from "swr"

interface Task {
  id: string
  title: string
  assignee?: { id: string; full_name: string; email?: string } | null
  due_date?: string
  promised_date?: string
  priority?: "high" | "medium" | "low"
  status?: string
}

interface MeetingsTasksPanelProps {
  meeting: { id: string; title?: string; client_id?: string }
  tasks?: Task[]
  onAddTask?: () => void
}

const fetcher = (url: string) => {
  const token = typeof window !== "undefined" ? localStorage.getItem("sessionToken") : null
  return fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then((r) => r.json())
}

const priorityColors: Record<string, string> = {
  high:   "bg-red-100 text-red-700",
  medium: "bg-yellow-100 text-yellow-700",
  low:    "bg-green-100 text-green-700",
}

export function MeetingsTasksPanel({
  meeting,
  onAddTask,
}: MeetingsTasksPanelProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newTask, setNewTask] = useState({
    title: "",
    assigneeId: "",
    priority: "medium",
    due_date: "",
    promised_date: "",
    sprintId: "",
  })

  // Fetch tasks for this meeting
  const { data: tasksData, mutate: mutateTasks } = useSWR(
    `/api/meetings/${meeting.id}/tasks`,
    fetcher,
    { revalidateOnFocus: false }
  )
  const tasks: Task[] = tasksData?.tasks || []

  // Fetch users for assignee dropdown
  const { data: usersData } = useSWR("/api/users", fetcher, { revalidateOnFocus: false })
  const users: any[] = usersData?.users || []

  // Fetch all clients to resolve the real UUID from the name stored in meetings.client_id
  const { data: clientsData } = useSWR("/api/clients", fetcher, { revalidateOnFocus: false })
  const clients: any[] = clientsData?.clients || []

  // meetings.client_id may be a name string — find the real UUID
  const resolvedClientUUID: string | null = (() => {
    if (!meeting.client_id) return null
    // If it already looks like a UUID, use it directly
    if (/^[0-9a-f-]{36}$/i.test(meeting.client_id)) return meeting.client_id
    // Otherwise match by name
    const found = clients.find((c: any) =>
      (c.name || "").toLowerCase() === meeting.client_id!.toLowerCase()
    )
    return found?.id || null
  })()

  // Fetch sprints using the resolved UUID
  const sprintsUrl = resolvedClientUUID
    ? `/api/sprints?clientId=${resolvedClientUUID}`
    : "/api/sprints"
  const { data: sprintsData } = useSWR(sprintsUrl, fetcher, { revalidateOnFocus: false })
  const sprints: any[] = sprintsData?.sprints || []

  const handleAddTask = async () => {
    if (!newTask.title.trim()) return
    setIsSubmitting(true)
    try {
      const token = localStorage.getItem("sessionToken")
      const res = await fetch(`/api/meetings/${meeting.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title:         newTask.title,
          assigneeId:    newTask.assigneeId    || undefined,
          priority:      newTask.priority,
          due_date:      newTask.due_date       || undefined,
          promised_date: newTask.promised_date  || undefined,
          sprintId:      newTask.sprintId       || undefined,
          clientId:      resolvedClientUUID     || undefined,
        }),
      })
      if (res.ok) {
        setNewTask({ title: "", assigneeId: "", priority: "medium", due_date: "", promised_date: "", sprintId: "" })
        setShowAddForm(false)
        mutateTasks()
        onAddTask?.()
      } else {
        const err = await res.json()
        console.error("[v0] Task create error:", err)
      }
    } catch (err) {
      console.error("[v0] Task create exception:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const completedCount = tasks.filter((t) => t.status === "done").length
  const tasksProgress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-72 flex-shrink-0">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-4">
        <h3 className="text-[14px] font-semibold text-gray-900">Tasks from this Meeting</h3>
        <p className="text-[12px] text-gray-500 mt-0.5">
          {completedCount}/{tasks.length} tasks completed
        </p>
      </div>

      {/* Progress Bar */}
      {tasks.length > 0 && (
        <div className="px-5 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-blue-600 h-1.5 rounded-full transition-all"
                style={{ width: `${tasksProgress}%` }}
              />
            </div>
            <span className="text-[11px] text-gray-500 font-medium w-8">{tasksProgress}%</span>
          </div>
        </div>
      )}

      {/* Add Task Button */}
      <div className="px-5 py-3 border-b border-gray-200">
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Task
          </button>
        ) : (
          <div className="space-y-2.5">
            {/* Title */}
            <input
              type="text"
              placeholder="Task title..."
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />

            {/* Assignee dropdown */}
            <div>
              <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide block mb-1">Assign To</label>
              <div className="relative">
                <select
                  value={newTask.assigneeId}
                  onChange={(e) => setNewTask({ ...newTask, assigneeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
                >
                  <option value="">Unassigned</option>
                  {users.map((u: any) => (
                    <option key={u.id} value={u.id}>{u.full_name || u.email}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Sprint dropdown */}
            {sprints.length > 0 && (
              <div>
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide block mb-1">Sprint</label>
                <div className="relative">
                  <select
                    value={newTask.sprintId}
                    onChange={(e) => setNewTask({ ...newTask, sprintId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
                  >
                    <option value="">Backlog (no sprint)</option>
                    {sprints.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Dates */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide block mb-1">Due Date</label>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide block mb-1">Promised</label>
                <input
                  type="date"
                  value={newTask.promised_date}
                  onChange={(e) => setNewTask({ ...newTask, promised_date: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-[12px] focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Priority */}
            <div className="relative">
              <select
                value={newTask.priority}
                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white pr-8"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleAddTask}
                disabled={!newTask.title.trim() || isSubmitting}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Add
              </button>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex-1 px-3 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 text-[13px] font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tasks List */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tasks.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-[13px] text-gray-500">No tasks yet</p>
            <p className="text-[12px] text-gray-400 mt-1">Add tasks to track follow-ups</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-all"
              >
                <p className={cn(
                  "text-[13px] font-medium mb-1.5",
                  task.status === "done" ? "line-through text-gray-400" : "text-gray-900"
                )}>
                  {task.title}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {task.assignee && (
                    <span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full">
                      {task.assignee.full_name}
                    </span>
                  )}
                  {task.priority && (
                    <span className={cn("text-[11px] px-2 py-0.5 rounded-full", priorityColors[task.priority])}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                    </span>
                  )}
                  {task.due_date && (
                    <span className="text-[11px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                      {new Date(task.due_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
