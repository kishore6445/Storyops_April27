"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Plus, X, Loader2, Filter } from "lucide-react"
import { TaskKanban } from "@/components/task-kanban"
import type { Task } from "@/components/my-tasks-today"

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) throw new Error("Request failed")
  return res.json()
}

const SWR_OPTS = { revalidateOnMount: true, revalidateOnFocus: true, dedupingInterval: 5000 }

// ---- Create Task Modal ----
function CreateTaskModal({
  clientId,
  clientName,
  sprints,
  users,
  onClose,
  onCreated,
}: {
  clientId: string
  clientName: string
  sprints: any[]
  users: any[]
  onClose: () => void
  onCreated: () => void
}) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    assigneeId: "",
    sprintId: "",
    dueDate: "",
    priority: "medium",
    status: "todo",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title.trim()) { setError("Title is required"); return }
    setSaving(true)
    setError("")
    const token = localStorage.getItem("sessionToken")
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          clientId,
          title: form.title,
          description: form.description,
          assigneeId: form.assigneeId || null,
          sprintId: form.sprintId || null,
          dueDate: form.dueDate || null,
          priority: form.priority,
          status: form.status,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || "Failed to create task")
        return
      }
      onCreated()
      onClose()
    } catch {
      setError("Failed to create task")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X size={18} />
        </button>
        <h2 className="text-base font-bold text-gray-900 mb-4">New Task — {clientName}</h2>
        {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
            <input
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="Task title"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={2}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assign To</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.assigneeId}
                onChange={(e) => set("assigneeId", e.target.value)}
              >
                <option value="">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Sprint</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.sprintId}
                onChange={(e) => set("sprintId", e.target.value)}
              >
                <option value="">No sprint</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.dueDate}
                onChange={(e) => set("dueDate", e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
              <select
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={form.priority}
                onChange={(e) => set("priority", e.target.value)}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
            <select
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
            >
              <option value="todo">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">Waiting Client</option>
              <option value="done">Done</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg text-sm flex items-center justify-center gap-2 mt-1"
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            {saving ? "Creating..." : "Create Task"}
          </button>
        </form>
      </div>
    </div>
  )
}

// ---- Main Page ----
export default function ClientTasksPage() {
  const [selectedClientId, setSelectedClientId] = useState("")
  const [selectedSprintId, setSelectedSprintId] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [taskStatuses, setTaskStatuses] = useState<Record<string, string>>({})

  // Fetch clients
  const { data: clientsData } = useSWR("/api/clients", fetcher, SWR_OPTS)
  const clients: any[] = clientsData?.clients ?? []

  // Fetch sprints for selected client
  const { data: sprintsData } = useSWR(
    selectedClientId ? `/api/sprints?clientId=${selectedClientId}` : null,
    fetcher,
    SWR_OPTS
  )
  const sprints: any[] = sprintsData?.sprints ?? []

  // Fetch users for task assignment
  const { data: usersData } = useSWR("/api/users", fetcher, SWR_OPTS)
  const users: any[] = usersData?.users ?? []

  // Fetch tasks for selected client
  const { data: tasksData, mutate: mutateTasks } = useSWR(
    selectedClientId ? `/api/tasks?clientId=${selectedClientId}` : null,
    fetcher,
    SWR_OPTS
  )

  const rawTasks: any[] = tasksData?.tasks ?? []

  // Auto-select first client
  useEffect(() => {
    if (!selectedClientId && clients.length > 0) {
      setSelectedClientId(clients[0].id)
    }
  }, [clients, selectedClientId])

  // Reset sprint filter when client changes
  useEffect(() => {
    setSelectedSprintId("all")
    setStartDate("")
    setEndDate("")
    setTaskStatuses({})
  }, [selectedClientId])

  const selectedClient = clients.find((c) => c.id === selectedClientId)

  // Filter tasks
  const filteredTasks: Task[] = rawTasks
    .filter((t) => {
      // Sprint filter
      if (selectedSprintId !== "all") {
        if (!t.sprint_id || t.sprint_id !== selectedSprintId) return false
      }
      // Date filter
      if (startDate && t.due_date && t.due_date < startDate) return false
      if (endDate && t.due_date && t.due_date > endDate) return false
      return true
    })
    .map((t) => ({
      id: t.id,
      taskId: t.task_id,
      source_table: "tasks" as const,
      title: t.title,
      description: t.description || "",
      completed: (taskStatuses[t.id] ?? t.status) === "done",
      clientName: selectedClient?.name ?? "",
      clientId: t.client_id,
      phaseName: t.phase || "",
      sectionName: "",
      dueDate: t.due_date || "",
      priority: (t.priority as "low" | "medium" | "high") || "medium",
      owner: "",
      assignedTo: t.assigned_to || "",
      status: taskStatuses[t.id] ?? t.status ?? "todo",
      type: "task" as const,
    }))

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    // Optimistic update
    setTaskStatuses((prev) => ({ ...prev, [taskId]: newStatus }))
    const token = localStorage.getItem("sessionToken")
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ taskId, status: newStatus }),
      })
      if (!res.ok) {
        // Revert on failure
        const task = rawTasks.find((t) => t.id === taskId)
        setTaskStatuses((prev) => ({ ...prev, [taskId]: task?.status ?? "todo" }))
      } else {
        mutateTasks()
      }
    } catch {
      const task = rawTasks.find((t) => t.id === taskId)
      setTaskStatuses((prev) => ({ ...prev, [taskId]: task?.status ?? "todo" }))
    }
  }

  const totalTasks = filteredTasks.length
  const doneTasks = filteredTasks.filter((t) => t.status === "done").length
  const inProgressTasks = filteredTasks.filter((t) => t.status === "in_progress").length
  const blockedTasks = filteredTasks.filter((t) => t.status === "todo").length

  return (
    <div className="flex flex-col h-full min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-lg font-bold text-gray-900 whitespace-nowrap">Client Tasks</h1>

          {/* Client selector */}
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
          >
            {clients.length === 0 && <option value="">Loading...</option>}
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Sprint filter */}
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={selectedSprintId}
            onChange={(e) => { setSelectedSprintId(e.target.value); setStartDate(""); setEndDate("") }}
            disabled={!selectedClientId}
          >
            <option value="all">All Sprints</option>
            {sprints.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          {/* Date range filter */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Filter size={13} />
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setSelectedSprintId("all") }}
            />
            <span>—</span>
            <input
              type="date"
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setSelectedSprintId("all") }}
            />
          </div>
        </div>

        {/* Create task button */}
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={!selectedClientId}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <Plus size={15} />
          New Task
        </button>
      </div>

      {/* Summary stats */}
      {selectedClientId && (
        <div className="px-6 py-3 flex gap-4 border-b border-gray-100 bg-white flex-wrap">
          <div className="text-xs text-gray-500">
            <span className="font-bold text-gray-800 text-sm">{totalTasks}</span> total
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-bold text-blue-600 text-sm">{inProgressTasks}</span> in progress
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-bold text-amber-500 text-sm">{blockedTasks}</span> not started
          </div>
          <div className="text-xs text-gray-500">
            <span className="font-bold text-green-600 text-sm">{doneTasks}</span> done
          </div>
        </div>
      )}

      {/* Kanban */}
      <div className="flex-1 overflow-auto p-6">
        {!selectedClientId ? (
          <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
            Select a client to view tasks
          </div>
        ) : filteredTasks.length === 0 && tasksData ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <p className="text-sm">No tasks found for the current filter.</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 text-blue-600 text-sm font-semibold hover:underline"
            >
              <Plus size={14} /> Create the first task
            </button>
          </div>
        ) : (
          <TaskKanban
            tasks={filteredTasks}
            onTaskStatusChange={handleStatusChange}
          />
        )}
      </div>

      {/* Create task modal */}
      {showCreateModal && selectedClient && (
        <CreateTaskModal
          clientId={selectedClientId}
          clientName={selectedClient.name}
          sprints={sprints}
          users={users}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => mutateTasks()}
        />
      )}
    </div>
  )
}
