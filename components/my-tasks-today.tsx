"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, Circle, Calendar, Zap, Clock, AlertCircle, Edit2, X, Loader2, LayoutGrid, Plus, User, Users, Paperclip, Copy, Check as CheckIcon, Flag, Tag, ChevronDown, Maximize2, Bold, Italic, Underline, List, Link, Image as ImageIcon, AtSign, Smile, ListOrdered, MoreVertical } from "lucide-react"
import useSWR from "swr"
import { TaskKanban } from "./task-kanban"
import { SprintToolbarUnified } from "./sprint-toolbar-unified"
import { WarBar } from "./war-bar"
import { CriticalZoneBanner } from "./critical-zone-banner"
import { CollapsibleTodaysFocus } from "./collapsible-todays-focus"
import { cn } from "@/lib/utils"

export interface Task {
  id: string
  taskId?: string
  source_table?: "tasks" | "sprint_tasks" | "wbs2_nodes"
  title: string
  description?: string
  completed: boolean
  clientName: string
  clientId?: string
  phaseName: string
  phaseId?: string
  sprintId?: string
  sectionName: string
  dueDate: string
  dueTime?: string
  promisedDate?: string
  promisedTime?: string
  assignedTo?: string
  priority: "low" | "medium" | "high"
  owner: string
  status: string
  completed_at?: string | null
  type: "task" | "power_move" | "workflow_step" | "meeting_action_item"
  sopLink?: string
  department?: string
}

const fetcher = async (url: string) => {
  const token = localStorage.getItem("sessionToken")
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (res.status === 401 || res.status === 403) {
    // Session expired — clear token so auth-guard redirects to login
    localStorage.removeItem("sessionToken")
    throw new Error("Unauthorized")
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body?.error || "Request failed")
  }
  return res.json()
}

const SWR_OPTS = {
  // Always fetch fresh data when the component mounts (e.g. user navigates back)
  revalidateOnMount: true,
  // Revalidate when the user returns to the browser tab
  revalidateOnFocus: true,
  // Allow a new request once every 5 seconds to avoid hammering the API
  dedupingInterval: 5000,
}

export function MyTasksToday() {
  const router = useRouter()
  const { data, error, isLoading, mutate } = useSWR("/api/my-tasks", fetcher, SWR_OPTS)

  const { data: clientsData } = useSWR("/api/clients", fetcher, SWR_OPTS)
  const { data: sprintsData } = useSWR("/api/sprints", fetcher, SWR_OPTS)
  const { data: usersData } = useSWR("/api/users", fetcher, SWR_OPTS)
  const { data: currentUserProfile } = useSWR("/api/user/profile", fetcher, SWR_OPTS)
  const { data: individualSprintData } = useSWR("/api/individual-sprints", fetcher, SWR_OPTS)

  // Fetch WBS2 tasks assigned to current user
  // Profile returns full_name (not fullName)
  const wbs2Assignee = currentUserProfile?.full_name || currentUserProfile?.display_name || null
  const { data: wbs2TasksData = [], mutate: mutateWbs2 } = useSWR<Task[]>(
    wbs2Assignee ? `/api/wbs2/nodes/my-tasks?assignee=${encodeURIComponent(wbs2Assignee)}` : null,
    (url: string) =>
      fetch(url)
        .then((r) => r.json())
        .then((d) => (Array.isArray(d) ? d : []))
  )

  // Local optimistic status overrides for WBS2 tasks (keyed by node id)
  const [wbs2Statuses, setWbs2Statuses] = useState<Record<string, string>>({})

  const tasks: Task[] = (data?.tasks || []).map((task: Task) => ({
    ...task,
    status: task.status || "todo",
  }))

  // Merge WBS2 tasks — apply local optimistic status overrides so drag-drop reflects instantly
  const allTasks = [
    ...tasks,
    ...wbs2TasksData.map((t) => ({
      ...t,
      status: wbs2Statuses[t.id] ?? t.status,
    })),
  ]

  // State for task owner's subtasks that should appear in kanban
  const [ownedTaskSubtasks, setOwnedTaskSubtasks] = useState<any[]>([])
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false)
  // Track which task cards are expanded to show subtasks
  const [expandedParentTaskIds, setExpandedParentTaskIds] = useState<Set<string>>(new Set())

  // Fetch subtasks for all tasks in the user's list (all tasks here already belong to current user)
  useEffect(() => {
    const fetchOwnedTaskSubtasks = async () => {
      // Derive directly from data so we always have a fresh list
      const rawTasks: Task[] = (data?.tasks || []).map((t: Task) => ({ ...t, status: t.status || "todo" }))
      // Fetch subtasks for all tasks regardless of type (type may be undefined from older data)
      const sprintTasks = rawTasks.filter(t => !t.type || t.type === "task")
      if (sprintTasks.length === 0) {
        setOwnedTaskSubtasks([])
        return
      }

      setIsLoadingSubtasks(true)
      const token = localStorage.getItem("sessionToken")
      const allSubtasks: any[] = []

      try {
        for (const parentTask of sprintTasks) {
          try {
            // Pass asOwner=true so the API returns all subtasks for this task, not just the user's own
            const res = await fetch(`/api/tasks/${parentTask.id}/subtasks?asOwner=true`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) continue

            const subtasksData = await res.json()
            // API returns array directly
            const subtasksArray = Array.isArray(subtasksData) ? subtasksData : []

            if (subtasksArray.length === 0) continue

            // Transform each subtask into a Task-compatible object for kanban rendering
            const transformed = subtasksArray.map((st: any) => ({
              id: st.id,
              taskId: st.reference_id || st.id.slice(0, 8).toUpperCase(),
              title: st.title,
              description: "",
              status: st.status === "pending" ? "todo" : (st.status || "todo"),
              dueDate: st.due_date || "",
              priority: "medium" as const,
              owner: parentTask.owner,
              assignedTo: st.assignee_id || "",
              clientName: parentTask.clientName,
              phaseName: parentTask.phaseName,
              sectionName: parentTask.sectionName,
              completed: st.status === "done",
              type: "task" as const,
              isSubtask: true,
              parentTaskId: parentTask.id,
              parentTaskTitle: parentTask.title,
              reference_id: st.reference_id,
            }))

            allSubtasks.push(...transformed)
          } catch (err) {
            console.error(`[v0] Error fetching subtasks for task ${parentTask.id}:`, err)
          }
        }

        setOwnedTaskSubtasks(allSubtasks)
      } finally {
        setIsLoadingSubtasks(false)
      }
    }

    // Depend on data (stable SWR ref) so this only re-runs when the API response changes
    if (data) {
      fetchOwnedTaskSubtasks()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data])

  // Calculate subtask counts for each task
  const taskSubtaskCounts = tasks.reduce((acc, task) => {
    const count = ownedTaskSubtasks.filter(st => st.parentTaskId === task.id).length
    if (count > 0) {
      acc[task.id] = count
    }
    return acc
  }, {} as Record<string, number>)

  const [filterPriority, setFilterPriority] = useState<string>("all")
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState<string>("all")
  const [isCreating, setIsCreating] = useState(false)
  const [sprintFilter, setSprintFilter] = useState<"current-sprint" | "backlog">("current-sprint")
  // Hidden for clean UI (but preserved for future use):
  const [showFilters] = useState(false)
  const [selectedTaskIds] = useState<Set<string>>(new Set())
  const [showBulkActions] = useState(false)
  const [bulkActionMode] = useState<"select" | "priority" | "status" | null>(null)
  const [viewPromisesOnly] = useState(false)
  const [createFormData, setCreateFormData] = useState({
    title: "",
    description: "",
    clientId: "",
    sprintId: "",
    phaseId: "story-research",
    priority: "medium" as "low" | "medium" | "high",
    dueDate: "",
    dueTime: "",
    promisedDate: "",
    promisedTime: "",
    assigneeId: "",        // kept for backward compat (first assignee)
    assigneeIds: [] as string[],  // multi-assignee
    attachments: [] as File[],
    tags: [] as string[],
  })
  // Subtasks for the create modal
  const [modalSubtasks, setModalSubtasks] = useState<Array<{ title: string; dueDate: string; assigneeId: string }>>([])
  const [showAddSubtaskRow, setShowAddSubtaskRow] = useState(false)
  const [newSubtaskRow, setNewSubtaskRow] = useState({ title: "", dueDate: "", assigneeId: "" })
  // Success popup after task creation
  const [createdTaskInfo, setCreatedTaskInfo] = useState<{ task_id: string; title: string; description: string; assignedToName: string } | null>(null)
  const [copiedAll, setCopiedAll] = useState(false)

  const clients = clientsData?.clients || []
  const sprints = sprintsData?.sprints || []
  const users = usersData?.users || []
  const currentUser = users && users.length > 0 ? users[0] : null

  // Get individual sprint (now primary, auto-created monthly)
  const individualSprint = individualSprintData || {
    id: "",
    user_id: currentUserProfile?.id || "",
    year_month: new Date().toISOString().slice(0, 7),
    tasks: [],
  }

  // Build display sprint - use individual sprint as primary header
  const monthName = new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  const isBacklogView = sprintFilter === "backlog"
  const sprint = {
    name: isBacklogView ? "Client Backlog" : `${monthName} Sprint`,
    client_name: "",
    end_date: individualSprintData?.end_date || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString(),
  }

  // Filter tasks based on sprint filter
  // Current Sprint: tasks added to individual sprint + overdue/due this month tasks
  // Backlog: all other tasks (future tasks, unscheduled)
  const sprintTaskIds = new Set(individualSprint.tasks?.map((t: any) => t.task_id || t.id) || [])
  
  // Get tasks due this month (or overdue)
  const currentDate = new Date()
  const monthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
  
  const isInCurrentMonth = (dateStr: string) => {
    if (!dateStr) return false
    const taskDate = new Date(dateStr)
    return taskDate >= monthStart && taskDate <= monthEnd
  }
  
  const isOverdue = (dateStr: string) => {
    if (!dateStr) return false
    const taskDate = new Date(dateStr)
    return taskDate < currentDate
  }
  
  const displayTasks = sprintFilter === "current-sprint"
    ? allTasks.filter(t =>
        !t.dueDate ||                // Tasks with no due date always shown in current view
        sprintTaskIds.has(t.id) ||   // Explicitly added to sprint
        isOverdue(t.dueDate) ||      // Overdue tasks
        isInCurrentMonth(t.dueDate)  // Due this month
      )
    : sprintFilter === "backlog"
    ? allTasks.filter(t =>
        t.dueDate &&                 // Must have a due date
        !sprintTaskIds.has(t.id) &&  // Not in sprint
        !isOverdue(t.dueDate) &&     // Not overdue
        !isInCurrentMonth(t.dueDate) // Not due this month
      )
    : allTasks

  const kanbanTasks = [...displayTasks, ...ownedTaskSubtasks]




  const filteredSprints = sprints.filter(s => !createFormData.clientId || s.client_id === createFormData.clientId)

  // Helper function to get user initials
  const getUserInitials = (name?: string) => {
    if (!name) return "U"
    const parts = name.split(" ")
    return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase()
  }

  // Helper function to get avatar color based on name
  const getAvatarColor = (name?: string) => {
    if (!name) return "bg-[#007AFF]"
    const colors = [
      "bg-[#007AFF]",
      "bg-[#FF3B30]",
      "bg-[#34C759]",
      "bg-[#FF9500]",
      "bg-[#9370DB]",
    ]
    return colors[name.charCodeAt(0) % colors.length]
  }

  // Helper function to get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-[#FF3B30]"
      case "medium":
        return "bg-[#FF9500]"
      case "low":
        return "bg-[#34C759]"
      default:
        return "bg-[#86868B]"
    }
  }

  // Calculate power metrics (using allTasks to include WBS2 tasks)
  const totalTasks = allTasks.length
  const completedTasks = allTasks.filter((t) => t.completed).length
  const pendingTasks = totalTasks - completedTasks
  const highPriorityTasks = allTasks.filter((t) => t.priority === "high" && !t.completed).length
  const today = new Date().toISOString().split("T")[0]
  const dueTodayTasks = allTasks.filter((t) => t.dueDate === today && !t.completed).length
  const overdueTasks = allTasks.filter((t) => t.dueDate && t.dueDate < today && !t.completed).length

  // Filter tasks
  const filteredTasks = allTasks.filter((task) => {
    if (filterPriority !== "all" && task.priority !== filterPriority) return false
    if (selectedClient !== "all" && task.clientName !== clients.find((c) => c.id === selectedClient)?.name) return false
    return true
  })

  const toggleTaskCompletion = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return

    const newStatus = task.completed ? "todo" : "done"
    const newCompleted = !task.completed

    // Optimistic update
    mutate(
      {
        tasks: tasks.map((t) =>
          t.id === taskId ? { ...t, completed: newCompleted, status: newStatus } : t
        ),
      },
      false
    )

    try {
      const token = localStorage.getItem("sessionToken")
      
      if (task.type === "power_move") {
        // Complete power move
        await fetch("/api/power-moves/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ powerMoveId: taskId, completed: newCompleted }),
        })
      } else if (task.type === "workflow_step") {
        // Approve workflow step
        await fetch("/api/workflow-steps/approve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ workflowStepId: taskId, status: newCompleted ? "approved" : "pending" }),
        })
      } else if (task.type === "meeting_action_item") {
        // Complete meeting action item
        await fetch("/api/meetings/action-items/complete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ actionItemId: taskId, completed: newCompleted }),
        })
      } else {
        // Complete regular task
        await fetch("/api/tasks", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ taskId, status: newStatus }),
        })
      }
      
      // Revalidate to confirm
      mutate()
    } catch {
      // Revert on error
      mutate()
    }
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

    if (task.source_table === 'wbs2_nodes') {
      // Optimistic update for WBS2 task — updates allTasks immediately via wbs2Statuses
      setWbs2Statuses((prev) => ({ ...prev, [taskId]: newStatus }))
      try {
        await fetch("/api/wbs2/nodes/update-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId: taskId, status: newStatus }),
        })
        mutateWbs2()
      } catch {
        // Revert optimistic update on error
        setWbs2Statuses((prev) => ({ ...prev, [taskId]: task.status }))
      }
    } else {
      // Regular task — optimistic update via SWR mutate
      mutate(
        { tasks: tasks.map((t) => t.id === taskId ? { ...t, status: newStatus } : t) },
        false
      )
      try {
        const token = localStorage.getItem("sessionToken")
        await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ taskId, status: newStatus }),
        })
        mutate()
      } catch {
        mutate()
      }
    }
  }

  const toggleTaskSelection = () => {
    // Preserved but hidden - selection moved to individual task details
  }

  const handleBulkComplete = () => {
    // Preserved but hidden - bulk actions removed from UI
  }

  const handleBulkDelete = () => {
    // Preserved but hidden - bulk actions removed from UI
  }

  const clearSelection = () => {
    // Preserved but hidden - selection cleared
  }

  const handleCreateTask = async () => {
    if (!createFormData.title.trim() || !createFormData.clientId) return

    setIsCreating(true)
    const token = localStorage.getItem("sessionToken")
    try {
      const { attachments, assigneeIds, tags, ...bodyData } = createFormData
      // Use first assigneeId from multi-select for backward compat, send full array too
      const primaryAssigneeId = assigneeIds.length > 0 ? assigneeIds[0] : createFormData.assigneeId
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...bodyData, assigneeId: primaryAssigneeId, assigneeIds, tags }),
      })
      const data = await res.json()
      if (!res.ok) {
        alert(`Task creation failed: ${data.error || "Unknown error"}`)
        return
      }

      const normalizeTaskId = (value: unknown): string => {
        if (value == null) return ""
        if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") return String(value).trim()
        if (Array.isArray(value)) {
          for (const entry of value) { const n = normalizeTaskId(entry); if (n) return n }
          return ""
        }
        if (typeof value === "object") {
          const r = value as Record<string, unknown>
          return normalizeTaskId(r.id) || normalizeTaskId(r.task_id) || normalizeTaskId(r.taskId) || ""
        }
        return ""
      }

      const createdTaskId = normalizeTaskId(data?.task ?? data?.id ?? data?.taskId ?? null)
      const createdTaskPublicId = normalizeTaskId(data?.task?.task_id ?? data?.task_id ?? null)
      const hasValidTaskId = Boolean(createdTaskId && createdTaskId !== "undefined" && createdTaskId !== "null")

      // Upload multiple attachments
      if (attachments.length > 0 && hasValidTaskId) {
        for (const file of attachments) {
          const fileData = new FormData()
          fileData.append("file", file)
          const uploadRes = await fetch(`/api/tasks/${createdTaskId}/files`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: fileData,
          })
          if (!uploadRes.ok) {
            const uploadError = await uploadRes.json().catch(() => ({}))
            console.error("[v0] Attachment upload failed:", uploadError)
          }
        }
      }

      // Create subtasks
      if (modalSubtasks.length > 0 && hasValidTaskId) {
        for (const st of modalSubtasks) {
          if (!st.title.trim()) continue
          await fetch(`/api/tasks/${createdTaskId}/subtasks`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ title: st.title.trim(), assignee_id: st.assigneeId || null, due_date: st.dueDate || null }),
          })
        }
      }

      // Determine assigned user name(s) for popup
      const allAssigneeIds = createFormData.assigneeIds.length > 0 ? createFormData.assigneeIds : (createFormData.assigneeId ? [createFormData.assigneeId] : [])
      const assignedToName = allAssigneeIds.length > 0
        ? allAssigneeIds.map((id: string) => { const u = users.find((u: any) => u.id === id); return u ? (u.full_name || u.email) : id }).join(", ")
        : "Unassigned"

      setShowCreateModal(false)
      setCreateFormData({
        title: "",
        description: "",
        clientId: "",
        sprintId: "",
        phaseId: "story-research",
        priority: "medium",
        dueDate: "",
        dueTime: "",
        promisedDate: "",
        promisedTime: "",
        assigneeId: "",
        assigneeIds: [],
        attachments: [],
        tags: [],
      })
      setModalSubtasks([])
      setShowAddSubtaskRow(false)
      setNewSubtaskRow({ title: "", dueDate: "", assigneeId: "" })

      // Show success popup
      setCreatedTaskInfo({
        task_id: createdTaskPublicId || createdTaskId || "N/A",
        title: bodyData.title,
        description: bodyData.description || "",
        assignedToName,
      })
      setCopiedAll(false)
      mutate()
    } catch (error) {
      console.error("[v0] Error creating task:", error)
      alert(`Error creating task: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsCreating(false)
    }
  }

  const handleEditTask = (task: Task) => {
    router.push(`/tasks/${task.id}`)
  }

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    const task = allTasks.find((t) => t.id === taskId)
    if (!task) return

    if ((task as any).source_table === "wbs2_nodes") {
      // Optimistic update for WBS2 task via local state override
      setWbs2Statuses((prev) => ({ ...prev, [taskId]: newStatus }))
      try {
        const res = await fetch("/api/wbs2/nodes/update-status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nodeId: taskId, status: newStatus }),
        })
        if (!res.ok) {
          // Revert on failure
          setWbs2Statuses((prev) => ({ ...prev, [taskId]: task.status }))
        } else {
          mutateWbs2()
        }
      } catch {
        setWbs2Statuses((prev) => ({ ...prev, [taskId]: task.status }))
      }
      return
    }

    // Regular task — existing logic untouched
    const token = localStorage.getItem("sessionToken")

    // Optimistically update local task state so Kanban columns refresh immediately
    mutate(
      {
        tasks: tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                status: newStatus,
                completed: newStatus === "done",
              }
            : t
        ),
      },
      false
    )

    try {
      const response = await fetch("/api/tasks", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          taskId: taskId,
          status: newStatus,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        console.error("[v0] Error updating task status:", errorData.error || response.statusText)
        mutate()
        return
      }

      mutate()
    } catch (error) {
      console.error("[v0] Error changing task status:", error)
      mutate()
    }
  }

  const getNextSubtaskStatus = (currentStatus: string | undefined) => {
    if (!currentStatus) return "pending"
    const statusCycle: Record<string, string> = {
      pending: "in_progress",
      in_progress: "done",
      done: "done",
      created: "pending",
      in_review: "done",
    }
    return statusCycle[currentStatus] || "pending"
  }


  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FAFBFC]">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-[#007AFF]" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Main Content Area - Clean background */}
      <div>
        {/* Critical Zone Banner */}
        {data?.overdue_count > 0 && <CriticalZoneBanner overdueTasks={data.overdue_count} />}

        {/* Unified Sprint Toolbar - Single Row */}
        <SprintToolbarUnified
          userAvatar={currentUserProfile?.profile_photo_url}
          userName={currentUserProfile?.display_name || currentUserProfile?.full_name || "Team Member"}
          userRole={currentUserProfile?.role === "admin" ? "Administrator" : currentUserProfile?.role === "manager" ? "Manager" : "Team Operator"}
          personalTagline={currentUserProfile?.personal_motto || "Execution Over Excuses."}
          overdueCount={displayTasks.filter((t) => t.status !== "done" && new Date(t.dueDate) < new Date()).length}
          completedThisWeek={displayTasks.filter((t) => t.status === "done").length}
          sprintName={sprint?.name || "Your Monthly Sprint"}
          endDate={sprint?.end_date || new Date().toISOString()}
          taskCount={displayTasks.length}
          completedCount={displayTasks.filter((t) => t.status === "done").length}
          sprintFilter={sprintFilter}
          onSprintFilterChange={setSprintFilter}
          onAddTask={() => setShowCreateModal(true)}
        />

        {/* Kanban Board - Clean spacing */}
        <div className="px-8 py-6">
          <TaskKanban
            tasks={kanbanTasks}
            onTaskStatusChange={handleStatusChange}
            isLoading={isLoading}
            onEditTask={handleEditTask}
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={toggleTaskSelection}
            showCheckboxes={false}
            onArchive={() => mutate()}
            subtaskCounts={taskSubtaskCounts}
            expandedParentTaskIds={expandedParentTaskIds}
            onToggleParentExpand={(taskId) => {
              const newExpanded = new Set(expandedParentTaskIds)
              if (newExpanded.has(taskId)) {
                newExpanded.delete(taskId)
              } else {
                newExpanded.add(taskId)
              }
              setExpandedParentTaskIds(newExpanded)
            }}
            parentTaskSubtasks={ownedTaskSubtasks}
          />
        </div>
      </div>

      {/* Task Created Success Popup */}
      {createdTaskInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setCreatedTaskInfo(null)}
              className="absolute top-4 right-4 p-1.5 hover:bg-[#F5F5F7] rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-[#86868B]" />
            </button>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <CheckIcon className="w-4 h-4 text-green-600" />
              </div>
              <h3 className="text-base font-bold text-[#1D1D1F]">Task Created Successfully</h3>
            </div>
            <div className="space-y-3 mb-4">
              <div className="bg-[#F5F5F7] rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-[#86868B] font-medium w-24 flex-shrink-0">Task ID</span>
                  <span className="text-[#1D1D1F] font-mono font-semibold">{createdTaskInfo.task_id}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-[#86868B] font-medium w-24 flex-shrink-0">Title</span>
                  <span className="text-[#1D1D1F]">{createdTaskInfo.title}</span>
                </div>
                {createdTaskInfo.description && (
                  <div className="flex items-start gap-2">
                    <span className="text-[#86868B] font-medium w-24 flex-shrink-0">Description</span>
                    <span className="text-[#1D1D1F] line-clamp-3">{createdTaskInfo.description}</span>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <span className="text-[#86868B] font-medium w-24 flex-shrink-0">Assigned To</span>
                  <span className="text-[#1D1D1F]">{createdTaskInfo.assignedToName}</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const text = [
                  `Task ID: ${createdTaskInfo.task_id}`,
                  `Title: ${createdTaskInfo.title}`,
                  createdTaskInfo.description ? `Description: ${createdTaskInfo.description}` : null,
                  `Assigned To: ${createdTaskInfo.assignedToName}`,
                ].filter(Boolean).join("\n")
                navigator.clipboard.writeText(text).then(() => {
                  setCopiedAll(true)
                  setTimeout(() => setCopiedAll(false), 2000)
                })
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#007AFF] hover:bg-[#0051D5] text-white font-semibold rounded-xl text-sm transition-colors"
            >
              {copiedAll ? <CheckIcon className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copiedAll ? "Copied!" : "Copy All Details"}
            </button>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateModal && (() => {
        const bufferDays = createFormData.dueDate && createFormData.promisedDate
          ? Math.ceil((new Date(createFormData.promisedDate).getTime() - new Date(createFormData.dueDate).getTime()) / (1000 * 60 * 60 * 24))
          : null
        const isOnTrack = bufferDays !== null && bufferDays >= 1
        const priorityColors: Record<string, string> = { high: "#FF3B30", medium: "#FF9500", low: "#34C759" }
        const priorityColor = priorityColors[createFormData.priority] || "#86868B"

        const toggleAssignee = (userId: string) => {
          setCreateFormData(prev => {
            const already = prev.assigneeIds.includes(userId)
            const next = already ? prev.assigneeIds.filter(id => id !== userId) : [...prev.assigneeIds, userId]
            return { ...prev, assigneeIds: next, assigneeId: next[0] || "" }
          })
        }

        const addTag = (tag: string) => {
          const t = tag.trim()
          if (t && !createFormData.tags.includes(t)) {
            setCreateFormData(prev => ({ ...prev, tags: [...prev.tags, t] }))
          }
        }
        const removeTag = (t: string) => setCreateFormData(prev => ({ ...prev, tags: prev.tags.filter(x => x !== t) }))

        const QUICK_TEMPLATES = [
          { label: "Social Media Post", icon: "📱" },
          { label: "Blog Article", icon: "📝" },
          { label: "YouTube Video", icon: "▶" },
          { label: "Flyer / Poster", icon: "🖼" },
          { label: "Landing Page", icon: "📄" },
        ]

        return (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1100px] max-h-[95vh] overflow-hidden flex flex-col">

              {/* ── Header ── */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E7]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#EEF4FF] flex items-center justify-center flex-shrink-0">
                    <LayoutGrid className="w-5 h-5 text-[#3B6FE8]" />
                  </div>
                  <div>
                    <h2 className="text-[16px] font-semibold text-[#1D1D1F] leading-tight">Create New Task</h2>
                    <p className="text-[12px] text-[#86868B] leading-tight">Break down work with subtasks and checklists</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#86868B]">
                    <Maximize2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-[#F5F5F7] rounded-lg transition-colors text-[#86868B]">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ── Two-panel body ── */}
              <div className="flex flex-1 overflow-hidden">

                {/* ── LEFT PANEL ── */}
                <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5 border-r border-[#E5E5E7]">

                  {/* Task Name */}
                  <div>
                    <label className="text-[13px] font-medium text-[#1D1D1F] block mb-1.5">Task Name <span className="text-[#FF3B30]">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        maxLength={150}
                        placeholder="e.g. Create Lead Magnet for Client – Complete Guide"
                        value={createFormData.title}
                        onChange={(e) => setCreateFormData({ ...createFormData, title: e.target.value })}
                        className="w-full text-[13px] border border-[#D1D1D6] rounded-lg px-3 py-2.5 pr-14 focus:outline-none focus:ring-2 focus:ring-[#007AFF] focus:border-transparent"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#86868B]">
                        {createFormData.title.length}/150
                      </span>
                    </div>
                  </div>

                  {/* Client / Sprint / Assign To / Priority row */}
                  <div className="grid grid-cols-4 gap-3">
                    {/* Client */}
                    <div>
                      <label className="text-[12px] font-medium text-[#1D1D1F] block mb-1.5">Client <span className="text-[#FF3B30]">*</span></label>
                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-[#EEF4FF] flex items-center justify-center pointer-events-none">
                          <User className="w-3 h-3 text-[#3B6FE8]" />
                        </div>
                        <select
                          value={createFormData.clientId}
                          onChange={(e) => setCreateFormData({ ...createFormData, clientId: e.target.value, sprintId: "" })}
                          className="w-full text-[13px] border border-[#D1D1D6] rounded-lg pl-9 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none bg-white"
                        >
                          <option value="">Select client</option>
                          {clients.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868B] pointer-events-none" />
                      </div>
                    </div>

                    {/* Sprint */}
                    <div>
                      <label className="text-[12px] font-medium text-[#1D1D1F] block mb-1.5">Sprint</label>
                      <div className="relative">
                        <div className="absolute left-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-md bg-[#E8F8F0] flex items-center justify-center pointer-events-none">
                          <Zap className="w-3 h-3 text-[#34C759]" />
                        </div>
                        <select
                          value={createFormData.sprintId}
                          onChange={(e) => setCreateFormData({ ...createFormData, sprintId: e.target.value })}
                          className="w-full text-[13px] border border-[#D1D1D6] rounded-lg pl-9 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none bg-white"
                        >
                          <option value="">Backlog</option>
                          {filteredSprints.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868B] pointer-events-none" />
                      </div>
                    </div>

                    {/* Assign To — multi-select dropdown */}
                    <div className="relative">
                      <label className="text-[12px] font-medium text-[#1D1D1F] block mb-1.5">Assign To</label>
                      <div
                        className="flex items-center gap-1.5 border border-[#D1D1D6] rounded-lg px-2.5 py-2 cursor-pointer min-h-[38px] bg-white"
                        onClick={() => setCreateFormData(prev => ({ ...prev, _assigneeOpen: !(prev as any)._assigneeOpen } as any))}
                      >
                        {createFormData.assigneeIds.length === 0 ? (
                          <span className="text-[13px] text-[#86868B] flex-1">Unassigned</span>
                        ) : (
                          <div className="flex -space-x-1.5 flex-1">
                            {createFormData.assigneeIds.slice(0, 3).map((uid, i) => {
                              const u = users.find((u: any) => u.id === uid)
                              const name = u?.full_name || u?.email || "?"
                              return (
                                <div key={uid} className="w-6 h-6 rounded-full bg-[#007AFF] text-white text-[9px] font-bold flex items-center justify-center border-2 border-white uppercase" title={name}>
                                  {name.charAt(0)}
                                </div>
                              )
                            })}
                            {createFormData.assigneeIds.length > 3 && (
                              <div className="w-6 h-6 rounded-full bg-[#E5E5E7] text-[#86868B] text-[9px] font-bold flex items-center justify-center border-2 border-white">
                                +{createFormData.assigneeIds.length - 3}
                              </div>
                            )}
                          </div>
                        )}
                        <ChevronDown className="w-3.5 h-3.5 text-[#86868B] flex-shrink-0" />
                      </div>
                      {(createFormData as any)._assigneeOpen && (
                        <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-xl border border-[#E5E5E7] shadow-lg z-30 overflow-hidden">
                          {users.map((u: any) => {
                            const selected = createFormData.assigneeIds.includes(u.id)
                            const name = u.full_name || u.email
                            return (
                              <button
                                key={u.id}
                                type="button"
                                onClick={() => toggleAssignee(u.id)}
                                className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-[#F5F5F7] transition-colors", selected && "bg-[#EEF4FF]")}
                              >
                                <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold uppercase flex-shrink-0", selected ? "bg-[#007AFF] text-white" : "bg-[#E5E5E7] text-[#86868B]")}>
                                  {name.charAt(0)}
                                </div>
                                <span className={cn("flex-1 text-left truncate", selected ? "font-medium text-[#007AFF]" : "text-[#1D1D1F]")}>{name}</span>
                                {selected && <CheckIcon className="w-3.5 h-3.5 text-[#007AFF] flex-shrink-0" />}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>

                    {/* Priority */}
                    <div>
                      <label className="text-[12px] font-medium text-[#1D1D1F] block mb-1.5">Priority</label>
                      <div className="relative">
                        <Flag className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" style={{ color: priorityColor }} />
                        <select
                          value={createFormData.priority}
                          onChange={(e) => setCreateFormData({ ...createFormData, priority: e.target.value as "low" | "medium" | "high" })}
                          className="w-full text-[13px] font-medium border border-[#D1D1D6] rounded-lg pl-8 pr-8 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF] appearance-none bg-white"
                          style={{ color: priorityColor }}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#86868B] pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[13px] font-medium text-[#1D1D1F] block mb-1.5">Description</label>
                    <div className="border border-[#D1D1D6] rounded-lg overflow-hidden">
                      {/* Toolbar */}
                      <div className="flex items-center gap-0.5 px-3 py-2 border-b border-[#E5E5E7] bg-white">
                        {[Bold, Italic, Underline].map((Icon, i) => (
                          <button key={i} type="button" className="p-1.5 rounded hover:bg-[#F5F5F7] text-[#1D1D1F]"><Icon className="w-3.5 h-3.5" /></button>
                        ))}
                        <div className="w-px h-4 bg-[#E5E5E7] mx-1" />
                        {[ListOrdered, List].map((Icon, i) => (
                          <button key={i} type="button" className="p-1.5 rounded hover:bg-[#F5F5F7] text-[#1D1D1F]"><Icon className="w-3.5 h-3.5" /></button>
                        ))}
                        <div className="w-px h-4 bg-[#E5E5E7] mx-1" />
                        {[Link, ImageIcon, AtSign, Smile].map((Icon, i) => (
                          <button key={i} type="button" className="p-1.5 rounded hover:bg-[#F5F5F7] text-[#86868B]"><Icon className="w-3.5 h-3.5" /></button>
                        ))}
                      </div>
                      <div className="relative">
                        <textarea
                          value={createFormData.description}
                          onChange={(e) => setCreateFormData({ ...createFormData, description: e.target.value })}
                          placeholder="Add description, notes, or requirements..."
                          maxLength={2000}
                          className="w-full text-[13px] text-[#1D1D1F] px-3 py-3 resize-none focus:outline-none min-h-[110px]"
                          rows={5}
                        />
                        <span className="absolute bottom-2 right-3 text-[11px] text-[#86868B]">{createFormData.description.length}/2000</span>
                      </div>
                    </div>
                  </div>

                  {/* Subtasks & Checklists */}
                  <div className="border border-[#E5E5E7] rounded-xl overflow-hidden">
                    {/* Section header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-[#E5E5E7]">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-semibold text-[#1D1D1F]">Subtasks &amp; Checklists</span>
                        <div className="w-4 h-4 rounded-full border border-[#86868B] flex items-center justify-center text-[9px] text-[#86868B] font-bold cursor-help" title="Add subtasks to break work into smaller pieces">i</div>
                      </div>
                      <div className="flex items-center gap-3">
                        {modalSubtasks.length > 0 && (
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-[#86868B]">Overall Progress</span>
                            <div className="w-24 h-1.5 bg-[#E5E5E7] rounded-full overflow-hidden">
                              <div className="h-full bg-[#007AFF] rounded-full" style={{ width: "0%" }} />
                            </div>
                            <span className="text-[11px] font-semibold text-[#007AFF]">0%</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowAddSubtaskRow(true)}
                          className="flex items-center gap-1 text-[12px] font-medium text-[#007AFF] hover:text-[#0051D5]"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add Subtask
                        </button>
                      </div>
                    </div>

                    {/* Subtask list */}
                    {modalSubtasks.length > 0 && (
                      <div className="divide-y divide-[#F5F5F7]">
                        {modalSubtasks.map((st, idx) => {
                          const assigneeName = st.assigneeId ? (users.find((u: any) => u.id === st.assigneeId)?.full_name || "") : ""
                          return (
                            <div key={idx} className="flex items-center gap-3 px-4 py-3 bg-white hover:bg-[#FAFAFA]">
                              <Circle className="w-4 h-4 text-[#86868B] flex-shrink-0" />
                              <span className="text-[13px] text-[#1D1D1F] flex-1 truncate">{idx + 1}. {st.title}</span>
                              {assigneeName && (
                                <div className="flex items-center gap-1.5">
                                  <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white text-[9px] font-bold flex items-center justify-center uppercase">{assigneeName.charAt(0)}</div>
                                  <span className="text-[11px] text-[#86868B]">{assigneeName}</span>
                                </div>
                              )}
                              {st.dueDate && (
                                <div className="flex items-center gap-1 text-[11px] text-[#86868B]">
                                  <Calendar className="w-3 h-3" />
                                  <span>{new Date(st.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                                </div>
                              )}
                              <button type="button" onClick={() => setModalSubtasks(prev => prev.filter((_, i) => i !== idx))} className="p-1 text-[#86868B] hover:text-[#FF3B30]">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    {/* Add subtask inline row */}
                    {showAddSubtaskRow && (
                      <div className="px-4 py-3 border-t border-[#E5E5E7] bg-[#FAFAFA] space-y-2.5">
                        <input
                          type="text"
                          placeholder="Subtask title"
                          value={newSubtaskRow.title}
                          onChange={(e) => setNewSubtaskRow(prev => ({ ...prev, title: e.target.value }))}
                          className="w-full text-[13px] border border-[#D1D1D6] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === "Escape") setShowAddSubtaskRow(false) }}
                        />
                        <div className="grid grid-cols-2 gap-2.5">
                          <div>
                            <label className="text-[11px] font-medium text-[#86868B] block mb-1">Due Date</label>
                            <input type="date" value={newSubtaskRow.dueDate} onChange={(e) => setNewSubtaskRow(prev => ({ ...prev, dueDate: e.target.value }))} className="w-full text-[12px] border border-[#D1D1D6] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white" />
                          </div>
                          <div>
                            <label className="text-[11px] font-medium text-[#86868B] block mb-1">Assign To</label>
                            <select value={newSubtaskRow.assigneeId} onChange={(e) => setNewSubtaskRow(prev => ({ ...prev, assigneeId: e.target.value }))} className="w-full text-[12px] border border-[#D1D1D6] rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF] bg-white">
                              <option value="">Unassigned</option>
                              {users.map((u: any) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" disabled={!newSubtaskRow.title.trim()} onClick={() => { if (!newSubtaskRow.title.trim()) return; setModalSubtasks(prev => [...prev, { ...newSubtaskRow }]); setNewSubtaskRow({ title: "", dueDate: "", assigneeId: "" }); setShowAddSubtaskRow(false) }} className="flex-1 text-[12px] font-semibold bg-[#007AFF] text-white rounded-lg py-1.5 hover:bg-[#0051D5] disabled:opacity-50">Add</button>
                          <button type="button" onClick={() => { setShowAddSubtaskRow(false); setNewSubtaskRow({ title: "", dueDate: "", assigneeId: "" }) }} className="flex-1 text-[12px] font-semibold bg-[#F5F5F7] text-[#1D1D1F] rounded-lg py-1.5 hover:bg-[#E5E5E7]">Cancel</button>
                        </div>
                      </div>
                    )}

                    {modalSubtasks.length === 0 && !showAddSubtaskRow && (
                      <div className="px-4 py-4 text-center text-[12px] text-[#86868B]">No subtasks yet. Click &quot;+ Add Subtask&quot; to add one.</div>
                    )}
                  </div>

                </div>

                {/* ── RIGHT PANEL ── */}
                <div className="w-[280px] flex-shrink-0 overflow-y-auto px-4 py-5 space-y-4 bg-white">

                  {/* Timeline & Commitment */}
                  <div className="border border-[#E5E5E7] rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#007AFF]" />
                      <span className="text-[13px] font-semibold text-[#1D1D1F]">Timeline &amp; Commitment</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] text-[#86868B] mb-1">Internal Due Date</p>
                        <input type="date" value={createFormData.dueDate} onChange={(e) => setCreateFormData({ ...createFormData, dueDate: e.target.value })} className="w-full text-[12px] border border-[#D1D1D6] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#007AFF]" />
                        <input type="time" value={createFormData.dueTime} onChange={(e) => setCreateFormData({ ...createFormData, dueTime: e.target.value })} className="w-full mt-1 text-[11px] text-[#86868B] border border-[#D1D1D6] rounded-lg px-2 py-1 focus:outline-none" />
                      </div>
                      <div>
                        <p className="text-[11px] font-medium text-[#FF3B30] mb-1">Client Promise Date <span className="text-[#FF3B30]">*</span></p>
                        <input type="date" value={createFormData.promisedDate} onChange={(e) => setCreateFormData({ ...createFormData, promisedDate: e.target.value })} className="w-full text-[12px] border border-[#D1D1D6] rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#FF3B30]" />
                        <input type="time" value={createFormData.promisedTime} onChange={(e) => setCreateFormData({ ...createFormData, promisedTime: e.target.value })} className="w-full mt-1 text-[11px] text-[#86868B] border border-[#D1D1D6] rounded-lg px-2 py-1 focus:outline-none" />
                      </div>
                    </div>
                  </div>

                  {/* Buffer Time */}
                  {bufferDays !== null && (
                    <div className={cn("border rounded-xl p-3 flex items-center justify-between", isOnTrack ? "border-[#34C75933] bg-[#F0FFF4]" : "border-[#FF3B3033] bg-[#FFF0F0]")}>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className={cn("w-4 h-4", isOnTrack ? "text-[#34C759]" : "text-[#FF3B30]")} />
                        <div>
                          <p className={cn("text-[12px] font-semibold", isOnTrack ? "text-[#34C759]" : "text-[#FF3B30]")}>Buffer Time</p>
                          <p className="text-[11px] text-[#86868B]">{isOnTrack ? "We will deliver before the client promise date." : "Promised date is before or same as due date."}</p>
                        </div>
                      </div>
                      <span className={cn("text-[12px] font-bold", isOnTrack ? "text-[#34C759]" : "text-[#FF3B30]")}>{bufferDays} Days</span>
                    </div>
                  )}

                  {/* Task Health */}
                  {bufferDays !== null && (
                    <div className="border border-[#E5E5E7] rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-base">🤍</span>
                          <span className="text-[13px] font-semibold text-[#1D1D1F]">Task Health</span>
                        </div>
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", isOnTrack ? "bg-[#E8F8F0] text-[#34C759]" : "bg-[#FFF0F0] text-[#FF3B30]")}>
                          {isOnTrack ? "On Track" : "At Risk"}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-[12px] text-[#86868B] flex-1">
                          {isOnTrack ? `Great! You have ` : "No buffer — "}
                          {isOnTrack && <span className="text-[#34C759] font-semibold">{bufferDays} days</span>}
                          {isOnTrack ? " buffer before the client promise." : "delivery is at risk."}
                        </p>
                        <div className="relative w-12 h-12 flex-shrink-0">
                          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E5E7" strokeWidth="4" />
                            <circle cx="24" cy="24" r="20" fill="none" stroke={isOnTrack ? "#34C759" : "#FF3B30"} strokeWidth="4" strokeDasharray={`${Math.min(100, Math.max(0, (bufferDays / 7) * 100)) * 1.257} 125.7`} strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={cn("text-[12px] font-bold leading-none", isOnTrack ? "text-[#34C759]" : "text-[#FF3B30]")}>{bufferDays}</span>
                            <span className="text-[8px] text-[#86868B]">Days</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Quick Templates */}
                  <div className="border border-[#E5E5E7] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-[#86868B]" />
                        <span className="text-[13px] font-semibold text-[#1D1D1F]">Quick Templates</span>
                      </div>
                      <button type="button" className="text-[11px] text-[#007AFF] font-medium hover:underline">View all</button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {QUICK_TEMPLATES.map((t) => (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => setCreateFormData(prev => ({ ...prev, title: prev.title || t.label }))}
                          className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-[#E5E5E7] hover:border-[#007AFF] hover:bg-[#EEF4FF] transition-colors text-left"
                        >
                          <span className="text-base leading-none">{t.icon}</span>
                          <span className="text-[11px] font-medium text-[#1D1D1F] leading-tight">{t.label}</span>
                        </button>
                      ))}
                      <button
                        type="button"
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg border border-dashed border-[#007AFF] hover:bg-[#EEF4FF] transition-colors text-left"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#007AFF]" />
                        <span className="text-[11px] font-medium text-[#007AFF]">Custom Task</span>
                      </button>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="border border-[#E5E5E7] rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Tag className="w-4 h-4 text-[#86868B]" />
                      <span className="text-[13px] font-semibold text-[#1D1D1F]">Tags</span>
                      <span className="text-[11px] text-[#86868B]">(Optional)</span>
                    </div>
                    {createFormData.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {createFormData.tags.map((t) => (
                          <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F5F5F7] border border-[#E5E5E7] text-[11px] text-[#1D1D1F] font-medium">
                            {t}
                            <button type="button" onClick={() => removeTag(t)} className="text-[#86868B] hover:text-[#FF3B30]"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        placeholder="+ Add Tag"
                        className="flex-1 text-[12px] text-[#007AFF] placeholder-[#007AFF] bg-transparent border-none outline-none"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault()
                            addTag((e.target as HTMLInputElement).value);
                            (e.target as HTMLInputElement).value = ""
                          }
                        }}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-[#E5E5E7] bg-white">
                <button type="button" className="flex items-center gap-2 text-[12px] text-[#86868B] font-medium hover:text-[#1D1D1F] transition-colors">
                  <Paperclip className="w-3.5 h-3.5" />
                  Save as Template
                </button>
                <div className="flex items-center gap-2.5">
                  <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2 text-[13px] font-medium text-[#1D1D1F] border border-[#D1D1D6] rounded-lg hover:bg-[#F5F5F7] transition-colors">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!createFormData.title.trim() || !createFormData.clientId || isCreating}
                    onClick={handleCreateTask}
                    className="px-4 py-2 text-[13px] font-medium text-[#1D1D1F] border border-[#D1D1D6] rounded-lg hover:bg-[#F5F5F7] transition-colors disabled:opacity-40"
                    title="Save and create another task"
                  >
                    Save &amp; Create Another
                  </button>
                  <button
                    type="button"
                    disabled={!createFormData.title.trim() || !createFormData.clientId || isCreating}
                    onClick={handleCreateTask}
                    className="px-5 py-2 text-[13px] font-semibold text-white bg-[#007AFF] hover:bg-[#0051D5] rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Task"}
                  </button>
                </div>
              </div>

            </div>
          </div>
        )
      })()}
    </div>
  )
}
