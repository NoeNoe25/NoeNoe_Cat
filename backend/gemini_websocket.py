import asyncio
import websockets
import google.generativeai as genai
import os
import logging
from gtts import gTTS
import io
import base64
import re
from queries.chats import insert_chat

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--GEMINI--")

API_KEY = os.getenv("GEMINI_API_KEY")
genai.configure(api_key=API_KEY)

system_instruction = (
    "You are a student (a kid) practicing English with your teacher. "
    "You will receive sentences from your teacher. "
    "Your role is to behave like a curious kid, respond naturally, "
    "and keep a childlike tone. Use short and clear sentences."
)

MODEL_NAME = "gemini-2.5-flash-lite"
model = genai.GenerativeModel(MODEL_NAME, system_instruction=system_instruction)


# --- Helper: Clean text for TTS ---
def clean_text(text):
    return re.sub(r"[^\w\s.,?!]", "", text).strip()


# --- Helper: Process Gemini response ---
async def process_gemini_response(websocket, message):
    full_reply = ""
    sentence_buffer = ""
    tts_tasks = []

    response = model.generate_content(message, stream=True)

    for chunk in response:
        if chunk.text:
            await websocket.send(chunk.text)
            full_reply += chunk.text + " "
            sentence_buffer += chunk.text

            # Find all full sentences ending with . or ?
            sentences = re.findall(r"[^.?\n]*[.?]", sentence_buffer)
            if sentences:
                consumed = sum(len(s) for s in sentences)
                for s in sentences:
                    s_clean = clean_text(s.strip())
                    if s_clean:
                        tts_tasks.append(
                            asyncio.create_task(send_tts(websocket, s_clean))
                        )
                sentence_buffer = sentence_buffer[consumed:]

    # Flush any remaining text (if it ends without . or ?)
    if sentence_buffer.strip():
        s_clean = clean_text(sentence_buffer.strip())
        if s_clean:
            tts_tasks.append(asyncio.create_task(send_tts(websocket, s_clean)))

    return full_reply, tts_tasks


# --- Helper: Send TTS ---
async def send_tts(websocket, text):
    try:
        audio_fp = io.BytesIO()
        tts = gTTS(text=text, lang="en", slow=False)
        tts.write_to_fp(audio_fp)
        audio_bytes = audio_fp.getvalue()
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
        await websocket.send(f"AUDIO::{audio_b64}")
    except Exception as e:
        logger.warning(f"TTS error: {e}")


# --- Helper: Save chat to database ---
async def save_chat_to_db(user_input, gemini_reply):
    try:
        await insert_chat(
            user_input=user_input, gemini_reply=gemini_reply.strip(), audio_path=None
        )
        logger.info(f"💾 Saved chat: {user_input[:30]}")
    except Exception as e:
        logger.warning(f"❌ DB save error: {e}")


# --- WebSocket Handler ---
async def handle_client(websocket):
    try:
        async for message in websocket:
            try:
                # Process Gemini response and generate TTS tasks
                full_reply, tts_tasks = await process_gemini_response(
                    websocket, message
                )

                # Wait for all TTS tasks to finish
                if tts_tasks:
                    await asyncio.gather(*tts_tasks)

                # Send end marker to client
                await websocket.send("[[END]]")

                # Save chat to the database
                await save_chat_to_db(message, full_reply)

            except Exception as e:
                logger.warning(f"❌ Processing error: {e}")
                await websocket.send(f"Error: {str(e)}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")


# --- Start WebSocket Server ---
async def start_gemini_websocket():
    server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    logger.info("✅ Gemini WebSocket server started on ws://localhost:8765")
    return server


if __name__ == "__main__":

    async def main():
        await start_gemini_websocket()
        await asyncio.Future()  # Run forever

    asyncio.run(main())
