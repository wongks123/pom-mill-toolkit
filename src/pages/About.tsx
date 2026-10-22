const ERRATA = [
  ['p.25 De-stoner', 'Air density 1.777 is wrong; 1.1777 kg/m³ at 27 °C is used.'],
  ['p.24 Separating column', '24,000 / 36,000 = 0.667 m² (not 0.816); side = 816 mm.'],
  ['p.22 Fruit elevator', 'Bucket volume divides by the load factor: c = T·P / (b·v·LF).'],
  ['p.26 Sludge tank', 'Sized on 50% of crude oil, not 50% of FFB.'],
  ['p.20 Steam pipe', 'Mean specific volume is 0.4785 m³/kg; steam demand unit is kg/t FFB.'],
  ['p.11 Power factor table', '0.55 → 0.95 multiplier is 1.190 (not 1.490). The app computes tan(acos PF1) − tan(acos PF2).'],
  ['p.31 Fatty acids', 'Arachidic acid is C20:0, not C18:2.'],
  ['p.12–13 Pumps', 'Formulas use imperial gallons (3,300). US gallons use 3,960; the app lets you choose.'],
]

export default function About() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-palm-900">About</h1>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <p>
          The PEPC Palm Oil Mill Toolkit is a teaching and calculation app for palm oil mill engineers and beginners.
          Its calculators are based on the <b>MPOB Palm Oil Mill Pocketbook</b> (Malaysian Palm Oil Board, Engineering & Processing Division).
          Credit for the original methods and data belongs to MPOB.
        </p>
        <p className="mt-2 text-sm text-stone-600">Everything runs in your browser. Nothing is sent to a server. After the first visit the app works offline.</p>
      </section>
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">Errata applied</h2>
        <ul className="space-y-2 text-sm">
          {ERRATA.map(([where, what]) => (
            <li key={where}><b className="text-orange-800">{where}:</b> {what}</li>
          ))}
        </ul>
      </section>
      <section className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        <h2 className="mb-1 font-semibold">[REVIEW] items</h2>
        <p>Content marked [REVIEW] was drafted from general milling practice and has not yet been checked against the pocketbook by a subject expert. The production cost figures are placeholders. Check results before using them for design or purchasing decisions.</p>
      </section>
    </div>
  )
}
