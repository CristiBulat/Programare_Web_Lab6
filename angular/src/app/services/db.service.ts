import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { WatchEntry } from '../models/types';

class ReelDB extends Dexie {
  entries!: Table<WatchEntry, number>;

  constructor() {
    super('reel-db');
    this.version(1).stores({
      entries: '++id, externalId, type, status, liked, title, updatedAt',
    });
  }
}

@Injectable({ providedIn: 'root' })
export class DbService {
  readonly db = new ReelDB();
}
