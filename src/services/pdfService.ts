import type { Listing, ManualListingEdits, RegionId } from '@/models/listings'
import { REGIONS } from '@/config/regions'

export interface PdfDocumentResult {
  blob: Blob
  fileName: string
  qrData: string[]
}

const missing = 'nicht angegeben'
const pdfSafe = (input: string): string => input
  .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\uFE0E\uFE0F\u200D]/gu, '')
  .replace(/[–—]/g, '-')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/\s{2,}/g, ' ')
  .trim()
const value = (input: string | number | undefined): string => input === undefined || input === '' ? missing : pdfSafe(String(input))
const dateText = (date = new Date()): string => [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('.')

export function createPdfFilename(kind: 'jobs' | 'housing', region: RegionId, date = new Date()): string {
  const stamp = [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
  const place = region === 'innsbruck' ? 'Innsbruck' : 'Innsbruck_Umgebung'
  return `${kind === 'jobs' ? 'Stellenangebote' : 'Leistbare_Wohnungen'}_${place}_${stamp}.pdf`
}

export async function createListingsPdf(
  listings: Listing[],
  edits: Record<string, ManualListingEdits>,
  region: RegionId,
  updatedAt: string,
): Promise<PdfDocumentResult> {
  if (!listings.length) throw new Error('Mindestens ein Angebot muss ausgewählt sein.')
  const kinds = new Set(listings.map((item) => item.source))
  if (kinds.size !== 1) throw new Error('Jobs und Wohnungen müssen getrennt exportiert werden.')
  const [{ jsPDF }, QRCode] = await Promise.all([import('jspdf'), import('qrcode')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const red = '#e4002b'
  const dark = '#222222'
  const light = '#f7f7f8'
  const margin = 18
  const pageWidth = 210
  const pageHeight = 297
  const kind = listings[0]?.source === 'oeh-jobs' ? 'jobs' : 'housing'
  const title = kind === 'jobs' ? 'Stellenangebote ohne Ausbildung' : 'Leistbare Wohnungsangebote'
  const subtitle = REGIONS[region].pdfLabel
  const qrData: string[] = []
  let y = 0

  const footer = (): void => {
    const page = doc.getNumberOfPages()
    doc.setDrawColor(210, 210, 210)
    doc.line(margin, pageHeight - 17, pageWidth - margin, pageHeight - 17)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(80, 80, 80)
    doc.text('Bahnhofssozialdienst | Angebotsübersicht', margin, pageHeight - 11)
    doc.text(`Stand: ${dateText(new Date(updatedAt))}`, margin, pageHeight - 7)
  }

  const header = (first = false): void => {
    if (!first) doc.addPage()
    doc.setFillColor(red); doc.rect(0, 0, 7, pageHeight, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(red)
    doc.text('BAHNHOFSSOZIALDIENST', margin, 17)
    doc.setFontSize(22); doc.setTextColor(dark); doc.text(pdfSafe(title), margin, 30)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.text(subtitle, margin, 38)
    doc.setFontSize(9); doc.setTextColor(90, 90, 90); doc.text(`Erstellt am ${dateText()}`, margin, 46)
    doc.setDrawColor(red); doc.setLineWidth(0.7); doc.line(margin, 51, pageWidth - margin, 51)
    y = 60
  }

  const ensureSpace = (height: number): void => {
    if (y + height > pageHeight - 23) { footer(); header() }
  }

  const writeWrapped = (label: string, text: string, maxWidth = 143): void => {
    const lines = doc.splitTextToSize(text, maxWidth) as string[]
    ensureSpace(Math.max(6, lines.length * 4.2))
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(dark); doc.text(label, margin, y)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(55, 55, 55); doc.text(lines, margin + 38, y)
    y += Math.max(6, lines.length * 4.2)
  }

  header(true)
  for (const [index, listing] of listings.entries()) {
    const edit = edits[listing.id] ?? {}
    ensureSpace(62)
    doc.setFillColor(light); doc.roundedRect(margin, y - 3, pageWidth - margin * 2, 13, 1.5, 1.5, 'F')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(red); doc.text(String(index + 1).padStart(2, '0'), margin + 4, y + 3.5)
    doc.setFontSize(13); doc.setTextColor(dark)
    const titleLines = doc.splitTextToSize(value(edit.title ?? listing.title), 143) as string[]
    doc.text(titleLines.slice(0, 2), margin + 16, y + 3.5)
    y += 17 + Math.max(0, titleLines.length - 1) * 4
    if (listing.source === 'oeh-jobs') {
      writeWrapped('Arbeitgeber', value(edit.employer ?? listing.employer))
      writeWrapped('Arbeitsort', value(edit.location ?? listing.location))
      writeWrapped('Beschäftigung', value(edit.employmentType ?? listing.employmentType))
      writeWrapped('Arbeitszeiten', value(edit.workingHours ?? listing.workingHours))
      writeWrapped('Beginn', value(edit.startDate ?? listing.startDate))
      writeWrapped('Gehalt', value(edit.salary ?? listing.salary))
      writeWrapped('Aufgaben', value(edit.tasks ?? listing.tasks.join('; ')))
      writeWrapped('Voraussetzungen', value(edit.requirements ?? listing.requirements.join('; ')))
    } else {
      writeWrapped('Lage', value(edit.location ?? listing.location))
      writeWrapped('Unterkunft', housingTypeLabel(listing.housingType))
      writeWrapped('Größe / Zimmer', `${value(edit.sizeM2 ?? listing.sizeM2)} m² / ${value(edit.rooms ?? listing.rooms)}`)
      writeWrapped('Gesamtmiete', listing.totalRent === undefined ? missing : `${listing.totalRent.toLocaleString('de-AT')} € / Monat`)
      writeWrapped('Betriebskosten', value(edit.operatingCosts ?? listing.operatingCosts))
      writeWrapped('Heizung / Strom', `${value(edit.heatingCosts ?? listing.heatingCosts)} / ${value(edit.electricityCosts ?? listing.electricityCosts)}`)
      writeWrapped('Kaution', value(edit.deposit ?? listing.deposit))
      writeWrapped('Weitere Kosten', value(edit.oneTimeCosts ?? listing.oneTimeCosts))
      writeWrapped('Verfügbarkeit', value(edit.availableFrom ?? listing.availableFrom))
      writeWrapped('Ausstattung', value(edit.amenities ?? listing.amenities.join('; ')))
    }
    writeWrapped('Einschätzung', value(listing.suitability?.reasons.join('; ')))
    ensureSpace(34)
    const qr = await QRCode.toDataURL(listing.originalUrl, { margin: 0, width: 180, errorCorrectionLevel: 'M' })
    qrData.push(listing.originalUrl)
    doc.addImage(qr, 'PNG', margin, y, 23, 23)
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(dark); doc.text('Originalinserat', margin + 29, y + 5)
    doc.setFont('helvetica', 'normal'); doc.setTextColor(0, 47, 167)
    const linkLines = doc.splitTextToSize(listing.originalUrl, 132) as string[]
    const linkX = margin + 29
    const linkY = y + 11
    doc.text(linkLines, linkX, linkY)
    linkLines.forEach((line, lineIndex) => doc.link(linkX, linkY - 3 + lineIndex * 3.5, doc.getTextWidth(line), 4, { url: listing.originalUrl }))
    const noteY = linkY + linkLines.length * 3.5 + 2
    doc.setTextColor(90, 90, 90); doc.setFontSize(7.5); doc.text('QR-Code und Link führen direkt zum Angebot der ÖH.', linkX, noteY)
    y += Math.max(32, noteY - y + 6)
  }
  ensureSpace(23)
  doc.setDrawColor(215, 215, 215); doc.line(margin, y, pageWidth - margin, y); y += 7
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(90, 90, 90)
  const note = 'Die Inserate waren zum Zeitpunkt der letzten Datenaktualisierung online. Eine endgültige Verfügbarkeit kann nur der jeweilige Anbieter bestätigen.'
  doc.text(doc.splitTextToSize(note, pageWidth - margin * 2), margin, y)
  footer()
  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page); doc.setTextColor(80, 80, 80); doc.setFontSize(8)
    doc.text(`Seite ${page} / ${total}`, pageWidth - margin, pageHeight - 9, { align: 'right' })
  }
  const blob = doc.output('blob')
  return { blob, fileName: createPdfFilename(kind, region), qrData }
}

export function housingTypeLabel(type: string): string {
  return ({ garconniere: 'Garçonnière', apartment: 'Wohnung', 'shared-room': 'WG-Zimmer', other: 'Sonstige Unterkunft' } as Record<string, string>)[type] ?? missing
}
