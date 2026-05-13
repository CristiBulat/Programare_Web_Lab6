# Lab 7 — Back-end (Reel API)

CRUD REST API built with **FastAPI** for the **Reel** anime / movie / series
tracker from [Lab 6](../README.md). Adds JWT-based auth, role permissions,
pagination, and a Swagger UI; integrates fully with the Lab 6 Angular client.

```
lab6/
  angular/          ← Lab 6 front-end (now also speaks the API)
  legacy-react/     ← original React implementation
  lab7/
    backend/        ← FastAPI + SQLite + JWT (this is the new artifact)
    README.md       ← you are here
```

The Lab 6 Angular client in [`../angular`](../angular) has been upgraded with
an `AuthService`, `ApiService`, JWT HTTP interceptor, and a `/login` page so it
can talk to this API.

---

## Quick start (run both sides)

### 1. Start the backend

```bash
cd lab6/lab7/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python seed.py           # optional: insert 5 demo entries
python run.py            # or:  uvicorn app.main:app --reload
```

The API is now at <http://127.0.0.1:8000>, with Swagger UI at
<http://127.0.0.1:8000/docs> and ReDoc at <http://127.0.0.1:8000/redoc>.

### 2. Start the Angular client (Lab 6)

```bash
cd lab6/angular           # sibling of lab7/
npm install
npm start                 # http://localhost:3000
```

### 3. Use the integration

1. Open <http://localhost:3000/#/settings> and confirm **API URL** points to
   `http://127.0.0.1:8000`.
2. Toggle **API mode** on, then click **Sign in**.
3. Pick a role (`ADMIN` / `WRITER` / `VISITOR`) and submit.
4. The Library page now reads from the API; CRUD actions persist server-side.
5. Tokens last 60 seconds — once expired, the interceptor catches the 401 and
   redirects you back to `/login`.

---

## Lab 7 requirements coverage

| Requirement                                              | Where it lives                                            |
| -------------------------------------------------------- | --------------------------------------------------------- |
| CRUD API for the Lab 6 entity (`WatchEntry`)             | [`app/main.py`](backend/app/main.py) `/entries` routes    |
| Accessible only with a JWT                               | `require_permissions` dependency on every protected route |
| JWT stores permissions / role                            | `ROLE_PERMISSIONS` in [`app/auth.py`](backend/app/auth.py)|
| JWT expiration (1 min)                                   | `JWT_EXPIRES_SECONDS = 60`                                |
| Front-end connected to back-end                          | `AuthService`, `ApiService`, `auth.interceptor`, `/login` |
| Swagger UI documentation                                 | `/docs` (and `/redoc`, `/openapi.json`)                   |
| Appropriate status codes                                 | 200 / 201 / 204 / 400 / 401 / 403 / 404 / 409 / 422       |
| Pagination (skip + limit)                                | `GET /entries?skip=&limit=` returns `{items,total,…}`     |
| `/token` endpoint (JSON body or `?role=` query)          | `POST /token`                                             |
| API integrated (fully) with the Lab 6 client             | Library service has dual-mode (API ↔ IndexedDB)           |

---

## Backend reference

### Roles & permissions

| Role      | Permissions             |
| --------- | ----------------------- |
| `ADMIN`   | READ, WRITE, DELETE     |
| `WRITER`  | READ, WRITE             |
| `VISITOR` | READ                    |

Permission for each route is shown in the endpoint table below.

### Endpoints (25 total)

#### `meta` & `auth`

| Method | Path                | Auth        | Description                                  |
| ------ | ------------------- | ----------- | -------------------------------------------- |
| GET    | `/`                 | —           | API info                                     |
| GET    | `/health`           | —           | Health probe                                 |
| POST   | `/token`            | —           | Issue JWT (role in JSON body or `?role=`)    |
| POST   | `/token/refresh`    | READ        | Re-issue a 60-second token, same role        |
| GET    | `/me`               | READ        | Inspect current JWT principal                |
| GET    | `/auth/roles`       | —           | List all roles + the permissions they grant  |

#### `entries` — CRUD

| Method | Path                  | Auth   | Description                                  |
| ------ | --------------------- | ------ | -------------------------------------------- |
| GET    | `/entries`            | READ   | Paginated list (filters: type/status/liked/query, sort) |
| POST   | `/entries`            | WRITE  | Create entry (409 on `externalId` collision) |
| GET    | `/entries/{id}`       | READ   | Fetch one                                    |
| PATCH  | `/entries/{id}`       | WRITE  | Partial update                               |
| PUT    | `/entries/{id}`       | WRITE  | Full replace                                 |
| DELETE | `/entries/{id}`       | DELETE | Delete one (204)                             |
| DELETE | `/entries`            | DELETE | Delete ALL (204)                             |

#### `entries` — convenience sub-resources

| Method | Path                            | Auth   | Description                              |
| ------ | ------------------------------- | ------ | ---------------------------------------- |
| POST   | `/entries/{id}/like`            | WRITE  | Toggle the `liked` flag                  |
| PATCH  | `/entries/{id}/status`          | WRITE  | Update only the watch status             |
| PATCH  | `/entries/{id}/rating`          | WRITE  | Update only the rating (null clears)     |
| POST   | `/entries/{id}/episodes`        | WRITE  | Set/increment episodes (`delta` or `value`, exactly one) |

#### `entries` — bulk & discovery

| Method | Path                  | Auth   | Description                                  |
| ------ | --------------------- | ------ | -------------------------------------------- |
| POST   | `/entries/bulk`       | WRITE  | Bulk import a list of entries (201)          |
| POST   | `/entries/bulk-delete`| DELETE | Delete several entries by ID                 |
| GET    | `/entries/random`     | READ   | Random entry (filterable by type/status/liked) |
| GET    | `/entries/top`        | READ   | Top-rated entries (`limit`, optional `type`) |
| GET    | `/entries/recent`     | READ   | Most recently updated entries (`limit`)      |
| GET    | `/genres`             | READ   | Distinct genres                              |
| GET    | `/genres/counts`      | READ   | Genres with usage counts (sorted desc)       |
| GET    | `/stats`              | READ   | Aggregated stats (counts/likes/avg rating)   |

### Sample requests

```bash
# 1. get an ADMIN token
JWT=$(curl -s -X POST http://127.0.0.1:8000/token \
  -H "Content-Type: application/json" \
  -d '{"role":"ADMIN"}' | jq -r .access_token)

# 2. list, paginated and filtered
curl -s "http://127.0.0.1:8000/entries?skip=0&limit=5&sort=rating&type=anime" \
  -H "Authorization: Bearer $JWT"

# 3. create an entry
curl -s -X POST http://127.0.0.1:8000/entries \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"type":"movie","title":"Dune Part Two","year":2024,"genres":["Sci-Fi"]}'

# 4. convenience: toggle like / set status / +1 episode
curl -s -X POST   http://127.0.0.1:8000/entries/1/like     -H "Authorization: Bearer $JWT"
curl -s -X PATCH  http://127.0.0.1:8000/entries/1/status   -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"status":"watching"}'
curl -s -X POST   http://127.0.0.1:8000/entries/1/episodes -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" -d '{"delta":1}'

# 5. discovery
curl -s http://127.0.0.1:8000/stats               -H "Authorization: Bearer $JWT"
curl -s "http://127.0.0.1:8000/entries/random?type=anime" -H "Authorization: Bearer $JWT"
curl -s "http://127.0.0.1:8000/entries/top?limit=5"       -H "Authorization: Bearer $JWT"
curl -s http://127.0.0.1:8000/genres/counts       -H "Authorization: Bearer $JWT"

# 6. keep the session alive
curl -s -X POST http://127.0.0.1:8000/token/refresh -H "Authorization: Bearer $JWT"

# 7. bulk delete
curl -s -X POST http://127.0.0.1:8000/entries/bulk-delete \
  -H "Authorization: Bearer $JWT" -H "Content-Type: application/json" \
  -d '{"ids":[42,43,44]}'
```

### Pagination shape

```json
{
  "items": [ /* EntryRead[] */ ],
  "total": 5,
  "skip": 0,
  "limit": 20
}
```

`X-Total-Count` is also returned as a response header.

### `GET /stats` shape

```json
{
  "total": 5,
  "by_type":   {"anime": 2, "movie": 1, "series": 2},
  "by_status": {"watching": 1, "completed": 3, "plan_to_watch": 1, "on_hold": 0, "dropped": 0},
  "liked": 3,
  "average_rating": 9.02,
  "rated_count": 5
}
```

### Tech stack

- **FastAPI** 0.115 + **uvicorn**
- **SQLModel** (SQLAlchemy under the hood) backed by a local **SQLite** file
  at `lab6/lab7/backend/reel.db`
- **python-jose** for JWT (HS256, 60 s TTL)
- **CORS** open to `localhost:3000` (Angular dev server) and `localhost:4200`

---

## Front-end integration

New / changed files in [`../angular`](../angular):

| File                                                              | Purpose                                                                 |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/app/services/auth.service.ts`                                | JWT state, role/permissions, expiry countdown, localStorage persistence |
| `src/app/services/api.service.ts`                                 | HTTP wrapper for `/entries` CRUD + bulk import + clear-all              |
| `src/app/services/auth.interceptor.ts`                            | Adds `Authorization: Bearer …` to API requests; on 401 redirects to `/login` |
| `src/app/services/library.service.ts`                             | Dual-mode store: API when signed in + API mode, IndexedDB otherwise     |
| `src/app/services/settings.service.ts`                            | Adds `apiUrl()` and `apiMode()` signals (persisted in localStorage)     |
| `src/app/pages/login/login.component.ts`                          | Role picker → `POST /token`                                             |
| `src/app/pages/settings/settings.component.ts`                    | UI to set API URL, toggle API mode, view token / sign out               |
| `src/app/components/layout/layout.component.ts`                   | Sidebar pill showing auth status + seconds remaining                    |
| `src/app/app.config.ts`                                           | Registers `authInterceptor`                                             |
| `src/app/app.routes.ts`                                           | Adds `/login` route                                                     |

The Lab 6 client still works fully offline — toggle **API mode** off in
Settings and IndexedDB is used as before. This satisfies the lab spec's
"integrate fully or partially" requirement.

---

## Verified flows

- `/token` issues a JWT that decodes to `{sub, role, permissions, exp}` with
  `exp − iat == 60`.
- `/token/refresh` returns a new 60-second token preserving role.
- Unauthenticated requests to protected routes return **401**.
- `VISITOR` tokens get **403** on writes (incl. `/entries/{id}/like`).
- CRUD round-trip (`POST` → `PATCH` → `DELETE`) returns 201 / 200 / 204.
- Pagination (`skip`, `limit`, `total`) works against a seeded DB.
- `/entries/random`, `/entries/top`, `/entries/recent` filter and sort
  correctly without colliding with the dynamic `/entries/{id}` route.
- `/entries/{id}/episodes` enforces "exactly one of `delta` / `value`" → 400.
- `/entries/bulk-delete` validates non-empty ID list → 422.
- `/stats` and `/genres/counts` aggregate correctly across the seeded data.
- Angular dev server (`:3000`) speaks to API (`:8000`) through CORS without
  preflight errors.
- Tokens expire after 60 s; the front-end interceptor catches the resulting
  401 and bounces the user back to `/login?reason=expired`.

---

## Submission notes

- Lab 6 deliverable: unchanged front-end behavior is preserved via the offline
  toggle. The `lab6/` git history shows the addition of API-integration files
  as Lab 7 work.
- Lab 7 deliverable: this folder (`lab6/lab7/`), plus the integration files
  added to `lab6/angular/src/app`.
