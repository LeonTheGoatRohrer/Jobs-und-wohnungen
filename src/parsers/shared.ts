import { decode } from 'html-entities'
import type { ContactDetails } from '@/models/listings'

export function cleanText(input: string | null | undefined): string {
  if (!input) return ''
  return decode(input.replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|li|h[1-6]|div)>/gi, '\n').replace(/<[^>]+>/g, ' '))
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

export function parseEuro(input: string | undefined): number | undefined {
  if (!input) return undefined
  const match = input.replace(/\u00a0/g, ' ').match(/(?:€|EUR)\s*([\d.]+(?:,\d{1,2})?)|([\d.]+(?:,\d{1,2})?)\s*(?:€|EUR)/i)
  const raw = match?.[1] ?? match?.[2]
  if (!raw) return undefined
  const normalized = raw.includes(',') ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/\.(?=\d{3}(?:\D|$))/g, '')
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function linesFromText(input: string): string[] {
  return input.split(/\n|[•·]/).map((line) => line.trim()).filter((line) => line.length > 2)
}

const unique = (values: Array<string | undefined>): string[] => [...new Set(values.map((item) => item?.trim()).filter((item): item is string => Boolean(item)))]

export function extractContactDetails(text: string, seed: Partial<ContactDetails> = {}): ContactDetails | undefined {
  const emails = unique([
    ...(seed.emails ?? []),
    ...[...text.matchAll(/[\w.!#$%&'*+/=?^`{|}~-]+@[\w-]+(?:\.[\w-]+)+/g)].map((match) => match[0]?.replace(/[.,;:]+$/, '')),
  ]).filter((email) => !['email@email.com', 'info@oeh.cc'].includes(email.toLocaleLowerCase('de-AT')))

  const phones = unique([
    ...(seed.phones ?? []),
    ...[...text.matchAll(/(?:\+\s*\d{1,3}|00\s*\d{1,3}|0(?:5\d{1,3}|6\d{2,3}))[\s()/.-]*(?:\d[\s()/.-]*){5,12}\d/g)].map((match) => match[0]),
  ]).filter((phone) => {
    const digits = phone.replace(/\D/g, '')
    return digits.length >= 7 && digits.length <= 15
  })

  const websites = unique([
    ...(seed.websites ?? []),
    ...[...text.matchAll(/(?:https?:\/\/|www\.)[^\s<>"']+/gi)].map((match) => normalizeWebUrl(match[0] ?? '')),
  ]).filter((url) => !/\.(?:jpe?g|png|gif|webp)(?:\?|$)/i.test(url))
  const applicationUrls = unique(seed.applicationUrls ?? [])

  const names = unique([
    ...(seed.names ?? []),
    ...[...text.matchAll(/(?:Kontaktperson|Ansprechperson|Ansprechpartner(?:in)?|Pflegedienstleiter|Geschäftsführer)\s*:\s*([^\n:]{2,80})/gi)]
      .map((match) => match[1]?.replace(/[,;]?\s*(?:Tel(?:efon)?|E-?Mail)$/i, '').trim())
      .filter((name) => name && !name.includes('@') && !/\d{4,}/.test(name)),
  ])

  if (![names, emails, phones, websites, applicationUrls].some((items) => items.length)) return undefined
  return { names, emails, phones, websites, applicationUrls }
}

function normalizeWebUrl(value: string): string {
  const clean = value.replace(/[),.;:!?]+$/, '')
  return clean.startsWith('www.') ? `https://${clean}` : clean
}
