from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from datetime import datetime
import logging
import csv
from io import StringIO

from queries.chats import get_chats

router = APIRouter(tags=["Export"], prefix="/export")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--EXPORT--")

@router.get("/chats-csv")
async def export_chats_to_csv():
    try:
        # Get all chats from database
        chats = await get_chats(limit=1000)
        
        if not chats:
            raise HTTPException(status_code=404, detail="No chats found to export")
        
        # Create CSV in memory
        output = StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['ID', 'User Message', 'Bot Reply', 'Audio Path', 'Created At'])
        
        # Write data
        for chat in chats:
            writer.writerow([
                chat['id'],
                chat['user_text'],
                chat['bot_reply'],
                chat['audio_path'] or '',
                chat['created_at'].strftime('%Y-%m-%d %H:%M:%S') if chat['created_at'] else ''
            ])
        
        # Prepare response
        csv_content = output.getvalue()
        output.close()
        
        # Create filename with timestamp
        filename = f"chatgpt_conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"CSV export error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate CSV: {str(e)}")