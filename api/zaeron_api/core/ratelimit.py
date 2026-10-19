"""Rate limiting em memória resiliente e configurável para proteção contra força bruta."""

import time
from collections import defaultdict
from threading import Lock
from typing import Callable

from fastapi import Request

from api.zaeron_api.core.config import get_settings
from api.zaeron_api.core.errors import APIError


class InMemoryRateLimiter:
    def __init__(self):
        self._history: dict[str, list[float]] = defaultdict(list)
        self._lock = Lock()

    def is_allowed(self, key: str, max_requests: int, window_seconds: int) -> tuple[bool, int]:
        now = time.time()
        cutoff = now - window_seconds
        with self._lock:
            valid_timestamps = [ts for ts in self._history[key] if ts > cutoff]
            if len(valid_timestamps) >= max_requests:
                retry_after = int(window_seconds - (now - valid_timestamps[0]))
                self._history[key] = valid_timestamps
                return False, max(1, retry_after)

            valid_timestamps.append(now)
            self._history[key] = valid_timestamps
            return True, 0

    def reset(self):
        with self._lock:
            self._history.clear()


_limiter = InMemoryRateLimiter()


def rate_limit(max_requests: int = 60, window_seconds: int = 60) -> Callable:
    """Dependency do FastAPI para rate limiting por IP de cliente."""

    async def _rate_limit_dependency(request: Request) -> None:
        settings = get_settings()
        if not settings.rate_limit_enabled or settings.environment == "test":
            return

        forwarded = request.headers.get("x-real-ip") or request.headers.get("x-forwarded-for")
        client_ip = (
            forwarded.split(",")[0].strip()
            if forwarded
            else (request.client.host if request.client else "unknown")
        )
        route_key = f"{request.url.path}:{client_ip}"

        allowed, retry_after = _limiter.is_allowed(route_key, max_requests, window_seconds)
        if not allowed:
            raise APIError(
                429,
                f"Limite de requisições excedido. Tente novamente em {retry_after} segundos.",
                "rate_limit_exceeded",
            )

    return _rate_limit_dependency
