import { decode } from 'html-entities'

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
