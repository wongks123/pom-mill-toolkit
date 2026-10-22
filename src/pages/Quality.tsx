import { Link } from 'react-router-dom'
import misc from '../data/referenceMisc.json'
import fattyAcids from '../data/fattyAcids.json'
import { DataTable } from '../components/DataTable'

const cpo = misc.tables.find((t) => t.id === 'cpoStandards')!

const TOPICS = [
  { title: 'Free fatty acid (FFA)', text: 'Lipase in bruised or delayed fruit splits triglycerides into free fatty acids. FFA cannot be removed at the mill, only prevented: harvest ripe, transport fast, sterilise promptly. High FFA raises refining losses, so buyers penalise it.' },
  { title: 'Moisture and impurities (M&I)', text: 'Water speeds up hydrolysis (more FFA) in storage, and dirt is a contaminant. The purifier and vacuum dryer control M&I.' },
  { title: 'DOBI', text: 'Deterioration of Bleachability Index: the ratio of carotene absorbance (446 nm) to oxidation products (269 nm). Over-ripe fruit, over-sterilisation, long holding times, high temperatures and iron contamination all lower DOBI.' },
  { title: 'Fatty acid profile', text: 'Palm oil is about 50% saturated (mainly palmitic C16:0) and 40% mono-unsaturated (oleic C18:1). Palm kernel oil is lauric (C12:0), which makes it very different.' },
]

export default function Quality() {
  return (
    <div className="space-y-4">
      <Link to="/learn" className="text-sm text-palm-700">← Learn</Link>
      <h1 className="text-2xl font-bold text-palm-900">Quality: CPO standards, FFA, DOBI</h1>
      <DataTable table={cpo} />
      {TOPICS.map((t) => (
        <section key={t.title} className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-1 font-semibold">{t.title}</h2>
          <p className="text-stone-700">{t.text}</p>
        </section>
      ))}
      <DataTable table={{ id: 'fa', ...fattyAcids }} />
    </div>
  )
}
