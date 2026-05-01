"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { Task } from "./my-tasks-today"
import { cn } from "@/lib/utils"
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Calendar, Archive, Copy } from "lucide-react"
import { TaskTimer } from "./task-timer"

interface KanbanColumn {
  id: string
  title: string
  tasks: Task[]
  color?: string
  icon: React.ReactNode
  bgColor: string
  accentColor?: string
}

interface TaskKanbanProps {
  tasks: Task[]
  onTaskStatusChange?: (taskId: string, newStatus: string) => Promise<void>
  isLoading?: boolean
  onTaskUpdate?: (taskId: string) => void
  onEditTask?: (task: Task) => void
  selectedTaskIds?: Set<string>
  onToggleTaskSelection?: (taskId: string) => void
  showCheckboxes?: boolean
  onArchive?: (taskId: string) => void
  subtaskCounts?: Record<string, number>
  expandedParentTaskIds?: Set<string>
  onToggleParentExpand?: (taskId: string) => void
  parentTaskSubtasks?: any[]
}

const CARDS_PER_COLUMN_LIMIT = 6

export function TaskKanban({
  tasks,
  onTaskStatusChange,
  isLoading,
  onTaskUpdate,
  onEditTask,
  selectedTaskIds,
  onToggleTaskSelection,
  showCheckboxes,
  onArchive,
  subtaskCounts = {},
  expandedParentTaskIds = new Set(),
  onToggleParentExpand,
  parentTaskSubtasks = [],
}: TaskKanbanProps) {
  const router = useRouter()
  const [draggedTask, setDraggedTask] = useState<Task | null>(null)
  const [sourceColumn, setSourceColumn] = useState<string | null>(null)
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const [expandedDoneColumn, setExpandedDoneColumn] = useState(true)
  const [expandedColumns, setExpandedColumns] = useState<Record<string, boolean>>({})
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const handleCopyTaskId = (taskId: string) => {
    navigator.clipboard.writeText(taskId)
    setCopiedId(taskId)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleArchiveTask = async (taskId: string) => {
    setArchivingId(taskId)
    try {
      const token = localStorage.getItem("sessionToken")
      const res = await fetch("/api/tasks/archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ taskId, action: "archive" }),
      })
      if (res.ok) {
        onArchive?.(taskId)
      }
    } catch (err) {
      console.error("[v0] Archive failed:", err)
    } finally {
      setArchivingId(null)
    }
  }

  const doneTasks = tasks.filter((t) => t.status === "done" || t.completed)

  const getBorderColor = (dueDate?: string): string => {
    if (!dueDate) return "#86868B"
    try {
      const due = new Date(dueDate)
      const today = new Date()
      if (isNaN(due.getTime())) return "#86868B"
      today.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) return "#FF3B30"
      if (diffDays === 0) return "#FF9500"
      if (diffDays === 1) return "#007AFF"
      return "#86868B"
    } catch {
      return "#86868B"
    }
  }

  const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false
    try {
      const due = new Date(dueDate)
      if (isNaN(due.getTime())) return false
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      return due < today
    } catch {
      return false
    }
  }

  const isDueToday = (dueDate?: string): boolean => {
    if (!dueDate) return false
    try {
      const due = new Date(dueDate)
      if (isNaN(due.getTime())) return false
      return due.toDateString() === new Date().toDateString()
    } catch {
      return false
    }
  }

  const getUrgencyStatus = (dueDate: string): { color: string; dotBg: string; label: string } | null => {
    if (!dueDate) return null
    try {
      const due = new Date(dueDate)
      if (isNaN(due.getTime())) return null
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      due.setHours(0, 0, 0, 0)
      const diffDays = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) return { color: "#FF3B30", dotBg: "#FF3B30", label: "Overdue" }
      if (diffDays === 0) return { color: "#FF9500", dotBg: "#FF9500", label: "Due today" }
      if (diffDays === 1) return { color: "#FF9500", dotBg: "#FF9500", label: "Due tomorrow" }
      return { color: "#86868B", dotBg: "#86868B", label: "Upcoming" }
    } catch {
      return null
    }
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return null
    try {
      const date = new Date(dateStr)
      const today = new Date()
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      if (date.toDateString() === today.toDateString()) return "Today"
      if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow"
      if (date < today) return "Overdue"
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
    } catch {
      return null
    }
  }

  const statusMap: Record<string, string> = {
    todo: "Waiting",
    pending: "Waiting",
    in_progress: "Working",
    in_review: "Review",
    done: "Done",
  }

  const columnStatuses = ["todo", "in_progress", "in_review"]

  const getNormalizedStatus = (status: string | undefined): string => {
    const s = status || "todo"
    if (s === "pending") return "todo"
    return s
  }

  const columns: KanbanColumn[] = columnStatuses
    .map((status) => ({
      id: status,
      title: statusMap[status],
      tasks: tasks.filter((t) => getNormalizedStatus(t.status) === status),
      color: { todo: "border-gray-200", in_progress: "border-blue-200", in_review: "border-purple-200", done: "border-green-200" }[status],
      bgColor: "bg-white",
      accentColor: { todo: "text-gray-500", in_progress: "text-blue-500", in_review: "text-purple-500", done: "text-green-500" }[status],
      icon: { todo: <Circle className="w-4 h-4" />, in_progress: <Circle className="w-4 h-4" />, in_review: <Circle className="w-4 h-4" />, done: <CheckCircle2 className="w-4 h-4" /> }[status] || <Circle className="w-4 h-4" />,
    }))
    .filter((col) => col.id !== "done")

  const handleDragStart = (task: Task, columnId: string) => {
    setDraggedTask(task)
    setSourceColumn(columnId)
    setIsAnimating(true)
  }

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault()
    setDragOverColumn(columnId)
  }

  const handleDragLeave = () => setDragOverColumn(null)

  const handleDrop = async (columnId: string) => {
    if (!draggedTask || sourceColumn === columnId) {
      setDraggedTask(null)
      setSourceColumn(null)
      setDragOverColumn(null)
      setIsAnimating(false)
      return
    }
    const statusMapping: Record<string, string> = {
      todo: "todo",
      pending: "todo",
      in_progress: "in_progress",
      in_review: "in_review",
      done: "done",
    }
    setIsAnimating(true)
    await onTaskStatusChange?.(draggedTask.id, statusMapping[columnId] || columnId)
    setTimeout(() => {
      setDraggedTask(null)
      setSourceColumn(null)
      setDragOverColumn(null)
      setIsAnimating(false)
    }, 300)
  }

  const toggleColumnExpand = (columnId: string) => {
    setExpandedColumns((prev) => ({ ...prev, [columnId]: !prev[columnId] }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Loading tasks...</p>
      </div>
    )
  }

  return (
    <div className="w-full bg-white min-h-screen flex">
      {/* Left side: Active work columns */}
      <div className="flex-1 overflow-x-auto border-r border-gray-200">
        <div className="flex gap-8 px-8 py-8 w-full" style={{ minWidth: "fit-content" }}>
          {columns.map((column) => {
            const isExpanded = expandedColumns[column.id]
            const hasMore = column.tasks.length > CARDS_PER_COLUMN_LIMIT
            const displayTasks = isExpanded ? column.tasks : column.tasks.slice(0, CARDS_PER_COLUMN_LIMIT)

            return (
              <div
                key={column.id}
                className={cn(
                  "flex flex-col rounded-lg border flex-shrink-0 transition-all duration-200 shadow-sm overflow-hidden w-96",
                  dragOverColumn === column.id && draggedTask
                    ? "border-blue-400 bg-blue-50 shadow-md ring-1 ring-blue-200"
                    : "border-gray-200 bg-white hover:shadow-md hover:border-gray-300",
                  draggedTask && sourceColumn !== column.id && "opacity-100"
                )}
                onDragOver={(e) => handleDragOver(e, column.id)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(column.id)}
              >
                {/* Column Header */}
                <div className="sticky top-0 z-10 px-4 py-4 flex items-center justify-between border-b border-gray-100 bg-white">
                  <h3 className="font-semibold text-sm text-gray-800">
                    {column.title} ({column.tasks.length})
                  </h3>
                </div>

                {/* Tasks Container */}
                <div className="flex-1 px-4 py-4 space-y-4 overflow-y-auto max-h-[calc(100vh-240px)]">
                  {displayTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center opacity-50">
                      <p className="text-xs text-gray-500 font-medium">
                        {column.tasks.length === 0 ? "No tasks" : "No tasks to show"}
                      </p>
                    </div>
                  ) : (
                    <>
                      {displayTasks.map((task) => {
                        const isSubtaskCard = (task as any).isSubtask === true
                        const dueDate = formatDate(task.dueDate)
                        const urgencyStatus = getUrgencyStatus(task.dueDate)
                        const borderColor = getBorderColor(task.dueDate)
                        const isToday = isDueToday(task.dueDate)
                        const isTaskOverdue = isOverdue(task.dueDate)
                        const isDone = task.status === "done" || task.completed
                        const taskSubtaskCount = subtaskCounts[task.id] || 0
                        const isParentExpanded = expandedParentTaskIds.has(task.id)
                        const nestedSubtasks = parentTaskSubtasks.filter((st) => st.parentTaskId === task.id)

                        return (
                          <div key={task.id} className="flex flex-col">
                            {/* Main Task Card */}
                            <div
                              draggable
                              onDragStart={() => handleDragStart(task, column.id)}
                              onClick={() => {
                                if (task.type !== "task") return
                                if (isSubtaskCard) {
                                  router.push(`/tasks/${(task as any).parentTaskId}`)
                                } else {
                                  router.push(`/tasks/${task.id}`)
                                }
                              }}
                              style={{
                                borderLeftColor: isSubtaskCard ? "#007AFF" : (isDone && isTaskOverdue ? "#FF3B30" : borderColor),
                                borderLeftWidth: isSubtaskCard ? "3px" : "1px",
                              }}
                              className={cn(
                                "group relative rounded-lg border border-gray-200 p-4 cursor-move transition-all duration-150",
                                "hover:shadow-md hover:border-gray-300 active:scale-95",
                                draggedTask?.id === task.id ? "opacity-50 shadow-lg ring-2 ring-blue-200" : "",
                                isSubtaskCard ? "bg-blue-50 border-blue-100" : "",
                                !isSubtaskCard && isDone ? "bg-white border-green-200" : "",
                                !isSubtaskCard && !isDone && isTaskOverdue ? "bg-red-50 border-red-300" : "",
                                !isSubtaskCard && !isDone && isToday && !isTaskOverdue ? "bg-orange-50 border-orange-200" : "",
                                !isSubtaskCard && !isDone && !isTaskOverdue && !isToday ? "bg-white" : "",
                                "flex flex-col gap-2"
                              )}
                            >
                              {/* Subtask badge - shown when this card is itself a subtask */}
                              {isSubtaskCard && (
                                <div className="flex items-center gap-1 text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded w-fit">
                                  <span>SUBTASK</span>
                                </div>
                              )}

                              {/* Task ID row + subtask count badge + expand button + copy */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                                    {task.taskId || task.id.slice(0, 6).toUpperCase()}
                                  </span>
                                  {/* Subtask count badge: blue dot + number */}
                                  {taskSubtaskCount > 0 && !isSubtaskCard && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
                                      {taskSubtaskCount}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1">
                                  {/* Expand/collapse button - only for tasks with subtasks */}
                                  {taskSubtaskCount > 0 && !isSubtaskCard && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        onToggleParentExpand?.(task.id)
                                      }}
                                      className="p-1 rounded hover:bg-blue-100 transition-colors"
                                      title={isParentExpanded ? "Collapse subtasks" : "Expand subtasks"}
                                    >
                                      {isParentExpanded ? (
                                        <ChevronUp className="w-4 h-4 text-blue-500" />
                                      ) : (
                                        <ChevronDown className="w-4 h-4 text-blue-500" />
                                      )}
                                    </button>
                                  )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleCopyTaskId(task.taskId || task.id)
                                    }}
                                    className="p-1 rounded hover:bg-gray-100 transition-colors"
                                    title="Copy task number"
                                  >
                                    <Copy className={`w-3.5 h-3.5 ${copiedId === (task.taskId || task.id) ? "text-green-500" : "text-gray-400 hover:text-gray-600"}`} />
                                  </button>
                                </div>
                              </div>

                              {/* Parent task reference - only for subtask cards */}
                              {isSubtaskCard && (task as any).parentTaskTitle && (
                                <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200">
                                  Parent: {(task as any).parentTaskTitle}
                                </div>
                              )}

                              {/* Client name - only for regular tasks */}
                              {task.clientName && !isSubtaskCard && (
                                <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {task.clientName}
                                </div>
                              )}

                              {/* Task title */}
                              <h4 className="text-sm font-semibold text-gray-900 line-clamp-2 leading-snug">
                                {task.title}
                              </h4>

                              {/* Due date */}
                              {dueDate && (
                                <div className="flex items-center gap-2 text-xs text-gray-600">
                                  <Calendar className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                  <span style={{ color: urgencyStatus?.color || "#86868B" }} className="font-medium">
                                    {dueDate}
                                  </span>
                                  {urgencyStatus && (
                                    <span
                                      style={{ backgroundColor: urgencyStatus.dotBg }}
                                      className="w-2 h-2 rounded-full flex-shrink-0 ml-auto"
                                      title={urgencyStatus.label}
                                    />
                                  )}
                                </div>
                              )}

                              {/* Pomodoro Timer */}
                              <div className="mt-3 -mx-4 -mb-4 px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                                <TaskTimer taskId={task.id} taskTitle={task.title} compact variant="minimal" />
                              </div>
                            </div>

                            {/* Expanded subtask list - renders below the card when expanded */}
                            {isParentExpanded && !isSubtaskCard && nestedSubtasks.length > 0 && (
                              <div className="mt-1 ml-4 border-l-2 border-blue-300 pl-3 space-y-1">
                                {nestedSubtasks.map((subtask) => (
                                  <div
                                    key={subtask.id}
                                    className="flex items-start justify-between gap-2 bg-blue-50 border border-blue-200 rounded-md px-3 py-2 cursor-pointer hover:bg-blue-100 transition-colors"
                                    onClick={() => router.push(`/tasks/${subtask.parentTaskId}`)}
                                    title={`Subtask: ${subtask.title}`}
                                  >
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-semibold text-blue-700 truncate">
                                        [S] {subtask.reference_id || subtask.id.slice(0, 8).toUpperCase()}
                                      </p>
                                      <p className="text-xs text-gray-700 line-clamp-1 mt-0.5">{subtask.title}</p>
                                    </div>
                                    <span className="flex-shrink-0 inline-flex items-center rounded bg-blue-200 px-1.5 py-0.5 text-xs font-medium text-blue-800">
                                      {subtask.status?.replace(/_/g, " ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}

                      {/* Show More / Show Less */}
                      {hasMore && (
                        <div className="flex justify-center mt-2">
                          <button
                            onClick={() => toggleColumnExpand(column.id)}
                            className="text-blue-600 text-sm font-medium hover:underline cursor-pointer transition-colors"
                          >
                            {isExpanded ? "Show less" : `Show more (${column.tasks.length - CARDS_PER_COLUMN_LIMIT})`}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Right side: Done panel */}
      <div
        className={cn(
          "w-96 bg-white border-l border-gray-200 flex flex-col overflow-hidden transition-colors",
          dragOverColumn === "done" && draggedTask ? "bg-green-50 border-green-300" : ""
        )}
        onDragOver={(e) => handleDragOver(e, "done")}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop("done")}
      >
        <div className="px-6 py-6 border-b border-gray-100">
          <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            Done ({doneTasks.length})
          </h3>
          <p className="text-xs text-gray-500 mt-1">Completed tasks</p>
        </div>

        <div className="flex-1 overflow-y-auto">
          {doneTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="w-10 h-10 text-gray-300 mb-2" />
              <p className="text-xs text-gray-500 font-medium">No completed tasks yet</p>
              <p className="text-xs text-gray-400 mt-1">Keep working, you&apos;ll get here soon!</p>
            </div>
          ) : (
            <div className="px-4 py-4 space-y-3">
              {doneTasks
                .sort((a, b) => {
                  const aCompleted = a.completed ? 1 : 0
                  const bCompleted = b.completed ? 1 : 0
                  return aCompleted - bCompleted || a.id.localeCompare(b.id)
                })
                .map((task) => {
                  const isSubtaskCard = (task as any).isSubtask === true
                  return (
                    <div
                      key={task.id}
                      draggable
                      onDragStart={() => handleDragStart(task, "done")}
                      onClick={() => {
                        if (task.type !== "task") return
                        if (isSubtaskCard) {
                          router.push(`/tasks/${(task as any).parentTaskId}`)
                        } else {
                          router.push(`/tasks/${task.id}`)
                        }
                      }}
                      className={cn(
                        "group p-3 rounded-lg border hover:shadow-sm transition-all cursor-move active:scale-95",
                        isSubtaskCard
                          ? "border-blue-200 bg-blue-50 hover:border-blue-300"
                          : "border-green-100 bg-green-50 hover:border-green-200"
                      )}
                      style={{
                        borderLeftColor: isSubtaskCard ? "#007AFF" : undefined,
                        borderLeftWidth: isSubtaskCard ? "3px" : undefined,
                      }}
                    >
                      {isSubtaskCard && (
                        <div className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-0.5 rounded w-fit mb-1">
                          SUBTASK
                        </div>
                      )}
                      <div className={`text-xs font-medium ${isSubtaskCard ? "text-blue-700" : "text-green-700"} uppercase tracking-wide mb-1`}>
                        {task.taskId || task.id.slice(0, 6).toUpperCase()}
                      </div>
                      {isSubtaskCard && (task as any).parentTaskTitle && (
                        <div className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-200 mb-2">
                          Parent: {(task as any).parentTaskTitle}
                        </div>
                      )}
                      {task.clientName && !isSubtaskCard && (
                        <div className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded mb-2">
                          {task.clientName}
                        </div>
                      )}
                      <h4 className="text-sm font-medium text-gray-800 line-clamp-2 leading-snug group-hover:text-gray-900">
                        {task.title}
                      </h4>
                      {!isSubtaskCard && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchiveTask(task.id)
                          }}
                          disabled={archivingId === task.id}
                          className="mt-2 flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-orange-600 hover:bg-orange-50 border border-gray-200 hover:border-orange-200 rounded transition-all disabled:opacity-40 w-full justify-center"
                        >
                          <Archive className="w-3 h-3" />
                          {archivingId === task.id ? "Archiving..." : "Archive"}
                        </button>
                      )}
                    </div>
                  )
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
