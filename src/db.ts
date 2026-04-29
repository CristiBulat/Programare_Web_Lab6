import Dexie, { type Table } from 'dexie'
import type { WatchEntry } from './types'

class ReelDB extends Dexie {
  entries!: Table<WatchEntry, number>

  constructor() {
    super('reel-db')
    this.version(1).stores({
      entries: '++id, externalId, type, status, liked, title, updatedAt',
    })
  }
}

export const db = new ReelDB()
