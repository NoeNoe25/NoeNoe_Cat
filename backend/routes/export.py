from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from datetime import datetime
import logging

from queries.chats import get_chats
from utils.export import generate_csv, generate_pdf

router = APIRouter(tags=["Export"], prefix="/export")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--EXPORT--")


@router.get("/chats-csv")
async def export_chats_to_csv():
    """Download chat logs as CSV."""
    try:
        chats = await get_chats(limit=1000)
        if not chats:
            raise HTTPException(status_code=404, detail="No chats found to export")

        csv_content = generate_csv(chats)
        filename = (
            f"chatgpt_conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        )

        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("CSV export error")
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")


@router.get("/chats-pdf")
async def export_chats_to_pdf():
    """Download chat logs as PDF."""
    try:
        chats = await get_chats(limit=1000)
        if not chats:
            raise HTTPException(status_code=404, detail="No chats found to export")

        pdf_bytes = generate_pdf(chats)
        filename = (
            f"chatgpt_conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        )

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"},
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("PDF export error")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")
