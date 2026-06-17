"use client"

import WBSNode from "./WBSNode"
import { pct } from "../lib/wbs-utils"

export default function Workstream({
  workstream,
  selectedId,
  onSelect,
  onAddChild,
  onAddSibling,
}) {
  return (
    <div className="rounded-2xl border bg-white">
      <div
        className="border-t-4 p-4"
        style={{
          borderColor: workstream.color,
        }}
      >
        <h2
          className="text-xl font-bold"
          style={{
            color: workstream.color,
          }}
        >
          {workstream.title}
        </h2>

        <div className="text-sm text-gray-500">
          {pct(workstream)}% complete
        </div>
      </div>

      <div className="p-4">
        {workstream.children.map((child) => (
          <WBSNode
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onAddSibling={onAddSibling}
          />
        ))}
      </div>
    </div>
  )
}