import csv
from io import StringIO, BytesIO
from datetime import datetime

from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib import colors


def generate_csv(chats: list) -> str:
    """Generate CSV content from chat data."""
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "User Message", "Bot Reply", "Audio Path", "Created At"])

    for chat in chats:
        writer.writerow(
            [
                chat["id"],
                chat["user_text"],
                chat["bot_reply"],
                chat["audio_path"] or "",
                (
                    chat["created_at"].strftime("%Y-%m-%d %H:%M:%S")
                    if chat["created_at"]
                    else ""
                ),
            ]
        )

    csv_data = output.getvalue()
    output.close()
    return csv_data


def generate_pdf(chats: list) -> bytes:
    """Generate PDF content from chat data."""
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []

    styles = getSampleStyleSheet()
    elements.append(Paragraph("ChatGPT Conversations Export", styles["Title"]))
    elements.append(
        Paragraph(
            f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
            styles["Normal"],
        )
    )
    elements.append(Paragraph("<br/>", styles["Normal"]))  # spacing

    table_data = [["ID", "User Message", "Bot Reply", "Audio Path", "Created At"]]

    for chat in chats:
        user_text = (
            (chat["user_text"][:100] + "...")
            if len(chat["user_text"]) > 100
            else chat["user_text"]
        )
        bot_reply = (
            (chat["bot_reply"][:100] + "...")
            if len(chat["bot_reply"]) > 100
            else chat["bot_reply"]
        )
        audio_path = chat["audio_path"] or "No audio"
        created_at = (
            chat["created_at"].strftime("%Y-%m-%d %H:%M")
            if chat["created_at"]
            else "N/A"
        )

        table_data.append(
            [str(chat["id"]), user_text, bot_reply, audio_path, created_at]
        )

    table = Table(table_data)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.grey),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 12),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
                ("BACKGROUND", (0, 1), (-1, -1), colors.beige),
                ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
                ("FONTSIZE", (0, 1), (-1, -1), 10),
                ("GRID", (0, 0), (-1, -1), 1, colors.black),
            ]
        )
    )

    elements.append(table)
    doc.build(elements)

    buffer.seek(0)
    pdf_data = buffer.getvalue()
    buffer.close()
    return pdf_data
