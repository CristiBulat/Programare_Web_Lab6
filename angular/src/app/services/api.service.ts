import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { SettingsService } from './settings.service';
import { SortKey, MediaType, WatchEntry, WatchStatus } from '../models/types';

export interface EntryPage {
  items: WatchEntry[];
  total: number;
  skip: number;
  limit: number;
}

export interface ListEntriesOptions {
  skip?: number;
  limit?: number;
  type?: MediaType | null;
  status?: WatchStatus | null;
  liked?: boolean | null;
  query?: string | null;
  sort?: SortKey;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private settings = inject(SettingsService);

  private base(): string {
    return this.settings.apiUrl();
  }

  listEntries(opts: ListEntriesOptions = {}): Promise<EntryPage> {
    let params = new HttpParams()
      .set('skip', String(opts.skip ?? 0))
      .set('limit', String(opts.limit ?? 50));
    if (opts.type) params = params.set('type', opts.type);
    if (opts.status) params = params.set('status', opts.status);
    if (opts.liked != null) params = params.set('liked', String(opts.liked));
    if (opts.query && opts.query.trim()) params = params.set('query', opts.query.trim());
    if (opts.sort) params = params.set('sort', opts.sort);
    return firstValueFrom(this.http.get<EntryPage>(`${this.base()}/entries`, { params }));
  }

  getEntry(id: number): Promise<WatchEntry> {
    return firstValueFrom(this.http.get<WatchEntry>(`${this.base()}/entries/${id}`));
  }

  createEntry(payload: Partial<WatchEntry>): Promise<WatchEntry> {
    const body = stripClientFields(payload);
    return firstValueFrom(this.http.post<WatchEntry>(`${this.base()}/entries`, body));
  }

  updateEntry(id: number, patch: Partial<WatchEntry>): Promise<WatchEntry> {
    const body = stripClientFields(patch);
    return firstValueFrom(this.http.patch<WatchEntry>(`${this.base()}/entries/${id}`, body));
  }

  deleteEntry(id: number): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base()}/entries/${id}`));
  }

  bulkImport(entries: WatchEntry[]): Promise<{ inserted: number }> {
    const payload = { entries: entries.map((e) => stripClientFields(e)) };
    return firstValueFrom(
      this.http.post<{ inserted: number }>(`${this.base()}/entries/bulk`, payload),
    );
  }

  clearAll(): Promise<void> {
    return firstValueFrom(this.http.delete<void>(`${this.base()}/entries`));
  }
}

function stripClientFields(e: Partial<WatchEntry>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...e };
  delete out['id'];
  delete out['createdAt'];
  delete out['updatedAt'];
  for (const k of Object.keys(out)) {
    if (out[k] === undefined) delete out[k];
  }
  return out;
}
