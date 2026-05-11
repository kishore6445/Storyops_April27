"use client"

import { Check, Clock, AlertCircle, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubtaskCardProps {
  id: string
  referenceId?: string
  title: string
  status: "pending" | "created" | "in_progress" | "in_review" | "done"
  assignee?: { id: string; full_name: string; email: string }
  dueDate?: string
  mainTaskTitle?: string
  mainTaskId?: string
  isAssignedToCurrentUser?: boolean
  isOwnedByCurrentUser?: boolean
  onTaskClick?: (taskId: string) => void
  onStatusChange?: (status: string) => void
  priority?: "high" | "medium" | "low"
}

export function SubtaskCard({
  id,
  referenceId,
  title,
  status,
  assignee,
  dueDate,
  mainTaskTitle,
  mainTaskId,
  isAssignedToCurrentUser,
  isOwnedByCurrentUser,
  onTaskClick,
  onStatusChange,
  priority = "medium"
}: SubtaskCardProps) {
  const isOverdue = dueDate && new Date(dueDate) < new Date() && status !== "done"
  const isIndependent = isAssignedToCurrentUser && !isOwnedByCurrentUser

  // Status colors
  const statusColorMap = {
    done: { bg: "bg-green-50", border: "border-green-300", text: "text-green-700", badge: "bg-green-100" },
    in_review: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-700", badge: "bg-amber-100" },
    in_progress: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-700", badge: "bg-blue-100" },
    pending: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", badge: "bg-gray-100" },
    created: { bg: "bg-gray-50", border: "border-gray-300", text: "text-gray-700", badge: "bg-gray-100" }
  }

  const priorityColorMap = {
    high: "text-red-600",
    medium: "text-yellow-600",
    low: "text-green-600"
  }

  const colors = statusColorMap[status as keyof typeof statusColorMap] || statusColorMap.pending

  const handleStatusClick = () => {
    if (!onStatusChange) return
    
    const statusCycle = {
      pending: "in_progress",
      in_progress: "done",
      done: "done",
      created: "pending",
      in_review: "done",
    }
    const newStatus = statusCycle[status as keyof typeof statusCycle] || "pending"
    onStatusChange(newStatus)
  }

  // If user is assigned to subtask but not owner, show as independent card
  if (isIndependent) {
    return (
      <div
        className={cn(
          "border-l-4 border-blue-500 rounded-lg p-4 transition-all hover:shadow-md cursor-pointer group",
          colors.bg,
          "space-y-3"
        )}
      >
        {/* Header with Reference ID and Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono bg-white px-2 py-1 rounded text-blue-600 font-semibold">
                {referenceId || id}
              </span>
              <span className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.15em]",
                colors.badge
              )}>
                {status.replace("_", " ")}
              </span>
            </div>
            <h3 className={cn(
              "text-sm font-semibold leading-tight",
              status === "done" ? "text-gray-400 line-through" : "text-gray-900"
            )}>
              {title}
            </h3>
          </div>

          {/* Status Toggle Button */}
          <button
            onClick={handleStatusClick}
            className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full border-2 transition-all hover:scale-110"
            style={{
              borderColor: status === "done" ? "#10b981" : 
                status === "in_progress" ? "#3b82f6" :
                "#d1d5db",
              backgroundColor: status === "done" ? "#10b981" : 
                status === "in_progress" ? "#3b82f6" :
                "transparent"
            }}
            title="Click to advance subtask status"
          >
            {status === "done" && <Check className="w-3.5 h-3.5 text-white" />}
            {status === "in_progress" && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
          </button>
        </div>

        {/* Metadata Row */}
        <div className="flex flex-wrap items-center gap-3 text-xs">
          {/* Assignee Badge - Always shows "Assigned to You" for independent cards */}
          <div className="flex items-center gap-1.5 bg-white rounded px-2.5 py-1.5 border border-blue-200">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-500" />
            <span className="font-medium text-blue-700">Assigned to You</span>
          </div>

          {/* Due Date */}
          {dueDate && (
            <div className={cn(
              "flex items-center gap-1 px-2.5 py-1.5 rounded border",
              isOverdue ? "bg-red-100 border-red-300 text-red-700 font-semibold" : "bg-white border-gray-200 text-gray-600"
            )}>
              <Clock className="w-3.5 h-3.5" />
              {new Date(dueDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
            </div>
          )}

          {/* Priority */}
          {priority && (
            <div className={cn("font-semibold text-xs uppercase tracking-wide", priorityColorMap[priority])}>
              {priority}
            </div>
          )}
        </div>

        {/* Main Task Link */}
        {mainTaskId && mainTaskTitle && (
          <div
            onClick={() => onTaskClick?.(mainTaskId)}
            className="pt-3 border-t border-blue-200 flex items-center justify-between hover:bg-blue-100/50 rounded px-2 py-2 transition-colors group/link"
          >
            <div className="min-w-0">
              <p className="text-[11px] text-blue-600 font-medium uppercase tracking-wide">Primary Task</p>
              <p className="text-sm text-gray-700 truncate mt-1">{mainTaskTitle}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-blue-500 flex-shrink-0 ml-2 opacity-0 group-hover/link:opacity-100 transition-opacity" />
          </div>
        )}

        {/* Overdue Warning */}
        {isOverdue && (
          <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            <p className="text-xs font-medium text-red-700">This subtask is overdue</p>
          </div>
        )}
      </div>
    )
  }

  // Otherwise, render as part of the parent task's subtask list (shouldn't reach here normally)
  // This is a fallback - the main display happens in TaskSubtasks component
  return null
}
