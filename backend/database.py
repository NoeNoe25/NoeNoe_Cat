from typing import Any, Optional, List
from databases import Database
import logging
import os

# -------------------
# Database connection
# -------------------
POSTGRES_USER = os.getenv("POSTGRES_USER", "username")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "catgpt")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "postgresql")  # `postgresql` service name in Docker Compose
POSTGRES_PORT = int(os.getenv("POSTGRES_PORT", "5432"))

DATABASE_URL = f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

database = Database(DATABASE_URL)
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--DATABASE--")


async def connect_db() -> None:
    await database.connect()
    logger.info("Database connected")


async def disconnect_db() -> None:
    await database.disconnect()
    logger.info("Database disconnected")


# -------------------
# Table creation
# -------------------
async def init_db() -> None:
    await _create_chats_table()
    logger.info("Database initialized successfully.")


async def _create_chats_table() -> None:
    query = """
    CREATE TABLE IF NOT EXISTS chats (
    id SERIAL PRIMARY KEY,
    user_text TEXT NOT NULL,
    bot_reply TEXT NOT NULL,
    audio_path TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
    """
    await database.execute(query=query)
    logger.info("Chats table created (or already exists).")