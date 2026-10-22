import { jsPDF } from 'jspdf'
import { autoTable, type UserOptions } from 'jspdf-autotable'
import type { CalcSnapshot } from './snapshot'

// Page geometry follows the ITAKE SOLUTIONS letterhead (A4, Word template R8), in mm.
const PAGE_W = 210
const PAGE_H = 297
const LEFT = 20
const RIGHT = 12.5
const CONTENT_W = PAGE_W - LEFT - RIGHT
const HEADER = { x: 20.1, y: 2.5, w: 177.5, h: 35.35 }
const FOOTER = { x: 20, y: PAGE_H - 12 - 6.42, w: 177.5, h: 6.42 }
const TOP = HEADER.y + HEADER.h + 6
const BOTTOM = PAGE_H - FOOTER.y + 6

const GREEN: [number, number, number] = [20, 83, 45]
const GREY: [number, number, number] = [110, 110, 110]
const FONT = 'DejaVuSans'

interface Assets { header: string; footer: string; regular: string; bold: string }
let assets: Promise<Assets> | null = null

async function asDataUrl(url: string): Promise<string> {
  const blob = await (await fetch(url)).blob()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as string)
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })
}

const base64 = (dataUrl: string) => dataUrl.slice(dataUrl.indexOf(',') + 1)

function loadAssets(): Promise<Assets> {
  assets ??= Promise.all([
    asDataUrl('./letterhead/header.jpg'),
    asDataUrl('./letterhead/footer.jpg'),
    asDataUrl('./fonts/DejaVuSans.ttf').then(base64),
    asDataUrl('./fonts/DejaVuSans-Bold.ttf').then(base64),
  ]).then(([header, footer, regular, bold]) => ({ header, footer, regular, bold }))
  assets.catch(() => (assets = null))
  return assets
}

/** A report being written onto letterhead pages. */
export class LetterheadReport {
  doc: jsPDF
  y = TOP
  private a: Assets

  private constructor(a: Assets) {
    this.a = a
    this.doc = new jsPDF({ unit: 'mm', format: 'a4' })
    this.doc.addFileToVFS('DejaVuSans.ttf', a.regular)
    this.doc.addFont('DejaVuSans.ttf', FONT, 'normal')
    this.doc.addFileToVFS('DejaVuSans-Bold.ttf', a.bold)
    this.doc.addFont('DejaVuSans-Bold.ttf', FONT, 'bold')
    this.doc.setFont(FONT, 'normal')
  }

  static async create(): Promise<LetterheadReport> {
    return new LetterheadReport(await loadAssets())
  }

  private ensure(h: number) {
    if (this.y + h > PAGE_H - BOTTOM) this.newPage()
  }

  newPage() {
    this.doc.addPage()
    this.y = TOP
  }

  title(text: string, sub: string[]) {
    const d = this.doc
    d.setFont(FONT, 'bold').setFontSize(15).setTextColor(...GREEN)
    d.text(text, LEFT, this.y + 5)
    this.y += 8
    d.setFont(FONT, 'normal').setFontSize(8.5).setTextColor(...GREY)
    for (const s of sub) {
      d.text(s, LEFT, this.y + 3)
      this.y += 4.2
    }
    d.setDrawColor(...GREEN).setLineWidth(0.4).line(LEFT, this.y + 1, PAGE_W - RIGHT, this.y + 1)
    this.y += 5
  }

  heading(text: string) {
    this.ensure(14)
    this.doc.setFont(FONT, 'bold').setFontSize(10.5).setTextColor(...GREEN)
    this.doc.text(text, LEFT, this.y + 4)
    this.y += 6.5
  }

  paragraph(text: string, opts: { size?: number; color?: [number, number, number]; bold?: boolean } = {}) {
    const d = this.doc
    d.setFont(FONT, opts.bold ? 'bold' : 'normal').setFontSize(opts.size ?? 9).setTextColor(...(opts.color ?? [30, 30, 30]))
    const lines = d.splitTextToSize(text, CONTENT_W) as string[]
    const lh = (opts.size ?? 9) * 0.45
    for (const l of lines) {
      this.ensure(lh)
      d.text(l, LEFT, this.y + lh * 0.8)
      this.y += lh
    }
    this.y += 1.5
  }

  table(head: string[] | null, body: string[][], opts: Partial<UserOptions> = {}) {
    autoTable(this.doc, {
      startY: this.y,
      head: head ? [head] : undefined,
      body,
      margin: { top: TOP, bottom: BOTTOM, left: LEFT, right: RIGHT },
      styles: { font: FONT, fontSize: 8.5, cellPadding: 1.6, textColor: [30, 30, 30], lineColor: [220, 220, 215], lineWidth: 0.1, overflow: 'linebreak' },
      headStyles: { fillColor: GREEN, textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 247, 242] },
      theme: 'grid',
      ...opts,
    })
    this.y = (this.doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
  }

  signOff() {
    this.ensure(26)
    this.y += 4
    const d = this.doc
    const w = (CONTENT_W - 10) / 3
    ;['Prepared by', 'Checked by', 'Approved by'].forEach((label, k) => {
      const x = LEFT + k * (w + 5)
      d.setDrawColor(150).setLineWidth(0.2).line(x, this.y + 12, x + w, this.y + 12)
      d.setFont(FONT, 'normal').setFontSize(8).setTextColor(...GREY)
      d.text(label, x, this.y + 16)
      d.text('Date:', x, this.y + 20)
    })
    this.y += 24
  }

  /** Stamps the letterhead and page numbers on every page, then downloads the file. */
  save(filename: string, docRef: string) {
    const d = this.doc
    const n = d.getNumberOfPages()
    for (let p = 1; p <= n; p++) {
      d.setPage(p)
      d.addImage(this.a.header, 'JPEG', HEADER.x, HEADER.y, HEADER.w, HEADER.h)
      d.addImage(this.a.footer, 'JPEG', FOOTER.x, FOOTER.y, FOOTER.w, FOOTER.h)
      d.setFont(FONT, 'normal').setFontSize(7).setTextColor(...GREY)
      d.text(docRef, LEFT, PAGE_H - 7)
      d.text(`Page ${p} of ${n}`, PAGE_W - RIGHT, PAGE_H - 7, { align: 'right' })
    }
    d.save(filename)
  }
}

export const stamp = (d = new Date()) => {
  const p = (x: number) => String(x).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
    time: `${p(d.getHours())}:${p(d.getMinutes())}`,
    ref: `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`,
  }
}

const safe = (s: string) => s.replace(/[^\w-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')

const DISCLAIMER = 'Calculated with iTake Academy. Pocketbook-based calculators follow the MPOB Palm Oil Mill Pocketbook with known errata corrected. Values marked [REVIEW] are drafts. Check all results before use in design.'

/** Writes one calculator run as report sections. */
function writeCalc(r: LetterheadReport, s: CalcSnapshot, note?: string) {
  if (note) r.paragraph(`Note: ${note}`, { bold: true })
  r.heading('Inputs')
  r.table(['Parameter', 'Value'], s.inputLines, { columnStyles: { 1: { cellWidth: 60 } } })
  r.heading('Results')
  r.table(['Result', 'Value'], [s.primary, ...s.outputs.filter(([l]) => l !== s.primary[0]), ...(s.notes ?? [])], {
    columnStyles: { 1: { cellWidth: 60 } },
    didParseCell: (h) => { if (h.section === 'body' && h.row.index === 0) h.cell.styles.fontStyle = 'bold' },
  })
  if (s.warnings.length) {
    r.heading('Warnings')
    for (const w of s.warnings) r.paragraph(`• ${w}`, { color: [146, 64, 14] })
  }
  r.heading('Formula')
  for (const f of s.formula) r.paragraph(f, { size: 8.5 })
  r.heading('Step-by-step working')
  r.table(['Step', 'Working', 'Result'], s.steps.map((x) => [x.label, x.formula, x.value]), {
    styles: { font: FONT, fontSize: 7.5, cellPadding: 1.3 },
    columnStyles: { 0: { cellWidth: 45 }, 2: { cellWidth: 32, halign: 'right' } },
  })
  r.paragraph(`Source: ${s.source}`, { size: 8, color: GREY })
}

export async function downloadCalcPdf(s: CalcSnapshot, note?: string) {
  const r = await LetterheadReport.create()
  const t = stamp(new Date(s.createdAt))
  const ref = `ITK-${s.calcId.toUpperCase()}-${t.ref}`
  r.title(`${s.title} – Calculation Report`, [`Ref: ${ref}`, `Date: ${t.date} ${t.time}${s.projectName ? `   ·   Project: ${s.projectName}` : ''}`])
  writeCalc(r, s, note)
  r.paragraph(DISCLAIMER, { size: 7.5, color: GREY })
  r.signOff()
  r.save(`iTake_${safe(s.title)}_${t.date}.pdf`, ref)
}

export async function downloadHistoryPdf(entries: (CalcSnapshot & { note?: string })[], heading = 'Calculation History') {
  const r = await LetterheadReport.create()
  const t = stamp()
  const ref = `ITK-HIST-${t.ref}`
  r.title(heading, [`Ref: ${ref}`, `Date: ${t.date} ${t.time}   ·   ${entries.length} calculation${entries.length === 1 ? '' : 's'}`])
  r.heading('Index')
  r.table(['#', 'Calculator', 'Project / note', 'Saved', 'Key result'], entries.map((e, k) => {
    const s = stamp(new Date(e.createdAt))
    return [String(k + 1), e.title, [e.projectName, e.note].filter(Boolean).join(' – '), `${s.date} ${s.time}`, `${e.primary[0]}: ${e.primary[1]}`]
  }), { styles: { font: FONT, fontSize: 7.5, cellPadding: 1.3 }, columnStyles: { 0: { cellWidth: 7 } } })
  entries.forEach((e, k) => {
    r.newPage()
    const s = stamp(new Date(e.createdAt))
    r.title(`${k + 1}. ${e.title}`, [`Saved: ${s.date} ${s.time}${e.projectName ? `   ·   Project: ${e.projectName}` : ''}`])
    writeCalc(r, e, e.note)
  })
  r.paragraph(DISCLAIMER, { size: 7.5, color: GREY })
  r.signOff()
  r.save(`iTake_History_${t.date}.pdf`, ref)
}

export interface SummaryRow { title: string; source: string; primary?: string; outputs: string[]; warnings: string[]; error?: string }

export async function downloadSummaryPdf(project: { name: string; capacityTph: number }, ratios: [string, string][], rows: SummaryRow[], saved: { title: string; lines: string[] }[]) {
  const r = await LetterheadReport.create()
  const t = stamp()
  const ref = `ITK-MDS-${t.ref}`
  r.title('Mill Design Summary', [`Ref: ${ref}`, `Date: ${t.date} ${t.time}   ·   Project: ${project.name}   ·   ${project.capacityTph} t FFB/h`])
  r.heading('Design basis')
  r.table(null, ratios, { columnStyles: { 0: { cellWidth: 60, fontStyle: 'bold' } } })
  r.heading('Equipment sizing')
  r.table(['Calculator', 'Key result', 'Other results'], rows.map((x) => [x.title, x.error ?? x.primary ?? '', [...x.outputs, ...x.warnings.map((w) => `⚠ ${w}`)].join('\n')]), {
    styles: { font: FONT, fontSize: 7.5, cellPadding: 1.3 },
    columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' }, 1: { cellWidth: 50 } },
  })
  if (saved.length) {
    r.heading('Saved calculator results')
    r.table(['Calculator', 'Inputs and results'], saved.map((s) => [s.title, s.lines.join('\n')]), {
      styles: { font: FONT, fontSize: 7.5, cellPadding: 1.3 },
      columnStyles: { 0: { cellWidth: 38, fontStyle: 'bold' } },
    })
  }
  r.paragraph(DISCLAIMER, { size: 7.5, color: GREY })
  r.signOff()
  r.save(`iTake_Mill_Design_Summary_${safe(project.name)}_${t.date}.pdf`, ref)
}
