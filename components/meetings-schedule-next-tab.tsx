"use client"

import { useState } from "react"
import { Calendar, Plus, X } from "lucide-react"

interface Meeting {
  id: string
  date: string
  time: string
  client_name?: string
  attendees?: Array<{ id: string; full_name: string; email: string }>
}

interface MeetingsScheduleNextTabProps {
  meeting: Meeting
  onUpdate?: () => void
}

export function MeetingsScheduleNextTab({ meeting, onUpdate }: MeetingsScheduleNextTabProps) {
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    title: `Follow-up: ${meeting.client_name || "Meeting"}`,
    date: "",
    time: "",
    attendee_ids: meeting.attendees?.map(a => a.id) || [],
  })

  const handleSchedule = async () => {
    if (!formData.date || !formData.time) return

    try {
      const token = localStorage.getItem("sessionToken")
      const response = await fetch(`/api/meetings/${meeting.id}/schedule-next`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          title: formData.title,
          date: formData.date,
          time: formData.time,
          attendee_ids: formData.attendee_ids,
        }),
      })

      if (response.ok) {
        setShowForm(false)
        setFormData({
          title: `Follow-up: ${meeting.client_name || "Meeting"}`,
          date: "",
          time: "",
          attendee_ids: meeting.attendees?.map(a => a.id) || [],
        })
        onUpdate?.()
      }
    } catch (error) {
      console.error("[v0] Error scheduling meeting:", error)
    }
  }

  if (showForm) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Schedule Follow-up Meeting</h3>
          <button
            onClick={() => setShowForm(false)}
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
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                Time
              </label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {meeting.attendees && meeting.attendees.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 font-semibold uppercase tracking-wide block mb-2">
                Attendees
              </label>
              <div className="space-y-2">
                {meeting.attendees.map((attendee) => (
                  <div key={attendee.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`attendee-${attendee.id}`}
                      checked={formData.attendee_ids.includes(attendee.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            attendee_ids: [...formData.attendee_ids, attendee.id],
                          })
                        } else {
                          setFormData({
                            ...formData,
                            attendee_ids: formData.attendee_ids.filter(id => id !== attendee.id),
                          })
                        }
                      }}
                      className="rounded border-gray-300"
                    />
                    <label htmlFor={`attendee-${attendee.id}`} className="text-sm text-gray-700">
                      {attendee.full_name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleSchedule}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Schedule Meeting
            </button>
            <button
              onClick={() => setShowForm(false)}
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
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule Next Meeting</h3>
        <p className="text-sm text-gray-600">Plan the follow-up meeting</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-6 text-center">
        <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h4 className="text-sm font-semibold text-gray-900 mb-1">No next meeting scheduled</h4>
        <p className="text-sm text-gray-600 mb-4">Schedule a follow-up meeting with the team</p>
        <button 
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Schedule Meeting
        </button>
      </div>
    </div>
  )
}
