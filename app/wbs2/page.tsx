"use client"

import { useState, useCallback } from "react"
import {
  initialWorkstreams,
  CLIENTS,
  TEAM_MEMBERS,
  SPRINTS,
  WORKSTREAM_COLORS,
  type WBSNode,
  type Workstream,
  type NodeStatus,
  type NodeType,
} from "./data"
import {
  makeId,
  calcPct,
  getWorkstreamLeafNodes,
  statusBadgeClass,
  findNodeById,
  updateNodeById,
  addChildToNode,
  addSiblingAfterNode,
  deleteNodeById,
  getAllBottlenecks,
} from "./utils"

// ─── Right Panel ─────────────────────────────────────────────────────────────

function RightPanel({
  selected,
  workstreams,
  onUpdate,
  onAddChild,
  onAddSibling,
  onDelete,
}: {
  selected: { wsId: number; nodeId: number } | null
  workstreams: Workstream[]
  onUpdate: (wsId: number, nodeId: number, patch: Partial<WBSNode>) => void
  onAddChild: (wsId: number, nodeId: number) => void
  onAddSibling: (wsId: number, nodeId: number) => void
  onDelete: (wsId: number, nodeId: number) => void
}) {
  const bottlenecks = getAllBottlenecks(workstreams)
  const ws = selected ? workstreams.find((w) => w.id === selected.wsId) : null
  const node = ws && selected ? findNodeById(selected.nodeId, ws.nodes) : null

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white border-l border-gray-200">
      {/* CEO Edit Panel */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-2">CEO Edit Panel</h3>
        <div className="rounded bg-yellow-50 border border-yellow-200 p-3 text-xs text-gray-700 leading-relaxed">
          Workstreams are fully dynamic. Add Facebook, Website, Posting, Campaign Setup, SEO,
          WhatsApp — anything you want. Click any box to edit it here.
        </div>
      </div>

      {/* Bottleneck Radar */}
      <div className="p-4 border-b border-gray-100">
        <h3 className="text-sm font-bold text-gray-900 mb-3">Bottleneck Radar</h3>
        {bottlenecks.length === 0 ? (
          <p className="text-xs text-gray-400">No bottlenecks found.</p>
        ) : (
          <div className="space-y-3">
            {bottlenecks.map((b, i) => (
              <div key={i} className="border-l-4 border-red-500 pl-3">
                <div className="text-sm font-semibold text-gray-900">{b.title}</div>
                <div className="text-xs text-gray-500">{b.path}</div>
                <div className="text-xs text-gray-500">
                  {b.status} • {b.assignee}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Selected Box */}
      <div className="p-4 flex-1">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Selected Box</h3>
        {!node ? (
          <p className="text-xs text-gray-400">Click any card to edit it here.</p>
        ) : (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Name</label>
              <input
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.title}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { title: e.target.value })
                }
              />
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Type</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.type}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { type: e.target.value as NodeType })
                }
              >
                <option>Workstream</option>
                <option>Task</option>
                <option>Subtask</option>
                <option>Ad</option>
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description</label>
              <textarea
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={4}
                value={node.description}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { description: e.target.value })
                }
              />
            </div>

            {/* Assign To */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Assign To</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.assignee}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { assignee: e.target.value })
                }
              >
                {TEAM_MEMBERS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Client Promised Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Client Promised Date
              </label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.clientPromisedDate}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { clientPromisedDate: e.target.value })
                }
              />
            </div>

            {/* Internal Due Date */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Internal Due Date
              </label>
              <input
                type="date"
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.internalDueDate}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { internalDueDate: e.target.value })
                }
              />
            </div>

            {/* Sprint */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Sprint</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.sprint}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { sprint: e.target.value })
                }
              >
                {SPRINTS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Priority</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.priority}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, {
                    priority: e.target.value as WBSNode["priority"],
                  })
                }
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
              <select
                className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={node.status}
                onChange={(e) =>
                  onUpdate(selected!.wsId, node.id, { status: e.target.value as NodeStatus })
                }
              >
                <option>Not Started</option>
                <option>In Progress</option>
                <option>Waiting Client</option>
                <option>Blocked</option>
                <option>Done</option>
              </select>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => onAddChild(selected!.wsId, node.id)}
                className="rounded bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                + Add Child
              </button>
              <button
                onClick={() => onAddSibling(selected!.wsId, node.id)}
                className="rounded bg-blue-50 border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                + Add Sibling
              </button>
              <button
                onClick={() => onDelete(selected!.wsId, node.id)}
                className="rounded bg-red-50 border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors ml-auto"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── WBS Node Card ────────────────────────────────────────────────────────────

function WBSNodeCard({
  node,
  wsId,
  wsColor,
  selectedId,
  onSelect,
  onAddChild,
  onAddSibling,
}: {
  node: WBSNode
  wsId: number
  wsColor: string
  selectedId: number | null
  onSelect: (wsId: number, nodeId: number) => void
  onAddChild: (wsId: number, nodeId: number) => void
  onAddSibling: (wsId: number, nodeId: number) => void
}) {
  const isSelected = selectedId === node.id

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        onClick={() => onSelect(wsId, node.id)}
        className="cursor-pointer rounded-xl border-2 bg-white p-4 shadow-sm w-52 transition-all hover:shadow-md"
        style={{ borderColor: isSelected ? "#2563eb" : wsColor }}
      >
        <div className="text-xs text-gray-400 mb-0.5">{node.code}</div>
        <div className="font-bold text-gray-900 text-sm leading-tight mb-1">{node.title}</div>
        <div className="text-xs text-gray-500 mb-0.5">
          {node.type} • {node.assignee}
        </div>
        <div className="text-xs text-gray-500 mb-0.5">
          Client: {node.clientPromisedDate} • Due: {node.internalDueDate}
        </div>
        <div className="text-xs text-gray-500 mb-2">Sprint: {node.sprint}</div>

        <span
          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass(
            node.status
          )}`}
        >
          {node.status}
        </span>

        <div className="mt-3 flex gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onAddChild(wsId, node.id)}
            className="rounded border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            + Child
          </button>
          <button
            onClick={() => onAddSibling(wsId, node.id)}
            className="rounded border border-blue-200 bg-white px-2 py-0.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
          >
            + Sibling
          </button>
          <button
            onClick={() => onSelect(wsId, node.id)}
            className="rounded border border-gray-200 bg-white px-2 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Children row */}
      {node.children.length > 0 && (
        <div className="relative mt-6">
          {/* vertical line from parent */}
          <div
            className="absolute left-1/2 -top-6 w-px h-6"
            style={{ background: wsColor }}
          />
          {/* horizontal line connecting children */}
          {node.children.length > 1 && (
            <div
              className="absolute top-0 h-px"
              style={{
                background: wsColor,
                left: `calc(${(1 / (2 * node.children.length)) * 100}%)`,
                right: `calc(${(1 / (2 * node.children.length)) * 100}%)`,
              }}
            />
          )}
          <div className="flex gap-4 relative">
            {node.children.map((child) => (
              <div key={child.id} className="relative flex flex-col items-center">
                {/* vertical drop line */}
                <div
                  className="w-px h-4 mb-0"
                  style={{ background: wsColor }}
                />
                <WBSNodeCard
                  node={child}
                  wsId={wsId}
                  wsColor={wsColor}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onAddChild={onAddChild}
                  onAddSibling={onAddSibling}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Workstream Block ─────────────────────────────────────────────────────────

function WorkstreamBlock({
  ws,
  selectedId,
  onSelect,
  onAddVertical,
  onAddChild,
  onAddSibling,
  onEditWorkstream,
}: {
  ws: Workstream
  selectedId: number | null
  onSelect: (wsId: number, nodeId: number) => void
  onAddVertical: (wsId: number) => void
  onAddChild: (wsId: number, nodeId: number) => void
  onAddSibling: (wsId: number, nodeId: number) => void
  onEditWorkstream: (wsId: number) => void
}) {
  const pct = calcPct(ws)
  const leafCount = getWorkstreamLeafNodes(ws).length || 1

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden mb-6">
      {/* Top color bar */}
      <div className="h-1" style={{ background: ws.color }} />

      {/* Header */}
      <div className="flex items-start justify-between px-6 py-4">
        <div>
          <h2
            className="text-xl font-bold leading-tight"
            style={{ color: ws.color }}
          >
            {ws.code} {ws.title}
          </h2>
          <div className="text-sm text-gray-500 mt-0.5">
            {pct}% complete • {leafCount} leaf task{leafCount !== 1 ? "s" : ""}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onAddVertical(ws.id)}
            className="text-sm font-semibold text-blue-700 hover:underline"
          >
            + Add Vertical
          </button>
          <button
            onClick={() => onEditWorkstream(ws.id)}
            className="text-sm font-semibold text-gray-600 hover:underline"
          >
            Edit Workstream
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="px-6 pb-6">
        {ws.nodes.length === 0 ? (
          <button
            onClick={() => onAddVertical(ws.id)}
            className="w-full rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/30 py-8 text-sm font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
          >
            + Add first vertical task under this workstream
          </button>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-2">
            {ws.nodes.map((node) => (
              <WBSNodeCard
                key={node.id}
                node={node}
                wsId={ws.id}
                wsColor={ws.color}
                selectedId={selectedId}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onAddSibling={onAddSibling}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

function SummaryCards({ workstreams }: { workstreams: Workstream[] }) {
  const allLeaves = workstreams.flatMap((ws) => getWorkstreamLeafNodes(ws))
  const totalLeaves = allLeaves.length
  const done = allLeaves.filter((n) => n.status === "Done").length
  const overall = totalLeaves ? Math.round((done / totalLeaves) * 100) : 0
  const blocked = allLeaves.filter(
    (n) => n.status === "Blocked" || n.status === "Waiting Client"
  ).length
  const today = new Date().toISOString().split("T")[0]
  const dueSoon = allLeaves.filter(
    (n) => n.internalDueDate && n.internalDueDate <= today && n.status !== "Done"
  ).length

  const cards = [
    { label: "WBS Type", value: "Monthly" },
    { label: "Overall Progress", value: `${overall}%` },
    { label: "Leaf Tasks", value: totalLeaves },
    { label: "Blocked / Waiting", value: blocked },
    { label: "Due Soon", value: dueSoon },
  ]

  return (
    <div className="grid grid-cols-5 gap-4 mb-5">
      {cards.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WBS2Page() {
  const [workstreams, setWorkstreams] = useState<Workstream[]>(initialWorkstreams)
  const [selected, setSelected] = useState<{ wsId: number; nodeId: number } | null>(null)
  const [client, setClient] = useState("PhytoCraft")
  const [wbsName, setWbsName] = useState("June Growth Campaign")
  const [startDate, setStartDate] = useState("2026-06-01")
  const [endDate, setEndDate] = useState("2026-06-30")

  // ── helpers ──

  const handleSelect = useCallback((wsId: number, nodeId: number) => {
    setSelected({ wsId, nodeId })
  }, [])

  const handleUpdate = useCallback(
    (wsId: number, nodeId: number, patch: Partial<WBSNode>) => {
      setWorkstreams((prev) =>
        prev.map((ws) =>
          ws.id !== wsId
            ? ws
            : { ...ws, nodes: updateNodeById(nodeId, patch, ws.nodes) }
        )
      )
    },
    []
  )

  const handleAddVertical = useCallback((wsId: number) => {
    setWorkstreams((prev) => {
      const ws = prev.find((w) => w.id === wsId)!
      const nextIdx = ws.nodes.length + 1
      const newNode: WBSNode = {
        id: makeId(),
        code: `${ws.code.split(".")[0]}.${nextIdx}`,
        title: "New Vertical",
        type: "Task",
        description: "",
        assignee: "Unassigned",
        status: "Not Started",
        priority: "Medium",
        sprint: "Unassigned",
        clientPromisedDate: "",
        internalDueDate: "",
        children: [],
      }
      return prev.map((w) =>
        w.id !== wsId ? w : { ...w, nodes: [...w.nodes, newNode] }
      )
    })
  }, [])

  const handleAddChild = useCallback((wsId: number, nodeId: number) => {
    setWorkstreams((prev) => {
      const ws = prev.find((w) => w.id === wsId)!
      const parent = findNodeById(nodeId, ws.nodes)
      if (!parent) return prev
      const childNum = parent.children.length + 1
      const child: WBSNode = {
        id: makeId(),
        code: `${parent.code}.${childNum}`,
        title: "New Task",
        type: "Subtask",
        description: "",
        assignee: "Unassigned",
        status: "Not Started",
        priority: "Medium",
        sprint: "Unassigned",
        clientPromisedDate: "",
        internalDueDate: "",
        children: [],
      }
      return prev.map((w) =>
        w.id !== wsId
          ? w
          : { ...w, nodes: addChildToNode(nodeId, child, w.nodes) }
      )
    })
  }, [])

  const handleAddSibling = useCallback((wsId: number, nodeId: number) => {
    setWorkstreams((prev) => {
      const ws = prev.find((w) => w.id === wsId)!
      const sibling = findNodeById(nodeId, ws.nodes)
      if (!sibling) return prev
      const parts = sibling.code.split(".")
      const newCode = [...parts.slice(0, -1), String(Number(parts[parts.length - 1]) + 1)].join(".")
      const newNode: WBSNode = {
        id: makeId(),
        code: newCode,
        title: "New Sibling",
        type: sibling.type,
        description: "",
        assignee: "Unassigned",
        status: "Not Started",
        priority: "Medium",
        sprint: "Unassigned",
        clientPromisedDate: "",
        internalDueDate: "",
        children: [],
      }
      // If top-level node
      const isTopLevel = ws.nodes.some((n) => n.id === nodeId)
      if (isTopLevel) {
        const idx = ws.nodes.findIndex((n) => n.id === nodeId)
        const updated = [...ws.nodes]
        updated.splice(idx + 1, 0, newNode)
        return prev.map((w) => (w.id !== wsId ? w : { ...w, nodes: updated }))
      }
      return prev.map((w) =>
        w.id !== wsId
          ? w
          : { ...w, nodes: addSiblingAfterNode(nodeId, newNode, w.nodes) }
      )
    })
  }, [])

  const handleDelete = useCallback((wsId: number, nodeId: number) => {
    setWorkstreams((prev) =>
      prev.map((ws) =>
        ws.id !== wsId
          ? ws
          : { ...ws, nodes: deleteNodeById(nodeId, ws.nodes) }
      )
    )
    setSelected(null)
  }, [])

  const handleEditWorkstream = useCallback((wsId: number) => {
    // no-op: workstream editing could open a modal; for now just deselect node
    setSelected(null)
  }, [])

  const handleAddWorkstream = useCallback(() => {
    const nextNum = workstreams.length + 1
    const color = WORKSTREAM_COLORS[(nextNum - 1) % WORKSTREAM_COLORS.length]
    const newWs: Workstream = {
      id: makeId(),
      code: `${nextNum}.0`,
      title: "New Workstream",
      color,
      nodes: [],
    }
    setWorkstreams((prev) => [...prev, newWs])
  }, [workstreams.length])

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ fontFamily: "Inter, sans-serif" }}>
      {/* ── Header ── */}
      <header className="flex items-center gap-4 px-5 py-3 bg-[#0d1117] sticky top-0 z-30 flex-wrap">
        <span className="text-yellow-400 font-extrabold text-xl mr-2 whitespace-nowrap">
          StoryOps WBS
        </span>

        {/* Client */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            Client
          </label>
          <select
            value={client}
            onChange={(e) => setClient(e.target.value)}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[130px]"
          >
            {CLIENTS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* WBS Name */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            WBS Name
          </label>
          <input
            value={wbsName}
            onChange={(e) => setWbsName(e.target.value)}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-[170px]"
          />
        </div>

        {/* Start Date */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* End Date */}
        <div className="flex flex-col">
          <label className="text-gray-400 text-[10px] font-semibold uppercase tracking-wider mb-0.5">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="rounded border border-gray-600 bg-[#1a2233] text-white text-sm px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-3 ml-auto">
          <button
            onClick={handleAddWorkstream}
            className="rounded border border-gray-500 bg-[#1a2233] text-white text-sm font-semibold px-4 py-2 hover:bg-[#243049] transition-colors whitespace-nowrap"
          >
            + Add Workstream
          </button>
          <button className="rounded bg-yellow-400 text-gray-900 text-sm font-bold px-4 py-2 hover:bg-yellow-300 transition-colors whitespace-nowrap">
            Publish to Sprint
          </button>
        </div>
      </header>

      {/* ── Body: left content + right panel ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Scrollable left content */}
        <div className="flex-1 overflow-y-auto p-6 min-w-0">
          {/* Summary Cards */}
          <SummaryCards workstreams={workstreams} />

          {/* Title bar */}
          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {client} — {wbsName}
              </h1>
              <div className="text-sm text-gray-500 mt-0.5">
                {startDate} to {endDate} • Monthly WBS
              </div>
            </div>
            <button
              onClick={handleAddWorkstream}
              className="rounded-lg bg-blue-700 text-white text-sm font-semibold px-4 py-2 hover:bg-blue-800 transition-colors whitespace-nowrap"
            >
              + Add Dynamic Workstream
            </button>
          </div>

          {/* Workstreams */}
          {workstreams.map((ws) => (
            <WorkstreamBlock
              key={ws.id}
              ws={ws}
              selectedId={selected?.nodeId ?? null}
              onSelect={handleSelect}
              onAddVertical={handleAddVertical}
              onAddChild={handleAddChild}
              onAddSibling={handleAddSibling}
              onEditWorkstream={handleEditWorkstream}
            />
          ))}

          {/* Create New Workstream CTA */}
          <button
            onClick={handleAddWorkstream}
            className="w-full rounded-2xl border-2 border-dashed border-gray-300 bg-white py-5 text-sm font-semibold text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-colors"
          >
            + Create New Workstream
          </button>
        </div>

        {/* Fixed right panel */}
        <div className="w-72 flex-shrink-0 border-l border-gray-200 overflow-y-auto bg-white">
          <RightPanel
            selected={selected}
            workstreams={workstreams}
            onUpdate={handleUpdate}
            onAddChild={handleAddChild}
            onAddSibling={handleAddSibling}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  )
}
