from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging

from queries.chats import *

router = APIRouter(tags=["Chats"], prefix="/chats")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--CHATS ROUTE--")


@router.get("")
async def read_chats(limit: int = Query(50, ge=1, le=1000)):
    try:
        chats = await get_chats(limit)
        return {"count": len(chats), "data": chats}
    except Exception as e:
        # Simple logging & clean response
        logger.error(f"Error fetching chats: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chats")