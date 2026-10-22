export function FormulaBlock({ lines }: { lines: string[] }) {
  return (
    <details open className="rounded-xl bg-white p-4 shadow-sm">
      <summary className="cursor-pointer font-semibold">Formula</summary>
      <ul className="mt-2 space-y-1 font-mono text-sm text-stone-700">
        {lines.map((l, k) => <li key={k}>{l}</li>)}
      </ul>
    </details>
  )
}
