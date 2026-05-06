# Reel — Anime, Movie & Series Tracker

Client-side watchlist app built for **WEB-LAB6** (FCIM, UTM).
Search anime via [Jikan](https://jikan.moe/) (no API key) and movies/series via [OMDb](https://www.omdbapi.com/) (free key), then track what you're watching, planning, completed, or dropped — with ratings, likes, notes, and episode progress. Light & dark theme, fully offline-capable after first load.

> Topic was approved beforehand: anime/movie/series tracker.

---

## Repository layout

```
lab6/
  angular/          ← active app (Angular 18 + Tailwind + Dexie). This is the one to run.
  legacy-react/     ← original React 19 + Vite implementation, archived.
```

## Run the app (Angular)

```bash
cd angular
npm install
npm start            # ng serve at http://localhost:3000
```

Other scripts (run from `angular/`):

- `npm run build` — production build into `angular/dist/reel-angular/`
- `npm run deploy` — build + push to `gh-pages` branch (after a GitHub remote is set up)

## Tech stack

- **Angular 18** with standalone components and signals — front-end framework
- **Tailwind CSS** — custom theme with light/dark mode (class strategy)
- **Dexie.js** — IndexedDB persistence for the watchlist
- **Angular Router** with `withHashLocation()` — GitHub-Pages-friendly deep links
- **HttpClient + RxJS** — debounced search against Jikan v4 (anime) and OMDb (movies/series)

## State persistence

The lab requires that *some* state lives in the browser. This app uses two layers:

| Where           | What                                       |
| --------------- | ------------------------------------------ |
| **IndexedDB**   | All `WatchEntry` rows (the library itself) |
| **localStorage**| `theme` (`light` / `dark`) and OMDb API key |
| **runtime**     | Search results, filters, edit drafts        |

Entries survive reloads, browser restarts, and offline; preferences too.

---

## Features

- **Add entries** from the API (anime via Jikan, movies/series via OMDb) or manually for anything you can't find.
- **Manipulate** entries: add, remove, like/unlike, change status, rate (½-star steps on a 5-star scale), edit metadata, take notes, count watched episodes.
- **Filter** by type (anime / movie / series), status (watching / plan to watch / completed / on hold / dropped), genres, liked-only — combined with a free-text search and four sort orders.
- **Theme**: light / dark, persisted; respects system preference on first visit.
- **Backup**: export library to JSON, re-import on another device, or clear everything.

## Flows

### 1. Browse the library
`/` — Library lists every entry as a poster card with status, rating, and a quick like-toggle. Counts in the header summarize the library by status. Cards link into the entry detail.

### 2. Search & add from an API
`/search` — Tabs for **Anime / Movies / Series**. Typing debounces a request to Jikan or OMDb. Click **Add** on a result and it's persisted; if it's already in the library the button shows **In library** instead.

### 3. Add manually
`/add` — Form for entries the APIs don't return: title, type, status, year, poster URL, genres, synopsis, notes, total episodes (for anime/series).

### 4. View / edit / delete
`/entry/:id` — Full detail view. Change status with a chip row, rate with stars, like/unlike, increment episodes watched, edit any field, or delete the entry.

### 5. Filter & sort
The Library page exposes type, status, genre, and liked-only chips, plus a search box and a sort dropdown (recent / title / rating / year).

### 6. Settings
`/settings` — Toggle theme, paste an OMDb key, export the library to JSON, import a JSON dump, or wipe all entries.

---

## Project structure (`angular/src/app/`)

```
models/
  types.ts                     # WatchEntry, MediaType, WatchStatus, SearchResult, sort/type/status labels
services/
  db.service.ts                # Dexie database (one table: entries)
  library.service.ts           # signal-based store for entries + filters + CRUD
  settings.service.ts          # signal-based store for theme + OMDb key
  jikan.service.ts             # Jikan v4 client (anime search)
  omdb.service.ts              # OMDb client (movie/series search)
components/
  layout/                      # sidebar + topbar shell
  entry-card/                  # poster card used on Library
  poster/                      # image with type-icon fallback
  status-badge/                # colored status pill
  star-rating/                 # half-star rating control
  theme-toggle/
  icon/                        # SVG icon set (no external icon lib)
  empty-state/
  spinner/
pages/
  library/                     # list + filters + sort
  search/                      # API-backed search
  add-manual/                  # manual entry form
  detail/                      # entry detail / edit
  settings/                    # theme, OMDb key, export/import
```

---

## Notes on the WEB-LAB6 requirements

- **Entities w/ add/remove/like/filter** → `WatchEntry` rows with full CRUD, like toggle, multi-axis filters.
- **Custom theme with light/dark** → custom Tailwind tokens (`bg`, `surface`, `elevated`, `line`, `ink`, `accent`); class-based dark mode persisted in localStorage with system-preference fallback.
- **Front-end framework** → Angular.
- **Runtime + browser-stored state** → Angular signals (runtime) + Dexie/IndexedDB (entries) + localStorage (preferences).
- **Decent git history** → progressive commits per feature.
- **Public hosting** → GitHub Pages via `npm run deploy` (from `angular/`).

The original React implementation is preserved in [`legacy-react/`](./legacy-react/) for reference.
