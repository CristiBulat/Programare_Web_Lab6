from __future__ import annotations

import json
import time
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field as PydField, field_validator
from sqlmodel import Field, SQLModel


class MediaType(str, Enum):
    anime = "anime"
    movie = "movie"
    series = "series"


class WatchStatus(str, Enum):
    watching = "watching"
    completed = "completed"
    plan_to_watch = "plan_to_watch"
    on_hold = "on_hold"
    dropped = "dropped"


class SortKey(str, Enum):
    updated = "updated"
    title = "title"
    rating = "rating"
    year = "year"


def _now_ms() -> int:
    return int(time.time() * 1000)


class WatchEntry(SQLModel, table=True):
    __tablename__ = "entries"

    id: Optional[int] = Field(default=None, primary_key=True)
    external_id: Optional[str] = Field(default=None, index=True)
    type: MediaType = Field(index=True)
    title: str = Field(index=True)
    year: Optional[int] = None
    poster_url: Optional[str] = None
    synopsis: Optional[str] = None
    genres_json: str = Field(default="[]")
    rating: Optional[float] = None
    liked: bool = Field(default=False, index=True)
    status: WatchStatus = Field(default=WatchStatus.plan_to_watch, index=True)
    notes: Optional[str] = None
    episodes_total: Optional[int] = None
    episodes_watched: int = Field(default=0)
    created_at: int = Field(default_factory=_now_ms, index=True)
    updated_at: int = Field(default_factory=_now_ms, index=True)

    def genres_list(self) -> list[str]:
        try:
            data = json.loads(self.genres_json or "[]")
            return [str(g) for g in data] if isinstance(data, list) else []
        except json.JSONDecodeError:
            return []


class EntryRead(BaseModel):
    id: int
    externalId: Optional[str] = None
    type: MediaType
    title: str
    year: Optional[int] = None
    posterUrl: Optional[str] = None
    synopsis: Optional[str] = None
    genres: list[str] = []
    rating: Optional[float] = None
    liked: bool
    status: WatchStatus
    notes: Optional[str] = None
    episodesTotal: Optional[int] = None
    episodesWatched: int = 0
    createdAt: int
    updatedAt: int

    @classmethod
    def from_db(cls, row: WatchEntry) -> "EntryRead":
        assert row.id is not None
        return cls(
            id=row.id,
            externalId=row.external_id,
            type=row.type,
            title=row.title,
            year=row.year,
            posterUrl=row.poster_url,
            synopsis=row.synopsis,
            genres=row.genres_list(),
            rating=row.rating,
            liked=row.liked,
            status=row.status,
            notes=row.notes,
            episodesTotal=row.episodes_total,
            episodesWatched=row.episodes_watched,
            createdAt=row.created_at,
            updatedAt=row.updated_at,
        )


class EntryCreate(BaseModel):
    externalId: Optional[str] = None
    type: MediaType
    title: str = PydField(min_length=1, max_length=300)
    year: Optional[int] = PydField(default=None, ge=1800, le=2100)
    posterUrl: Optional[str] = None
    synopsis: Optional[str] = None
    genres: list[str] = []
    rating: Optional[float] = PydField(default=None, ge=0, le=10)
    liked: bool = False
    status: WatchStatus = WatchStatus.plan_to_watch
    notes: Optional[str] = None
    episodesTotal: Optional[int] = PydField(default=None, ge=0)
    episodesWatched: int = PydField(default=0, ge=0)

    @field_validator("genres", mode="before")
    @classmethod
    def _coerce_genres(cls, v):  # noqa: ANN001
        if v is None:
            return []
        if isinstance(v, list):
            return [str(g).strip() for g in v if str(g).strip()]
        return []


class EntryUpdate(BaseModel):
    externalId: Optional[str] = None
    type: Optional[MediaType] = None
    title: Optional[str] = PydField(default=None, min_length=1, max_length=300)
    year: Optional[int] = PydField(default=None, ge=1800, le=2100)
    posterUrl: Optional[str] = None
    synopsis: Optional[str] = None
    genres: Optional[list[str]] = None
    rating: Optional[float] = PydField(default=None, ge=0, le=10)
    liked: Optional[bool] = None
    status: Optional[WatchStatus] = None
    notes: Optional[str] = None
    episodesTotal: Optional[int] = PydField(default=None, ge=0)
    episodesWatched: Optional[int] = PydField(default=None, ge=0)


class EntryPage(BaseModel):
    items: list[EntryRead]
    total: int
    skip: int
    limit: int


class BulkImportRequest(BaseModel):
    entries: list[EntryCreate]


class BulkImportResponse(BaseModel):
    inserted: int


class BulkDeleteRequest(BaseModel):
    ids: list[int] = PydField(min_length=1)


class BulkDeleteResponse(BaseModel):
    deleted: int


class EpisodesUpdateRequest(BaseModel):
    delta: Optional[int] = None
    value: Optional[int] = PydField(default=None, ge=0)


class StatusUpdateRequest(BaseModel):
    status: WatchStatus


class RatingUpdateRequest(BaseModel):
    rating: Optional[float] = PydField(default=None, ge=0, le=10)


class StatsResponse(BaseModel):
    total: int
    by_type: dict[str, int]
    by_status: dict[str, int]
    liked: int
    average_rating: Optional[float] = None
    rated_count: int


class GenreCount(BaseModel):
    name: str
    count: int
