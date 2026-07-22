import logging
import redis
from app.core.config import settings
from typing import Any

logger = logging.getLogger("app")

try:
    redis_client = redis.from_url(settings.REDIS_URL, decode_responses=True)
    # Ping Redis to verify connection immediately
    redis_client.ping()
except Exception as e:
    logger.warning(f"Could not connect to Redis at {settings.REDIS_URL}: {e}. Caching is disabled.")
    redis_client = None

def get_cache(key: str) -> str | None:
    """Retrieves a value from Redis cache. Returns None on cache miss or error."""
    if redis_client is None:
        return None
    try:
        return redis_client.get(key)
    except Exception as e:
        logger.error(f"Redis get error for key '{key}': {e}")
        return None

def set_cache(key: str, value: str, expire: int = 300) -> bool:
    """Stores a string value in Redis cache with an expiration time in seconds."""
    if redis_client is None:
        return False
    try:
        redis_client.set(key, value, ex=expire)
        return True
    except Exception as e:
        logger.error(f"Redis set error for key '{key}': {e}")
        return False

def delete_cache(key: str) -> bool:
    """Deletes a key from Redis cache."""
    if redis_client is None:
        return False
    try:
        redis_client.delete(key)
        return True
    except Exception as e:
        logger.error(f"Redis delete error for key '{key}': {e}")
        return False

def clear_cache_pattern(pattern: str) -> bool:
    """Deletes all keys matching a specific pattern (glob style)."""
    if redis_client is None:
        return False
    try:
        keys = redis_client.keys(pattern)
        if keys:
            redis_client.delete(*keys)
        return True
    except Exception as e:
        logger.error(f"Redis clear pattern error for '{pattern}': {e}")
        return False
