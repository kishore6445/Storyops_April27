"use client"

import { useState } from "react"
import { Copy, Share2, ExternalLink, Check, Pencil, Save, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface Meeting {
  id: string
  title?: string
  client_id?: string
  client_name?: string
  date: string
  time: string
  attendees: Array<{ id: string; full_name: string; email: string }>
  status: "scheduled" | "completed" | "cancelled"
  notes?: string
  recording_url?: string
}

interface MeetingsDetailsPanelProps {
  meeting: Meeting
  onUpdate: () => void
}

export function MeetingsDetailsPanel({
  meeting,
  onUpdate,
}: MeetingsDetailsPanelProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [editedData, setEditedData] = useState({
    title: meeting.title || "",
    client_name: meeting.client_name || meeting.client_id || "",
    date: meeting.date,
    time: meeting.time,
    notes: meeting.notes || "",
  })

  const formatDate = (date: string, time: string) => {
    const d = new Date(`${date}T${time}`)
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleCopy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const handleSave = async () => {
    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: editedData.title,
          client_name: editedData.client_name,
          date: editedData.date,
          time: editedData.time,
          notes: editedData.notes,
        }),
      })

      if (response.ok) {
        setIsEditing(false)
        onUpdate()
      }
    } catch (error) {
      console.error("[v0] Error updating meeting:", error)
    }
  }

  const meetingInfo = {
    title: editedData.title || `Meeting with ${editedData.client_name}`,
    client: editedData.client_name || "Unknown",
    dateTime: formatDate(editedData.date, editedData.time),
    attendees: meeting.attendees?.map((a) => a.full_name).join(", ") || "No attendees",
    attendeesEmails: meeting.attendees?.map((a) => a.email).filter(Boolean).join(", ") || "No emails",
    agenda: editedData.notes || "No agenda provided",
  }

  const shareText = `Meeting: ${meetingInfo.title}\n${meetingInfo.dateTime}\nAttendees: ${meetingInfo.attendees}`
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`

  if (isEditing) {
    return (
      <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit Meeting Details</h3>
          <button
            onClick={() => setIsEditing(false)}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
              Meeting Title
            </label>
            <input
              type="text"
              value={editedData.title}
              onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
              Client Name
            </label>
            <input
              type="text"
              value={editedData.client_name}
              onChange={(e) => setEditedData({ ...editedData, client_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                Date
              </label>
              <input
                type="date"
                value={editedData.date}
                onChange={(e) => setEditedData({ ...editedData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                Time
              </label>
              <input
                type="time"
                value={editedData.time}
                onChange={(e) => setEditedData({ ...editedData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
              Agenda/Notes
            </label>
            <textarea
              value={editedData.notes}
              onChange={(e) => setEditedData({ ...editedData, notes: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 font-medium rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 bg-white rounded-xl border border-gray-200 p-6">
      {/* Quick Copy Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-light text-gray-900">{meetingInfo.title}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(shareText, "all")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
                copiedField === "all"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700"
              )}
            >
              {copiedField === "all" ? (
                <>
                  <Check className="w-4 h-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  Copy All
                </>
              )}
            </button>
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>

        {/* Client & Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
              Client
            </p>
            <p className="text-sm font-medium text-gray-900">{meetingInfo.client}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-1">
              Date & Time
            </p>
            <p className="text-sm font-medium text-gray-900">{meetingInfo.dateTime}</p>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200" />

      {/* Agenda/Notes */}
      {editedData.notes && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              Agenda
            </p>
            <button
              onClick={() => handleCopy(editedData.notes, "agenda")}
              className={cn(
                "p-1.5 rounded transition-colors",
                copiedField === "agenda"
                  ? "bg-green-100"
                  : "hover:bg-gray-100"
              )}
              title="Copy agenda"
            >
              {copiedField === "agenda" ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
            {editedData.notes}
          </p>
        </div>
      )}

      {/* Attendees */}
      {meeting.attendees.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
              Attendees
            </p>
            <button
              onClick={() => handleCopy(meetingInfo.attendeesEmails, "emails")}
              className={cn(
                "p-1.5 rounded transition-colors",
                copiedField === "emails"
                  ? "bg-green-100"
                  : "hover:bg-gray-100"
              )}
              title="Copy emails"
            >
              {copiedField === "emails" ? (
                <Check className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400" />
              )}
            </button>
          </div>
          <div className="space-y-2">
            {meeting.attendees.map((attendee) => (
              <div
                key={attendee.id}
                className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    {attendee.full_name}
                  </p>
                  <p className="text-xs text-gray-500">{attendee.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recording Link */}
      {meeting.recording_url && (
        <div>
          <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide mb-2">
            Recording
          </p>
          <a
            href={meeting.recording_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg text-sm font-medium transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Recording
          </a>
        </div>
      )}

      <div className="border-t border-gray-200" />

      {/* Share Actions */}
      <div className="grid grid-cols-2 gap-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium transition-colors"
        >
          <Share2 className="w-4 h-4" />
          WhatsApp
        </a>
        <a
          href={`mailto:?subject=${encodeURIComponent(meetingInfo.title)}&body=${encodeURIComponent(shareText)}`}
          className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
        >
          <Share2 className="w-4 h-4" />
          Email
        </a>
      </div>
    </div>
  )
}
