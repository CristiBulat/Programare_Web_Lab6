import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { SearchResult } from '../models/types';

const BASE = 'https://api.jikan.moe/v4';

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  year?: number | null;
  aired?: { from?: string | null };
  synopsis?: string | null;
  images?: { jpg?: { image_url?: string; large_image_url?: string } };
  genres?: { name: string }[];
  episodes?: number | null;
}

@Injectable({ providedIn: 'root' })
export class JikanService {
  private http = inject(HttpClient);

  searchAnime(query: string): Observable<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return new Observable((s) => {
        s.next([]);
        s.complete();
      });
    }
    const params = new HttpParams()
      .set('q', trimmed)
      .set('limit', '20')
      .set('sfw', 'true');
    return this.http.get<{ data: JikanAnime[] }>(`${BASE}/anime`, { params }).pipe(
      map((res) =>
        res.data.map<SearchResult>((a) => {
          const year =
            a.year ?? (a.aired?.from ? new Date(a.aired.from).getFullYear() : null);
          return {
            externalId: `mal_${a.mal_id}`,
            type: 'anime',
            title: a.title_english || a.title,
            year,
            posterUrl: a.images?.jpg?.large_image_url || a.images?.jpg?.image_url,
            synopsis: a.synopsis ?? undefined,
            genres: a.genres?.map((g) => g.name) ?? [],
          };
        }),
      ),
    );
  }
}
