import type { ContactDetails, Listing, ListingImage, ManualListingEdits, RegionId } from '@/models/listings'
import { REGIONS } from '@/config/regions'

export interface PdfDocumentResult {
  blob: Blob
  fileName: string
  qrData: string[]
  imageCount: number
}

interface PdfImage {
  dataUrl: string
  format: 'JPEG' | 'PNG' | 'WEBP'
}

const missing = 'nicht angegeben'
const pdfSafe = (input: string): string => input
  .replace(/\p{Extended_Pictographic}/gu, '')
  .replace(/\uFE0E|\uFE0F|\u200D/gu, '')
  .replace(/[–—]/g, '-')
  .replace(/[“”]/g, '"')
  .replace(/[‘’]/g, "'")
  .replace(/\s{2,}/g, ' ')
  .trim()
const value = (input: string | number | undefined): string => input === undefined || input === '' ? missing : pdfSafe(String(input))
const dateText = (date = new Date()): string => [String(date.getDate()).padStart(2, '0'), String(date.getMonth() + 1).padStart(2, '0'), date.getFullYear()].join('.')
const listText = (items: string[]): string => items.length ? items.map(pdfSafe).join('; ') : missing

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
  const muted = '#66666b'
  const line = '#d9d9dc'
  const light = '#f7f7f8'
  const redSoft = '#fff1f3'
  const pageWidth = 210
  const pageHeight = 297
  const margin = 18
  const contentWidth = pageWidth - margin * 2
  const contentBottom = pageHeight - 22
  const kind = listings[0]?.source === 'oeh-jobs' ? 'jobs' : 'housing'
  const documentTitle = kind === 'jobs' ? 'Ausgewählte Stellenangebote' : 'Ausgewählte Wohnungsangebote'
  const qrData: string[] = []
  const imagesByListing = new Map<string, PdfImage[]>()
  let imageCount = 0
  let y = 0
  let currentListingTitle = ''

  if (kind === 'housing') {
    await Promise.all(listings.map(async (listing) => {
      if (listing.source !== 'oeh-housing') return
      const images = (await Promise.all((listing.images ?? []).slice(0, 2).map(loadPdfImage))).filter((image): image is PdfImage => image !== undefined)
      imagesByListing.set(listing.id, images)
      imageCount += images.length
    }))
  }

  const drawPageChrome = (): void => {
    doc.setFillColor(red)
    doc.rect(0, 0, 6, pageHeight, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(red)
    doc.text('BAHNHOFSSOZIALDIENST', margin, 13)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(muted)
    doc.text('Jobs & Wohnungen', pageWidth - margin, 13, { align: 'right' })
    doc.setDrawColor(line)
    doc.setLineWidth(0.25)
    doc.line(margin, 17, pageWidth - margin, 17)
  }

  const addContinuationPage = (): void => {
    doc.addPage()
    drawPageChrome()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(red)
    doc.text('FORTSETZUNG', margin, 27)
    doc.setFontSize(13)
    doc.setTextColor(dark)
    doc.text((doc.splitTextToSize(currentListingTitle, contentWidth - 28) as string[]).slice(0, 2), margin, 34)
    y = 47
  }

  const ensureSpace = (height: number): void => {
    if (y + height > contentBottom) addContinuationPage()
  }

  const drawDocumentHeader = (): void => {
    drawPageChrome()
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(24)
    doc.setTextColor(dark)
    doc.text(pdfSafe(documentTitle), margin, 32)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.setTextColor(red)
    doc.text(pdfSafe(REGIONS[region].pdfLabel), margin, 40)

    const cells = [
      ['AUSWAHL', `${listings.length} ${listings.length === 1 ? 'Angebot' : 'Angebote'}`],
      ['ERSTELLT', dateText()],
      ['DATENSTAND', dateText(new Date(updatedAt))],
    ]
    const cellWidth = contentWidth / cells.length
    cells.forEach(([label, text], index) => {
      const x = margin + index * cellWidth
      doc.setFillColor(index === 0 ? red : light)
      doc.rect(x, 48, cellWidth, 17, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6.8)
      doc.setTextColor(index === 0 ? '#ffffff' : muted)
      doc.text(label ?? '', x + 4, 54)
      doc.setFontSize(10.5)
      doc.setTextColor(index === 0 ? '#ffffff' : dark)
      doc.text(text ?? '', x + 4, 61)
    })
    y = 74
  }

  const drawSectionLabel = (label: string): void => {
    ensureSpace(10)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7)
    doc.setTextColor(red)
    doc.text(label, margin, y)
    doc.setDrawColor(red)
    doc.line(margin + 37, y - 1, pageWidth - margin, y - 1)
    y += 6
  }

  const drawFactGrid = (facts: Array<[string, string]>): void => {
    const gap = 2
    const cellWidth = (contentWidth - gap) / 2
    for (let index = 0; index < facts.length; index += 2) {
      const pair = facts.slice(index, index + 2)
      const lineGroups = pair.map(([, text]) => doc.splitTextToSize(pdfSafe(text), cellWidth - 8) as string[])
      const rowHeight = Math.max(16, ...lineGroups.map((lines) => 10 + lines.length * 3.7))
      ensureSpace(rowHeight + 2)
      pair.forEach(([label, text], column) => {
        const x = margin + column * (cellWidth + gap)
        doc.setFillColor(light)
        doc.rect(x, y, cellWidth, rowHeight, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.8)
        doc.setTextColor(muted)
        doc.text(pdfSafe(label).toLocaleUpperCase('de-AT'), x + 4, y + 5.5)
        doc.setFontSize(9.5)
        doc.setTextColor(dark)
        doc.text(doc.splitTextToSize(pdfSafe(text), cellWidth - 8) as string[], x + 4, y + 11)
      })
      y += rowHeight + 2
    }
  }

  const drawWrappedSection = (label: string, text: string): void => {
    const allLines = doc.splitTextToSize(pdfSafe(text), contentWidth - 8) as string[]
    let cursor = 0
    while (cursor < allLines.length) {
      ensureSpace(18)
      const availableLines = Math.max(1, Math.floor((contentBottom - y - 11) / 4))
      const lines = allLines.slice(cursor, cursor + availableLines)
      doc.setFillColor('#ffffff')
      doc.setDrawColor(line)
      doc.rect(margin, y, contentWidth, 9 + lines.length * 4, 'FD')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(muted)
      doc.text(pdfSafe(label).toLocaleUpperCase('de-AT'), margin + 4, y + 5.5)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(dark)
      doc.text(lines, margin + 4, y + 11)
      y += 11 + lines.length * 4
      cursor += lines.length
    }
    y += 2
  }

  const drawHousingImages = (images: PdfImage[]): void => {
    drawSectionLabel('BILDER AUS DEM ORIGINALINSERAT')
    if (!images.length) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8.5)
      doc.setTextColor(muted)
      doc.text('Im Originalinserat ist kein verwendbares Galeriebild verfügbar.', margin, y + 2)
      y += 9
      return
    }
    const gap = 3
    const width = images.length === 1 ? 112 : (contentWidth - gap) / 2
    const height = images.length === 1 ? 62.6 : width / 1.788
    ensureSpace(height + 3)
    images.forEach((image, index) => {
      const x = images.length === 1 ? margin + (contentWidth - width) / 2 : margin + index * (width + gap)
      doc.addImage(image.dataUrl, image.format, x, y, width, height, undefined, 'FAST')
    })
    y += height + 4
  }

  const drawContactPanel = async (contact: ContactDetails | undefined, edit: ManualListingEdits, originalUrl: string): Promise<void> => {
    const rows: Array<{ label: string; values: string[]; links?: string[] }> = []
    const editNames = splitEdit(edit.contactName)
    const editEmails = splitEdit(edit.contactEmail)
    const editPhones = splitEdit(edit.contactPhone)
    if (editNames.length || contact?.names.length) rows.push({ label: 'Ansprechperson', values: editNames.length ? editNames : contact?.names ?? [] })
    if (editEmails.length || contact?.emails.length) {
      const values = editEmails.length ? editEmails : contact?.emails ?? []
      rows.push({ label: 'E-Mail', values, links: values.map((item) => `mailto:${item}`) })
    }
    if (editPhones.length || contact?.phones.length) {
      const values = editPhones.length ? editPhones : contact?.phones ?? []
      rows.push({ label: 'Telefon', values, links: values.map((item) => `tel:${item.replace(/\s/g, '')}`) })
    }
    if (contact?.applicationUrls.length) rows.push({ label: 'Bewerbung', values: contact.applicationUrls, links: contact.applicationUrls })
    if (contact?.websites.length) rows.push({ label: 'Webseite', values: contact.websites, links: contact.websites })
    const leftWidth = 118
    const prepared = rows.map((row) => ({ ...row, lines: row.values.flatMap((item) => doc.splitTextToSize(pdfSafe(item), leftWidth - 48) as string[]) }))
    const height = Math.max(45, 9 + prepared.reduce((sum, row) => sum + Math.max(5, row.lines.length * 4), 0))
    ensureSpace(height + 10)
    drawSectionLabel('KONTAKT UND ORIGINALINSERAT')
    const qr = await QRCode.toDataURL(originalUrl, { margin: 0, width: 180, errorCorrectionLevel: 'M' })
    qrData.push(originalUrl)
    doc.setFillColor(redSoft)
    doc.setDrawColor(red)
    doc.setLineWidth(0.35)
    doc.rect(margin, y, contentWidth, height, 'FD')
    doc.setFillColor(red)
    doc.rect(margin, y, 3, height, 'F')
    if (prepared.length) {
      let rowY = y + 7
      prepared.forEach((row) => {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.6)
        doc.setTextColor(dark)
        doc.text(row.label.toLocaleUpperCase('de-AT'), margin + 7, rowY)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7.8)
        let valueY = rowY
        row.values.forEach((item, valueIndex) => {
          const lines = doc.splitTextToSize(pdfSafe(item), leftWidth - 48) as string[]
          doc.setTextColor(row.links ? '#002fa7' : dark)
          doc.text(lines, margin + 43, valueY)
          if (row.links?.[valueIndex]) addLinkAnnotations(doc, lines, margin + 43, valueY, row.links[valueIndex] ?? '')
          valueY += lines.length * 4
        })
        rowY += Math.max(5, row.lines.length * 4)
      })
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(dark)
      doc.text(doc.splitTextToSize('Keine direkten Kontaktdaten angegeben. Bitte das Originalinserat öffnen.', leftWidth - 14) as string[], margin + 7, y + 9)
    }

    const rightCenter = margin + leftWidth + (contentWidth - leftWidth) / 2
    const qrX = rightCenter - 13
    doc.setDrawColor(red)
    doc.line(margin + leftWidth, y + 5, margin + leftWidth, y + height - 5)
    doc.addImage(qr, 'PNG', qrX + 2, y + 4, 22, 22)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.6)
    doc.setTextColor(dark)
    doc.text('ORIGINALINSERAT', rightCenter, y + 30, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.4)
    doc.setTextColor('#002fa7')
    const linkLabel = 'ÖH-Inserat öffnen'
    doc.text(linkLabel, rightCenter, y + 36, { align: 'center' })
    doc.link(rightCenter - doc.getTextWidth(linkLabel) / 2, y + 33, doc.getTextWidth(linkLabel), 4, { url: originalUrl })
    doc.setTextColor(muted)
    doc.setFontSize(6.4)
    doc.text('Scannen oder anklicken', rightCenter, y + 41, { align: 'center' })
    y += height + 4
  }

  drawDocumentHeader()
  for (const [index, listing] of listings.entries()) {
    if (index > 0) {
      doc.addPage()
      drawPageChrome()
      y = 27
    }
    currentListingTitle = value(edits[listing.id]?.title ?? listing.title)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(17)
    const titleLines = doc.splitTextToSize(currentListingTitle, contentWidth - 24) as string[]
    doc.setFontSize(8)
    doc.setTextColor(red)
    doc.text(String(index + 1).padStart(2, '0'), margin, y + 3)
    doc.setFontSize(17)
    doc.setTextColor(dark)
    doc.text(titleLines.slice(0, 3), margin + 15, y + 3)
    y += Math.max(15, titleLines.slice(0, 3).length * 6.7 + 5)

    if (listing.source === 'oeh-housing') drawHousingImages(imagesByListing.get(listing.id) ?? [])

    drawSectionLabel('ANGEBOTSDATEN')
    if (listing.source === 'oeh-jobs') {
      drawFactGrid([
        ['Arbeitgeber', value(edits[listing.id]?.employer ?? listing.employer)],
        ['Arbeitsort', value(edits[listing.id]?.location ?? listing.location)],
        ['Beschäftigung', value(edits[listing.id]?.employmentType ?? listing.employmentType)],
        ['Arbeitszeiten', value(edits[listing.id]?.workingHours ?? listing.workingHours)],
        ['Beginn', value(edits[listing.id]?.startDate ?? listing.startDate)],
        ['Gehalt', value(edits[listing.id]?.salary ?? listing.salary)],
        ['Veröffentlicht', listing.publishedAt ? dateText(new Date(listing.publishedAt)) : missing],
        ['Bewerbungsfrist', listing.validUntil ? dateText(new Date(listing.validUntil)) : missing],
      ])
      drawWrappedSection('Aufgaben', value(edits[listing.id]?.tasks ?? listText(listing.tasks)))
      drawWrappedSection('Voraussetzungen', value(edits[listing.id]?.requirements ?? listText(listing.requirements)))
    } else {
      drawFactGrid([
        ['Lage', value(edits[listing.id]?.location ?? listing.location)],
        ['Unterkunft', housingTypeLabel(listing.housingType)],
        ['Größe / Zimmer', `${value(edits[listing.id]?.sizeM2 ?? listing.sizeM2)} m² / ${value(edits[listing.id]?.rooms ?? listing.rooms)}`],
        ['Gesamtmiete', listing.totalRent === undefined ? missing : `${listing.totalRent.toLocaleString('de-AT')} € / Monat`],
        ['Betriebskosten', value(edits[listing.id]?.operatingCosts ?? listing.operatingCosts)],
        ['Heizung / Strom', `${value(edits[listing.id]?.heatingCosts ?? listing.heatingCosts)} / ${value(edits[listing.id]?.electricityCosts ?? listing.electricityCosts)}`],
        ['Kaution', value(edits[listing.id]?.deposit ?? listing.deposit)],
        ['Verfügbarkeit', value(edits[listing.id]?.availableFrom ?? listing.availableFrom)],
      ])
      drawWrappedSection('Ausstattung', value(edits[listing.id]?.amenities ?? listText(listing.amenities)))
      if (listing.oneTimeCosts || listing.conditions.length) drawWrappedSection('Weitere Kosten / Bedingungen', [value(edits[listing.id]?.oneTimeCosts ?? listing.oneTimeCosts), listText(listing.conditions)].filter((item) => item !== missing).join('; ') || missing)
    }

    drawWrappedSection('Einschätzung', value(listing.suitability?.reasons.join('; ')))
    await drawContactPanel(listing.contact, edits[listing.id] ?? {}, listing.originalUrl)
  }

  const total = doc.getNumberOfPages()
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(line)
    doc.line(margin, pageHeight - 19, pageWidth - margin, pageHeight - 19)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(muted)
    const footerNote = kind === 'housing'
      ? 'Angaben im Original prüfen. Nie vor Besichtigung bezahlen oder Ausweisdokumente an Unbekannte senden.'
      : 'Kontaktdaten, Fristen und Verfügbarkeit bitte vor der Bewerbung im Originalinserat prüfen.'
    doc.text(footerNote, margin, pageHeight - 14)
    doc.text(`Datenstand ${dateText(new Date(updatedAt))}`, margin, pageHeight - 9)
    doc.text(`Seite ${page} / ${total}`, pageWidth - margin, pageHeight - 9, { align: 'right' })
  }

  const blob = doc.output('blob')
  return { blob, fileName: createPdfFilename(kind, region), qrData, imageCount }
}

function splitEdit(value: string | number | undefined): string[] {
  if (typeof value !== 'string') return []
  return value.split(/[;,\n]/).map(pdfSafe).filter(Boolean)
}

function addLinkAnnotations(doc: InstanceType<typeof import('jspdf').jsPDF>, lines: string[], x: number, y: number, url: string): void {
  lines.forEach((line, index) => doc.link(x, y - 3 + index * 3.5, doc.getTextWidth(line), 4, { url }))
}

async function loadPdfImage(image: ListingImage): Promise<PdfImage | undefined> {
  if (!image.path) return undefined
  try {
    const url = image.path.startsWith('data:')
      ? image.path
      : typeof window === 'undefined'
        ? image.path
        : new URL(`${import.meta.env.BASE_URL}${image.path.replace(/^\//, '')}`, window.location.origin).href
    if (url.startsWith('data:')) return { dataUrl: url, format: imageFormat(url) }
    const response = await fetch(url, { cache: 'force-cache' })
    if (!response.ok) return undefined
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) return undefined
    const bytes = new Uint8Array(await response.arrayBuffer())
    let binary = ''
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000))
    const dataUrl = `data:${contentType.split(';')[0]};base64,${btoa(binary)}`
    return { dataUrl, format: imageFormat(dataUrl) }
  } catch { return undefined }
}

function imageFormat(dataUrl: string): PdfImage['format'] {
  if (/image\/png/i.test(dataUrl)) return 'PNG'
  if (/image\/webp/i.test(dataUrl)) return 'WEBP'
  return 'JPEG'
}

export function housingTypeLabel(type: string): string {
  return ({ garconniere: 'Garçonnière', apartment: 'Wohnung', 'shared-room': 'WG-Zimmer', other: 'Sonstige Unterkunft' } as Record<string, string>)[type] ?? missing
}
