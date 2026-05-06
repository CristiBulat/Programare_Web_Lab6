import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';
import { MediaType, SearchResult } from '../models/types';

const BASE = 'https://www.omdbapi.com/';

interface OmdbSearchItem {
  imdbID: string;
  Title: string;
  Year: string;
  Type: 'movie' | 'series' | 'episode';
  Poster: string;
}

interface OmdbSearchResponse {
  Search?: OmdbSearchItem[];
  totalResults?: string;
  Response: 'True' | 'False';
  Error?: string;
}

function mapType(t: OmdbSearchItem['Type']): MediaType {
  if (t === 'movie') return 'movie';
  return 'series';
}

function parseYear(year: string): number | null {
  const m = year.match(/^\d{4}/);
  return m ? Number(m[0]) : null;
}

@Injectable({ providedIn: 'root' })
export class OmdbService {
  private http = inject(HttpClient);

  search(
    query: string,
    apiKey: string,
    type?: 'movie' | 'series',
  ): Observable<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return new Observable((s) => {
        s.next([]);
        s.complete();
      });
    }
    if (!apiKey) {
      return throwError(() => new Error('Missing OMDb API key. Add it in Settings.'));
    }
    let params = new HttpParams().set('apikey', apiKey).set('s', trimmed);
    if (type) params = params.set('type', type);

    return this.http.get<OmdbSearchResponse>(BASE, { params }).pipe(
      map((data) => {
        if (data.Response === 'False') {
          if (data.Error?.toLowerCase().includes('not found')) return [];
          throw new Error(data.Error || 'OMDb error');
        }
        return (data.Search ?? [])
          .filter((it) => it.Type !== 'episode')
          .map<SearchResult>((it) => ({
            externalId: `imdb_${it.imdbID}`,
            type: mapType(it.Type),
            title: it.Title,
            year: parseYear(it.Year),
            posterUrl: it.Poster && it.Poster !== 'N/A' ? it.Poster : undefined,
          }));
      }),
    );
  }
}
