import { load } from 'cheerio'
import type { HousingListing, HousingType } from '@/models/listings'
import { cleanText, extractContactDetails, parseEuro } from './shared'

function labeledValue(body: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const expression = new RegExp(`${label}\\s*:?\\s*([^\\n|]{1,100})`, 'i')
    const match = body.match(expression)
    if (match?.[1]) return match[1].trim()
  }
  return undefined
}

function inferType(title: string, categories: string, categoryHint?: string): HousingType {
  if (categoryHint === 'wg') return 'shared-room'
  if (categoryHint === 'garconniere') return 'garconniere'
  if (categoryHint === 'wohnung') return 'apartment'
  const value = `${title} ${categories}`.toLocaleLowerCase('de-AT')
  if (/wg.?zimmer|zimmer in .*wg/.test(value)) return 'shared-room'
  if (/gar[cç]onni[eè]re|garconniere|garcionerre|einzimmer/.test(value)) return 'garconniere'
  if (/wohnung|apartment/.test(value)) return 'apartment'
  return 'other'
}

export function parseHousingDetail(url: string, html: string, fetchedAt: string, categoryHint?: string): HousingListing {
  const $ = load(html)
  const title = cleanText($('h1.entry-title, h1.entry-title-property, .property-title h1, h1').first().text())
  const description = cleanText($('.wpestate_property_description, #property_description .panel-body, .property_description, .panel-body').first().html())
  const body = cleanText($('body').html())
  const detailMap = new Map<string, string>()
  $('.listing_detail').each((_, element) => {
    const text = cleanText($(element).text())
    const separator = text.indexOf(':')
    if (separator > 0) detailMap.set(text.slice(0, separator).trim().toLocaleLowerCase('de-AT'), text.slice(separator + 1).trim())
  })
  const get = (...labels: string[]): string | undefined => {
    for (const label of labels) {
      const exact = detailMap.get(label.toLocaleLowerCase('de-AT'))
      if (exact) return exact
    }
    return labeledValue(body, labels)
  }
  const categories = cleanText($('.property_categs, .property_categories').text())
  const address = get('Adresse', 'Lage') || cleanText($('.property_address').first().text()) || undefined
  const placeParts = $('.property_categs a[href*="/ort/"], .property_categs a[href*="/area/"]').toArray().map((element) => cleanText($(element).text())).filter(Boolean)
  const place = [...new Set(placeParts)].join(', ')
  const location = [address, place || get('Ort')].filter(Boolean).join(', ') || undefined
  const priceText = get('Preis', 'Miete', 'Monatliche Gesamtmiete') || cleanText($('.price_area, .property-price, .listing_unit_price_wrapper').first().text())
  const sizeText = get('Größe', 'Wohnfläche', 'Fläche') || body.match(/\b\d+(?:[,.]\d+)?\s*m[²2]\b/i)?.[0]
  const roomText = get('Räume', 'Zimmer', 'Anzahl Zimmer')
  const published = $('meta[property="article:published_time"]').attr('content') || $('time[datetime]').first().attr('datetime')
  const slug = new URL(url).pathname.split('/').filter(Boolean).pop() ?? url
  const amenities = $('.listing_detail .fa-check').parent().toArray().map((el) => cleanText($(el).text())).filter(Boolean)
  const contactRoot = $('#kontakt-wrapper').first()
  const contactName = cleanText(contactRoot.find('h4 a').first().text())
  const contact = extractContactDetails(`${description}\n${cleanText(contactRoot.html())}`, {
    names: contactName ? [contactName] : [],
    emails: contactRoot.find('a[href^="mailto:"]').toArray().map((element) => ($(element).attr('href') ?? '').replace(/^mailto:/i, '').split('?')[0]).filter((item): item is string => Boolean(item)),
    phones: contactRoot.find('a[href^="tel:"]').toArray().map((element) => decodeURIComponent(($(element).attr('href') ?? '').replace(/^tel:/i, '')).replace(/\+/g, ' ')),
  })
  const images = $('.prettygalery img.lightbox_trigger').toArray().map((element) => {
    const sourceUrl = $(element).attr('data-original') || $(element).attr('data-src') || $(element).attr('src')
    const alt = cleanText($(element).attr('alt'))
    if (!sourceUrl) return undefined
    try {
      const normalized = new URL(sourceUrl, url)
      if (normalized.hostname !== 'wohnen.oehweb.at' || !normalized.pathname.startsWith('/wp-content/uploads/')) return undefined
      return { sourceUrl: normalized.href, ...(alt ? { alt } : {}) }
    } catch { return undefined }
  }).filter((image): image is NonNullable<typeof image> => image !== undefined)
    .filter((image, index, all) => all.findIndex((candidate) => candidate.sourceUrl === image.sourceUrl) === index)
    .slice(0, 2)

  const totalRent = parseEuro(priceText)
  return {
    id: slug, title: title || slug.replace(/-/g, ' '), originalUrl: url, source: 'oeh-housing', fetchedAt,
    ...(published ? { publishedAt: published } : {}), ...(location ? { location } : {}),
    ...(description ? { description } : {}), ...(contact ? { contact } : {}), housingType: inferType(title, categories, categoryHint),
    ...(sizeText ? { sizeM2: Number.parseFloat(sizeText.replace(',', '.')) } : {}),
    ...(roomText && Number.isFinite(Number.parseFloat(roomText.replace(',', '.'))) ? { rooms: Number.parseFloat(roomText.replace(',', '.')) } : {}),
    ...(totalRent !== undefined ? { totalRent } : {}),
    ...optional('operatingCosts', get('Betriebskosten', 'Betriebskosten inklusive')),
    ...optional('heatingCosts', get('Heizkosten')),
    ...optional('electricityCosts', get('Stromkosten', 'Strom')),
    ...optional('deposit', get('Kaution')),
    ...optional('oneTimeCosts', get('Ablöse', 'Einmalige Kosten')),
    ...optional('availableFrom', get('Verfügbar ab', 'Bezugsfrei ab', 'Verfügbarkeit')),
    amenities, images,
    conditions: [],
  }
}

function optional<K extends string>(key: K, value: string | undefined): Record<K, string> | Record<string, never> {
  return value ? { [key]: value } as Record<K, string> : {}
}
