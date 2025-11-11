from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from datetime import datetime
import logging
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors
from io import BytesIO

from queries.chats import get_chats

router = APIRouter(tags=["PDF Export"], prefix="/pdf")
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--PDF EXPORT--")

@router.get("/export-chats")
async def export_chats_to_pdf():
    try:
        # Get all chats from database
        chats = await get_chats(limit=1000)  # Increase limit to get more chats
        
        if not chats:
            raise HTTPException(status_code=404, detail="No chats found to export")
        
        # Create PDF in memory
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        elements = []
        
        # Title
        styles = getSampleStyleSheet()
        title = Paragraph("ChatGPT Conversations Export", styles['Title'])
        elements.append(title)
        
        # Timestamp
        timestamp = Paragraph(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal'])
        elements.append(timestamp)
        
        elements.append(Paragraph("<br/>", styles['Normal']))  # Add some space
        
        # Prepare table data
        table_data = [['ID', 'User Message', 'Bot Reply', 'Audio Path', 'Created At']]
        
        for chat in chats:
            # Truncate long text for better PDF formatting
            user_text = chat['user_text'][:100] + "..." if len(chat['user_text']) > 100 else chat['user_text']
            bot_reply = chat['bot_reply'][:100] + "..." if len(chat['bot_reply']) > 100 else chat['bot_reply']
            audio_path = chat['audio_path'] or "No audio"
            created_at = chat['created_at'].strftime('%Y-%m-%d %H:%M') if chat['created_at'] else "N/A"
            
            table_data.append([
                str(chat['id']),
                user_text,
                bot_reply,
                audio_path,
                created_at
            ])
        
        # Create table
        table = Table(table_data)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        
        elements.append(table)
        
        # Build PDF
        doc.build(elements)
        
        # Prepare response
        buffer.seek(0)
        pdf_bytes = buffer.getvalue()
        buffer.close()
        
        # Create filename with timestamp
        filename = f"chatgpt_conversations_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"PDF export error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate PDF: {str(e)}")