"""Seed the database with a handful of demo entries.

Run: `python seed.py`
"""

from __future__ import annotations

import json
import time

from sqlmodel import Session, select

from app.database import engine, init_db
from app.models import MediaType, WatchEntry, WatchStatus


SEED = [
    {
        "external_id": "mal-1",
        "type": MediaType.anime,
        "title": "Cowboy Bebop",
        "year": 1998,
        "poster_url": "https://cdn.myanimelist.net/images/anime/4/19644.jpg",
        "synopsis": "Bounty hunters in space.",
        "genres": ["Action", "Sci-Fi"],
        "rating": 9.0,
        "liked": True,
        "status": WatchStatus.completed,
        "episodes_total": 26,
        "episodes_watched": 26,
    },
    {
        "external_id": "tt0903747",
        "type": MediaType.series,
        "title": "Breaking Bad",
        "year": 2008,
        "poster_url": "https://m.media-amazon.com/images/M/MV5BMzU5ZGYzNmQtMTdhYy00OGRiLTg0NmQtYjVjNzliZTg1ZGE4XkEyXkFqcGdeQXVyMTM3MTQzMDIz._V1_SX300.jpg",
        "synopsis": "Chemistry teacher cooks meth.",
        "genres": ["Crime", "Drama", "Thriller"],
        "rating": 9.5,
        "liked": True,
        "status": WatchStatus.completed,
        "episodes_total": 62,
        "episodes_watched": 62,
    },
    {
        "external_id": "tt1375666",
        "type": MediaType.movie,
        "title": "Inception",
        "year": 2010,
        "poster_url": "https://m.media-amazon.com/images/M/MV5BMjAxMzY3NjcxNF5BMl5BanBnXkFtZTcwNTI5OTM0Mw@@._V1_SX300.jpg",
        "synopsis": "Dreams within dreams.",
        "genres": ["Action", "Sci-Fi", "Thriller"],
        "rating": 8.8,
        "liked": False,
        "status": WatchStatus.completed,
    },
    {
        "external_id": "mal-9253",
        "type": MediaType.anime,
        "title": "Steins;Gate",
        "year": 2011,
        "poster_url": "https://cdn.myanimelist.net/images/anime/5/73199.jpg",
        "genres": ["Sci-Fi", "Thriller"],
        "rating": 9.1,
        "liked": True,
        "status": WatchStatus.watching,
        "episodes_total": 24,
        "episodes_watched": 12,
    },
    {
        "external_id": "tt4574334",
        "type": MediaType.series,
        "title": "Stranger Things",
        "year": 2016,
        "genres": ["Drama", "Sci-Fi", "Horror"],
        "rating": 8.7,
        "liked": False,
        "status": WatchStatus.plan_to_watch,
    },
]


def main() -> None:
    init_db()
    now = int(time.time() * 1000)
    with Session(engine) as session:
        for item in SEED:
            ext = item["external_id"]
            exists = session.exec(
                select(WatchEntry).where(WatchEntry.external_id == ext)
            ).first()
            if exists:
                continue
            row = WatchEntry(
                external_id=item["external_id"],
                type=item["type"],
                title=item["title"],
                year=item.get("year"),
                poster_url=item.get("poster_url"),
                synopsis=item.get("synopsis"),
                genres_json=json.dumps(item.get("genres", [])),
                rating=item.get("rating"),
                liked=item.get("liked", False),
                status=item["status"],
                episodes_total=item.get("episodes_total"),
                episodes_watched=item.get("episodes_watched", 0),
                created_at=now,
                updated_at=now,
            )
            session.add(row)
        session.commit()
    print("Seeded.")


if __name__ == "__main__":
    main()
