import motor.motor_asyncio
from .config import get_settings

_client = None
_db = None

def get_db():
    global _client, _db
    if _db is None:
        cfg = get_settings()
        _client = motor.motor_asyncio.AsyncIOMotorClient(cfg.MONGO_URI)
        _db = _client[cfg.MONGO_DB_NAME]
    return _db

async def close_client():
    global _client, _db
    if _client:
        _client.close()
        _client = None
        _db = None
