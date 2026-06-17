export default function SummaryCards({
  overall,
  leafTasks,
  blocked,
  dueSoon,
  wbsType,
}) {
  const cards = [
    ["WBS Type", wbsType],
    ["Overall Progress", `${overall}%`],
    ["Leaf Tasks", leafTasks],
    ["Blocked / Waiting", blocked],
    ["Due Soon", dueSoon],
  ]

  return (
    <div className="grid grid-cols-5 gap-4">
      {cards.map(([label, value]) => (
        <div
          key={label}
          className="rounded-xl border bg-white p-4"
        >
          <div className="text-xs text-gray-500">
            {label}
          </div>

          <div className="mt-2 text-2xl font-bold">
            {value}
          </div>
        </div>
      ))}
    </div>
  )
}