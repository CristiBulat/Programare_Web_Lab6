# Reel — Anime, Movie & Series Tracker

Client-side watchlist app built for **WEB-LAB6** (FCIM, UTM).
Search anime via [Jikan](https://jikan.moe/) (no API key) and movies/series via [OMDb](https://www.omdbapi.com/) (free key), then track what you're watching, planning, completed, or dropped — with ratings, likes, notes, and episode progress. Light & dark theme, fully offline-capable after first load.

> Topic was approved beforehand: anime/movie/series tracker.

---

## Tech stack

- **React 19 + TypeScript + Vite** — front-end framework
- **Tailwind CSS** — custom theme with light/dark mode (class strategy)
- **Zustand** — runtime state (entries, filters, settings)
- **Dexie.js** — IndexedDB persistence for watchlist entries
- **react-router-dom** (HashRouter) — client-side routing, GitHub-Pages-friendly
- External APIs: **Jikan v4** (anime) and **OMDb** (movies / series)

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

---

## Flows

### 1. Browse the library
`/` — Library lists every entry as a poster card with status, rating, and a quick like-toggle. Counts in the header summarize the library by status. Cards link into the entry detail.

### 2. Search & add from an API
`/search` — Tabs for **Anime / Movies / Series**. Typing debounces a request to Jikan or OMDb. Click **Add** on a result and it's persisted; if it's already in the library the button shows **In library** instead.

### 3. Add manually
`/add` — Form for entries the APIs don't return: title, type, status, year, poster URL, genres, synopsis, notes, total episodes (for anime/series).

### 4. View / edit / delete
`/entry/:id` — Full detail view. Change status with a chip row, rate with stars, like/unlike, increment episodes watched, edit any field, or delete the entry. All writes go through the Zustand store and Dexie in lockstep.

### 5. Filter & sort
The Library page exposes type, status, genre, and liked-only chips, plus a search box and a sort dropdown (recent / title / rating / year). Filters live in the store, so they persist between page navigations within a session.

### 6. Settings
`/settings` — Toggle theme, paste an OMDb key (used for movie/series search; key never leaves the browser), export the library to JSON, import a JSON dump, or wipe all entries.

---

## Local development

```bash
npm install
npm run dev      # vite dev server at http://localhost:5173
npm run build    # type-check + production build to dist/
npm run preview  # preview the production build
```

## Deploy to GitHub Pages

The Vite config defaults `base` to `./` so the build works under any path.
You can deploy with [`gh-pages`](https://www.npmjs.com/package/gh-pages):

```bash
# After pushing to a GitHub repo and enabling Pages on branch gh-pages:
npm run deploy
```

The app uses `HashRouter`, so deep-linking (e.g. `/#/entry/3`) works on GitHub Pages without server-side rewrites.

---

## Project structure

```
src/
  api/
    jikan.ts        # Jikan v4 client (anime search)
    omdb.ts         # OMDb client (movie/series search)
  components/
    Layout.tsx      # sidebar + topbar shell
    EntryCard.tsx   # poster card used on Library
    Poster.tsx      # image with type-icon fallback
    StatusBadge.tsx # colored status pill
    StarRating.tsx  # half-star rating control
    ThemeToggle.tsx
    Icons.tsx       # SVG icons (no external icon lib)
    EmptyState.tsx
    Spinner.tsx
  pages/
    Library.tsx     # list + filters + sort
    Search.tsx      # API-backed search
    AddManual.tsx   # manual entry form
    Detail.tsx      # entry detail / edit
    Settings.tsx    # theme, OMDb key, export/import
  store/
    library.ts      # Zustand: entries + filters; talks to Dexie
    settings.ts     # Zustand: theme + OMDb key
  db.ts             # Dexie database (one table: entries)
  types.ts
  index.css         # Tailwind layers + component classes
  main.tsx
  App.tsx           # routes
```

---

## Notes on the WEB-LAB6 requirements

- **Entities w/ add/remove/like/filter** → `WatchEntry` rows with full CRUD, like toggle, multi-axis filters.
- **Custom theme with light/dark** → custom Tailwind tokens (`bg`, `surface`, `elevated`, `line`, `ink`, `accent`); class-based dark mode persisted in localStorage with system-preference fallback.
- **Front-end framework** → React.
- **Runtime + browser-stored state** → Zustand (runtime) + Dexie/IndexedDB (entries) + localStorage (preferences).
- **Decent git history** → progressive commits per feature; check `git log` for the build-up.
- **Public hosting** → GitHub Pages via `npm run deploy`.
