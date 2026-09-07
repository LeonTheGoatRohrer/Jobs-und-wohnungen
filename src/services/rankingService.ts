import type { HousingListing, JobListing, SuitabilityResult } from '@/models/listings'

const includesAny = (text: string, terms: string[]): boolean => terms.some((term) => text.includes(term))

function result(score: number, reasons: string[]): SuitabilityResult {
  return { level: score >= 4 ? 'very-suitable' : score >= 1 ? 'suitable' : 'limited', score, reasons: reasons.slice(0, 4) }
}

export function rankJob(job: JobListing): SuitabilityResult {
  const text = `${job.title} ${job.description ?? ''} ${job.requirements.join(' ')}`.toLocaleLowerCase('de-AT')
  const reasons: string[] = []
  let score = 0
  const explicitNoTraining = includesAny(text, ['keine ausbildung erforderlich', 'quereinsteiger', 'keine vorkenntnisse'])
  const entryLevelActivity = includesAny(text, ['reinigung', 'putzkraft', 'aushilfe', 'lager', 'küchenhilfe', 'zustellung', 'produktion', 'servicekraft'])
  if (explicitNoTraining) { score += 3; reasons.push('Ausbildung laut Inserat nicht erforderlich') }
  else reasons.push('Ausbildung im Inserat nicht eindeutig angegeben')
  if (includesAny(text, ['lehrabschluss', 'abgeschlossene ausbildung', 'studium erforderlich', 'fachausbildung'])) { score -= 4; reasons.push('Formale Ausbildung wird verlangt') }
  if (includesAny(text, ['keine berufserfahrung', 'erfahrung nicht erforderlich'])) { score += 2; reasons.push('Berufserfahrung laut Inserat nicht erforderlich') }
  if (includesAny(text, ['mehrjährige berufserfahrung', 'mehrjährige erfahrung'])) { score -= 3; reasons.push('Mehrjährige Erfahrung wird verlangt') }
  if (/teilzeit|geringfügig|fallweise/.test(job.employmentType ?? text)) { score += 2; reasons.push('Teilzeit oder geringfügige Beschäftigung möglich') }
  if (job.salary) { score += 1; reasons.push('Bezahlung ist angegeben') } else reasons.push('Bezahlung nicht angegeben')
  if ((job.location ?? '').toLocaleLowerCase('de-AT').includes('innsbruck')) { score += 1; reasons.push('Arbeitsort im Raum Innsbruck') }
  if (includesAny(text, ['führerschein erforderlich', 'führerschein b erforderlich', 'eigener pkw'])) { score -= 2; reasons.push('Führerschein oder eigenes Fahrzeug wird verlangt') }
  if (entryLevelActivity) { score += 1; reasons.push('Niederschwellige Tätigkeit erkennbar') }
  const ranked = result(score, reasons)
  if (ranked.level === 'very-suitable' && !explicitNoTraining && !entryLevelActivity) ranked.level = 'suitable'
  return ranked
}

export function rankHousing(item: HousingListing): SuitabilityResult {
  const text = `${item.title} ${item.description ?? ''}`.toLocaleLowerCase('de-AT')
  const reasons: string[] = []
  let score = 0
  if (item.totalRent !== undefined) {
    if (item.totalRent <= 650) { score += 4; reasons.push('Vergleichsweise niedrige Monatsmiete') }
    else if (item.totalRent <= 900) { score += 2; reasons.push('Monatsmiete im mittleren Bereich') }
    else { score -= 2; reasons.push('Hohe Monatsmiete') }
  } else reasons.push('Monatsmiete nicht angegeben')
  if (item.housingType === 'garconniere' || item.housingType === 'apartment') { score += 2; reasons.push('Eigenständige Unterkunft') }
  if (item.housingType === 'shared-room') { score -= 1; reasons.push('Zimmer in einer Wohngemeinschaft') }
  if (item.operatingCosts || /betriebskosten.{0,20}(inkl|enthalten)/.test(text)) { score += 1; reasons.push('Betriebskosten sind ausgewiesen') } else reasons.push('Betriebskosten nicht angegeben')
  if (/ablöse/.test(text) || item.oneTimeCosts) { score -= 2; reasons.push('Einmalige Zusatzkosten oder Ablöse') }
  if (/gegenleistung|betreuung gegen wohnen/.test(text)) { score -= 4; reasons.push('Ungewöhnliche Gegenleistung genannt') }
  if (item.deposit && (parseFloat(item.deposit.replace(/[^\d,]/g, '').replace(',', '.')) > 2500)) { score -= 2; reasons.push('Hohe Kaution') }
  return result(score, reasons)
}
