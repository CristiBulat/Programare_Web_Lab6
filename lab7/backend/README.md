# Reel API (FastAPI)

Back-end for **Lab 7** — CRUD over the `WatchEntry` entities from the Lab 6
Angular client, protected with JWT.

See the parent [`../README.md`](../README.md) for the full lab walkthrough.

## Run

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python seed.py        # optional
python run.py         # http://127.0.0.1:8000
```

- Swagger UI: <http://127.0.0.1:8000/docs>
- ReDoc:      <http://127.0.0.1:8000/redoc>
- OpenAPI:    <http://127.0.0.1:8000/openapi.json>

## Layout

```
backend/
  app/
    __init__.py
    main.py         # FastAPI app, routes
    auth.py         # JWT issuance, role→permission map, dependencies
    database.py     # SQLModel engine + session
    models.py       # SQLModel table + Pydantic schemas
  run.py            # uvicorn launcher
  seed.py           # inserts 5 demo entries
  requirements.txt
```

## Auth in one breath

`POST /token` with `{"role":"ADMIN"|"WRITER"|"VISITOR"}` →
`{access_token, expires_in: 60, role, permissions}`. Send the token on every
protected endpoint as `Authorization: Bearer <token>`. Use
`POST /token/refresh` to renew without re-picking the role.

| Role      | Permissions             |
| --------- | ----------------------- |
| `ADMIN`   | READ, WRITE, DELETE     |
| `WRITER`  | READ, WRITE             |
| `VISITOR` | READ                    |

## Route map

25 endpoints in total — grouped under three tags (`meta`, `auth`, `entries`)
visible in Swagger. The full table lives in [`../README.md`](../README.md).
Highlights beyond plain CRUD:

- `POST /token/refresh`, `GET /auth/roles`
- `GET /entries/random|top|recent`
- `POST /entries/{id}/like`, `PATCH /entries/{id}/status|rating`,
  `POST /entries/{id}/episodes`
- `POST /entries/bulk`, `POST /entries/bulk-delete`
- `GET /stats`, `GET /genres`, `GET /genres/counts`

## Pagination

`GET /entries?skip=0&limit=20&type=movie&status=watching&liked=true&query=dune&sort=rating`
returns `{items, total, skip, limit}` and an `X-Total-Count` header.
