export function ReviewBadge({ label = 'REVIEW' }: { label?: string }) {
  return (
    <span className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-amber-800" title="Not yet checked against the MPOB pocketbook">
      [{label}]
    </span>
  )
}
