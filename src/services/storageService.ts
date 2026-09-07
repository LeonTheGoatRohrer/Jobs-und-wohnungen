import type { Listing, ManualListingEdits } from '@/models/listings'

const KEY = 'jobs-und-wohnungen-selection-v1'

export interface StoredSelection {
  listings: Listing[]
  edits: Record<string, ManualListingEdits>
}

export function loadSelection(): StoredSelection {
  try {
    const value = localStorage.getItem(KEY)
    return value ? JSON.parse(value) as StoredSelection : { listings: [], edits: {} }
  } catch {
    return { listings: [], edits: {} }
  }
}

export function saveSelection(value: StoredSelection): void {
  localStorage.setItem(KEY, JSON.stringify(value))
}

export function clearSelection(): void {
  localStorage.removeItem(KEY)
}
