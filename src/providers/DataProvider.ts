import type { DataMeta, Listing } from '@/models/listings'

export interface DataProvider<T extends Listing> {
  load(): Promise<T[]>
}

export interface DataBundle {
  listings: Listing[]
  meta: DataMeta
}
