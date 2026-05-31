import json
import redis as redis_lib
from typing import Any, Optional
from app.config import settings

_client: Optional[redis_lib.Redis] = None


def _get_client() -> redis_lib.Redis:
    global _client
    if _client is None:
        _client = redis_lib.Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _client


def cache_get(key: str) -> Optional[Any]:
    try:
        raw = _get_client().get(key)
        return json.loads(raw) if raw else None
    except Exception:
        return None


def cache_set(key: str, value: Any, ttl: int = None) -> None:
    try:
        _get_client().setex(key, ttl or settings.CACHE_TTL, json.dumps(value, default=str))
    except Exception:
        pass


def cache_delete(key: str) -> None:
    try:
        _get_client().delete(key)
    except Exception:
        pass
