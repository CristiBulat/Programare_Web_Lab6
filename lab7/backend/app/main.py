from __future__ import annotations

import json
import time
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func
from sqlmodel import Session, select

from .auth import (
    Permission,
    Role,
    TokenPayload,
    TokenRequest,
    TokenResponse,
    create_access_token,
    refresh_access_token,
    require_permissions,
)
from .database import get_session, init_db
from .models import (
    BulkDeleteRequest,
    BulkDeleteResponse,
    BulkImportRequest,
    BulkImportResponse,
    EntryCreate,
    EntryPage,
    EntryRead,
    EntryUpdate,
    EpisodesUpdateRequest,
    GenreCount,
    MediaType,
    RatingUpdateRequest,
    SortKey,
    StatsResponse,
    StatusUpdateRequest,
    WatchEntry,
    WatchStatus,
)

API_TITLE = "Reel API"
API_VERSION = "1.0.0"
API_DESCRIPTION = """
CRUD API for **Reel**, the anime / movie / series tracker built for WEB-LAB6.

* JWT-based auth — get a token from `POST /token`, then send it as
  `Authorization: Bearer <token>` on protected endpoints.
* Roles (and permissions they grant):
    * `ADMIN`   → READ, WRITE, DELETE
    * `WRITER`  → READ, WRITE
    * `VISITOR` → READ
* Tokens expire after **5 minutes**.
* Pagination: every list endpoint supports `skip` / `limit`.
"""


@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    description=API_DESCRIPTION,
    lifespan=lifespan,
    swagger_ui_parameters={"persistAuthorization": True},
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:4200",
        "http://127.0.0.1:4200",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Total-Count"],
)


@app.get("/", tags=["meta"], summary="API info")
def root() -> dict[str, str]:
    return {
        "name": API_TITLE,
        "version": API_VERSION,
        "docs": "/docs",
        "openapi": "/openapi.json",
    }


@app.get("/health", tags=["meta"], summary="Health check")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post(
    "/token",
    response_model=TokenResponse,
    tags=["auth"],
    summary="Issue a JWT for a given role",
    description=(
        "Returns a JWT that expires in 300 seconds (5 minutes).\n"
        "Pass `role` as JSON body or as the `role` query parameter."
    ),
)
def issue_token(
    body: Optional[TokenRequest] = None,
    role: Optional[Role] = Query(default=None, description="Role override (query)"),
) -> TokenResponse:
    chosen = role or (body.role if body else Role.VISITOR)
    return create_access_token(chosen)


@app.get(
    "/me",
    tags=["auth"],
    summary="Inspect the current JWT principal",
)
def me(principal: TokenPayload = Depends(require_permissions(Permission.READ))) -> dict:
    return {
        "sub": principal.sub,
        "role": principal.role.value,
        "permissions": [p.value for p in principal.permissions],
        "exp": principal.exp,
    }


@app.post(
    "/token/refresh",
    response_model=TokenResponse,
    tags=["auth"],
    summary="Refresh the JWT (keeps the same role)",
    description=(
        "Issues a brand-new 60-second token for the same role as the caller's "
        "current (still-valid) token. Useful for keep-alive flows."
    ),
)
def refresh_token(
    principal: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> TokenResponse:
    return refresh_access_token(principal)


@app.get(
    "/auth/roles",
    tags=["auth"],
    summary="List all available roles and their permissions",
)
def list_roles() -> dict[str, list[str]]:
    from .auth import ROLE_PERMISSIONS

    return {role.value: [p.value for p in perms] for role, perms in ROLE_PERMISSIONS.items()}


def _row_from_create(payload: EntryCreate) -> WatchEntry:
    return WatchEntry(
        external_id=payload.externalId,
        type=payload.type,
        title=payload.title.strip(),
        year=payload.year,
        poster_url=payload.posterUrl,
        synopsis=payload.synopsis,
        genres_json=json.dumps(payload.genres),
        rating=payload.rating,
        liked=payload.liked,
        status=payload.status,
        notes=payload.notes,
        episodes_total=payload.episodesTotal,
        episodes_watched=payload.episodesWatched,
    )


def _now_ms() -> int:
    return int(time.time() * 1000)


def _apply_update(row: WatchEntry, patch: EntryUpdate) -> WatchEntry:
    data = patch.model_dump(exclude_unset=True)
    if "externalId" in data:
        row.external_id = data["externalId"]
    if "type" in data and data["type"] is not None:
        row.type = data["type"]
    if "title" in data and data["title"] is not None:
        row.title = data["title"].strip()
    if "year" in data:
        row.year = data["year"]
    if "posterUrl" in data:
        row.poster_url = data["posterUrl"]
    if "synopsis" in data:
        row.synopsis = data["synopsis"]
    if "genres" in data and data["genres"] is not None:
        row.genres_json = json.dumps(data["genres"])
    if "rating" in data:
        row.rating = data["rating"]
    if "liked" in data and data["liked"] is not None:
        row.liked = data["liked"]
    if "status" in data and data["status"] is not None:
        row.status = data["status"]
    if "notes" in data:
        row.notes = data["notes"]
    if "episodesTotal" in data:
        row.episodes_total = data["episodesTotal"]
    if "episodesWatched" in data and data["episodesWatched"] is not None:
        row.episodes_watched = data["episodesWatched"]
    row.updated_at = _now_ms()
    return row


def _sort_clause(sort: SortKey):
    if sort == SortKey.title:
        return WatchEntry.title.asc()
    if sort == SortKey.rating:
        return WatchEntry.rating.desc().nullslast()
    if sort == SortKey.year:
        return WatchEntry.year.desc().nullslast()
    return WatchEntry.updated_at.desc()


@app.get(
    "/entries",
    response_model=EntryPage,
    tags=["entries"],
    summary="List entries (paginated, filterable, sortable)",
)
def list_entries(
    response: Response,
    skip: int = Query(0, ge=0, description="How many items to skip"),
    limit: int = Query(20, ge=1, le=200, description="Page size (1-200)"),
    type: Optional[MediaType] = Query(None, description="Filter by media type"),
    status_: Optional[WatchStatus] = Query(None, alias="status", description="Filter by watch status"),
    liked: Optional[bool] = Query(None, description="Only liked entries when true"),
    query: Optional[str] = Query(None, description="Case-insensitive title substring"),
    sort: SortKey = Query(SortKey.updated, description="Sort order"),
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> EntryPage:
    stmt = select(WatchEntry)
    count_stmt = select(func.count(WatchEntry.id))

    if type is not None:
        stmt = stmt.where(WatchEntry.type == type)
        count_stmt = count_stmt.where(WatchEntry.type == type)
    if status_ is not None:
        stmt = stmt.where(WatchEntry.status == status_)
        count_stmt = count_stmt.where(WatchEntry.status == status_)
    if liked is not None:
        stmt = stmt.where(WatchEntry.liked == liked)
        count_stmt = count_stmt.where(WatchEntry.liked == liked)
    if query and query.strip():
        like = f"%{query.strip()}%"
        stmt = stmt.where(WatchEntry.title.ilike(like))
        count_stmt = count_stmt.where(WatchEntry.title.ilike(like))

    total = session.exec(count_stmt).one()
    stmt = stmt.order_by(_sort_clause(sort)).offset(skip).limit(limit)
    rows = session.exec(stmt).all()

    response.headers["X-Total-Count"] = str(total)
    return EntryPage(
        items=[EntryRead.from_db(r) for r in rows],
        total=int(total),
        skip=skip,
        limit=limit,
    )


@app.get(
    "/entries/random",
    response_model=EntryRead,
    tags=["entries"],
    summary="Pick a random entry (great for 'what should I watch?')",
    responses={404: {"description": "No entries match the filters"}},
)
def random_entry(
    type: Optional[MediaType] = Query(None, description="Restrict to a media type"),
    status_: Optional[WatchStatus] = Query(None, alias="status"),
    liked: Optional[bool] = Query(None),
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> EntryRead:
    stmt = select(WatchEntry)
    if type is not None:
        stmt = stmt.where(WatchEntry.type == type)
    if status_ is not None:
        stmt = stmt.where(WatchEntry.status == status_)
    if liked is not None:
        stmt = stmt.where(WatchEntry.liked == liked)
    stmt = stmt.order_by(func.random()).limit(1)
    row = session.exec(stmt).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No entries match")
    return EntryRead.from_db(row)


@app.get(
    "/entries/top",
    response_model=list[EntryRead],
    tags=["entries"],
    summary="Top-rated entries",
)
def top_entries(
    limit: int = Query(10, ge=1, le=100),
    type: Optional[MediaType] = Query(None),
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> list[EntryRead]:
    stmt = select(WatchEntry).where(WatchEntry.rating.is_not(None))
    if type is not None:
        stmt = stmt.where(WatchEntry.type == type)
    stmt = stmt.order_by(WatchEntry.rating.desc()).limit(limit)
    rows = session.exec(stmt).all()
    return [EntryRead.from_db(r) for r in rows]


@app.get(
    "/entries/recent",
    response_model=list[EntryRead],
    tags=["entries"],
    summary="Most recently updated entries",
)
def recent_entries(
    limit: int = Query(10, ge=1, le=100),
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> list[EntryRead]:
    stmt = select(WatchEntry).order_by(WatchEntry.updated_at.desc()).limit(limit)
    rows = session.exec(stmt).all()
    return [EntryRead.from_db(r) for r in rows]


@app.get(
    "/entries/{entry_id}",
    response_model=EntryRead,
    tags=["entries"],
    summary="Fetch a single entry by ID",
    responses={404: {"description": "Entry not found"}},
)
def get_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> EntryRead:
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    return EntryRead.from_db(row)


@app.post(
    "/entries",
    response_model=EntryRead,
    status_code=status.HTTP_201_CREATED,
    tags=["entries"],
    summary="Create a new entry",
    responses={409: {"description": "Entry with same externalId already exists"}},
)
def create_entry(
    payload: EntryCreate,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> EntryRead:
    if payload.externalId:
        existing = session.exec(
            select(WatchEntry).where(WatchEntry.external_id == payload.externalId)
        ).first()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Entry with externalId={payload.externalId} already exists (id={existing.id})",
            )
    row = _row_from_create(payload)
    session.add(row)
    session.commit()
    session.refresh(row)
    return EntryRead.from_db(row)


@app.patch(
    "/entries/{entry_id}",
    response_model=EntryRead,
    tags=["entries"],
    summary="Partially update an entry",
    responses={404: {"description": "Entry not found"}},
)
def update_entry(
    entry_id: int,
    patch: EntryUpdate,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> EntryRead:
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    _apply_update(row, patch)
    session.add(row)
    session.commit()
    session.refresh(row)
    return EntryRead.from_db(row)


@app.put(
    "/entries/{entry_id}",
    response_model=EntryRead,
    tags=["entries"],
    summary="Replace an entry (full update)",
    responses={404: {"description": "Entry not found"}},
)
def replace_entry(
    entry_id: int,
    payload: EntryCreate,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> EntryRead:
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    row.external_id = payload.externalId
    row.type = payload.type
    row.title = payload.title.strip()
    row.year = payload.year
    row.poster_url = payload.posterUrl
    row.synopsis = payload.synopsis
    row.genres_json = json.dumps(payload.genres)
    row.rating = payload.rating
    row.liked = payload.liked
    row.status = payload.status
    row.notes = payload.notes
    row.episodes_total = payload.episodesTotal
    row.episodes_watched = payload.episodesWatched
    row.updated_at = int(time.time() * 1000)
    session.add(row)
    session.commit()
    session.refresh(row)
    return EntryRead.from_db(row)


@app.delete(
    "/entries/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["entries"],
    summary="Delete an entry",
    responses={404: {"description": "Entry not found"}},
)
def delete_entry(
    entry_id: int,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.DELETE)),
) -> Response:
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    session.delete(row)
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.post(
    "/entries/bulk",
    response_model=BulkImportResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["entries"],
    summary="Bulk import a list of entries",
)
def bulk_import(
    payload: BulkImportRequest,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> BulkImportResponse:
    rows = [_row_from_create(p) for p in payload.entries]
    session.add_all(rows)
    session.commit()
    return BulkImportResponse(inserted=len(rows))


@app.post(
    "/entries/bulk-delete",
    response_model=BulkDeleteResponse,
    tags=["entries"],
    summary="Delete several entries by ID",
)
def bulk_delete(
    payload: BulkDeleteRequest,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.DELETE)),
) -> BulkDeleteResponse:
    rows = session.exec(select(WatchEntry).where(WatchEntry.id.in_(payload.ids))).all()
    for r in rows:
        session.delete(r)
    session.commit()
    return BulkDeleteResponse(deleted=len(rows))


@app.post(
    "/entries/{entry_id}/like",
    response_model=EntryRead,
    tags=["entries"],
    summary="Toggle the 'liked' flag",
    responses={404: {"description": "Entry not found"}},
)
def toggle_like(
    entry_id: int,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> EntryRead:
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    row.liked = not row.liked
    row.updated_at = int(time.time() * 1000)
    session.add(row)
    session.commit()
    session.refresh(row)
    return EntryRead.from_db(row)


@app.patch(
    "/entries/{entry_id}/status",
    response_model=EntryRead,
    tags=["entries"],
    summary="Update only the watch status",
    responses={404: {"description": "Entry not found"}},
)
def update_status(
    entry_id: int,
    payload: StatusUpdateRequest,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> EntryRead:
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    row.status = payload.status
    row.updated_at = int(time.time() * 1000)
    session.add(row)
    session.commit()
    session.refresh(row)
    return EntryRead.from_db(row)


@app.patch(
    "/entries/{entry_id}/rating",
    response_model=EntryRead,
    tags=["entries"],
    summary="Update only the rating (null clears it)",
    responses={404: {"description": "Entry not found"}},
)
def update_rating(
    entry_id: int,
    payload: RatingUpdateRequest,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> EntryRead:
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    row.rating = payload.rating
    row.updated_at = int(time.time() * 1000)
    session.add(row)
    session.commit()
    session.refresh(row)
    return EntryRead.from_db(row)


@app.post(
    "/entries/{entry_id}/episodes",
    response_model=EntryRead,
    tags=["entries"],
    summary="Set or increment 'episodes watched' (provide `delta` or `value`)",
    responses={
        400: {"description": "Must provide exactly one of `delta` or `value`"},
        404: {"description": "Entry not found"},
    },
)
def update_episodes(
    entry_id: int,
    payload: EpisodesUpdateRequest,
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.WRITE)),
) -> EntryRead:
    if (payload.delta is None) == (payload.value is None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide exactly one of 'delta' or 'value'",
        )
    row = session.get(WatchEntry, entry_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Entry not found")
    current = row.episodes_watched or 0
    if payload.value is not None:
        new_val = payload.value
    else:
        new_val = max(0, current + int(payload.delta or 0))
    if row.episodes_total is not None:
        new_val = min(new_val, row.episodes_total)
    row.episodes_watched = new_val
    row.updated_at = int(time.time() * 1000)
    session.add(row)
    session.commit()
    session.refresh(row)
    return EntryRead.from_db(row)


@app.delete(
    "/entries",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["entries"],
    summary="Delete ALL entries (admin only)",
)
def delete_all_entries(
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.DELETE)),
) -> Response:
    session.exec(WatchEntry.__table__.delete())  # type: ignore[attr-defined]
    session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@app.get("/genres", tags=["entries"], summary="List distinct genres seen in the DB")
def list_genres(
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> list[str]:
    rows = session.exec(select(WatchEntry.genres_json)).all()
    out: set[str] = set()
    for raw in rows:
        try:
            for g in json.loads(raw or "[]"):
                if isinstance(g, str) and g.strip():
                    out.add(g.strip())
        except json.JSONDecodeError:
            continue
    return sorted(out)


@app.get(
    "/genres/counts",
    response_model=list[GenreCount],
    tags=["entries"],
    summary="Each distinct genre with how many entries use it",
)
def genre_counts(
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> list[GenreCount]:
    rows = session.exec(select(WatchEntry.genres_json)).all()
    counts: dict[str, int] = {}
    for raw in rows:
        try:
            for g in json.loads(raw or "[]"):
                if isinstance(g, str) and g.strip():
                    name = g.strip()
                    counts[name] = counts.get(name, 0) + 1
        except json.JSONDecodeError:
            continue
    out = [GenreCount(name=k, count=v) for k, v in counts.items()]
    out.sort(key=lambda gc: (-gc.count, gc.name))
    return out


@app.get(
    "/stats",
    response_model=StatsResponse,
    tags=["entries"],
    summary="Aggregated stats (counts by type/status, likes, avg rating)",
)
def stats(
    session: Session = Depends(get_session),
    _: TokenPayload = Depends(require_permissions(Permission.READ)),
) -> StatsResponse:
    total = int(session.exec(select(func.count(WatchEntry.id))).one())

    by_type: dict[str, int] = {t.value: 0 for t in MediaType}
    type_rows = session.exec(
        select(WatchEntry.type, func.count(WatchEntry.id)).group_by(WatchEntry.type)
    ).all()
    for t, c in type_rows:
        by_type[t.value if hasattr(t, "value") else str(t)] = int(c)

    by_status: dict[str, int] = {s.value: 0 for s in WatchStatus}
    status_rows = session.exec(
        select(WatchEntry.status, func.count(WatchEntry.id)).group_by(WatchEntry.status)
    ).all()
    for s, c in status_rows:
        by_status[s.value if hasattr(s, "value") else str(s)] = int(c)

    liked = int(
        session.exec(
            select(func.count(WatchEntry.id)).where(WatchEntry.liked == True)  # noqa: E712
        ).one()
    )

    avg_row = session.exec(
        select(func.avg(WatchEntry.rating), func.count(WatchEntry.rating))
    ).one()
    avg_rating = float(avg_row[0]) if avg_row[0] is not None else None
    rated_count = int(avg_row[1] or 0)

    return StatsResponse(
        total=total,
        by_type=by_type,
        by_status=by_status,
        liked=liked,
        average_rating=avg_rating,
        rated_count=rated_count,
    )
