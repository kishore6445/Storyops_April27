"use client"

import { statusClass } from "@/lib/wbs-utils"

export default function WBSNode({
  node,
  selectedId,
  onSelect,
  onAddChild,
  onAddSibling,
}) {
  return (
    <div className="flex flex-col items-center">
      <div
        onClick={() => onSelect(node.id)}
        className={`cursor-pointer rounded-xl border bg-white p-4 shadow
        ${
          selectedId === node.id
            ? "border-blue-600"
            : ""
        }`}
      >
        <div className="font-bold">
          {node.title}
        </div>

        <div className="text-xs text-gray-500">
          {node.type}
        </div>

        <span
          className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-semibold ${statusClass(
            node.status
          )}`}
        >
          {node.status}
        </span>

        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddChild(node.id)
            }}
          >
            Child
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddSibling(node.id)
            }}
          >
            Sibling
          </button>
        </div>
      </div>

      {node.children?.length > 0 && (
        <div className="mt-6 flex gap-4">
          {node.children.map((child) => (
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
      )}
    </div>
  )
}