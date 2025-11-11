import asyncio
import websockets
import google.generativeai as genai
import os
from gtts import gTTS
import io
import base64
import uuid
from datetime import datetime

# --- Fix the import based on your file structure ---
# Option A: If you have queries/chats.py
from queries.chats import insert_chat

# OR Option B: If you have routes/chats.py with the insert_chat function
# from routes.chats import insert_chat

# OR Option C: Import directly from the module that has the function
# Based on your file structure, it seems the function is in queries/chats.py

# --- Gemini Setup ---
API_KEY = os.getenv("GEMINI_API_KEY") or "YOUR_API_KEY_HERE"
genai.configure(api_key=API_KEY)

system_instruction = (
    "You are a student (a kid) practicing English with your teacher. "
    "You will receive sentences from your teacher. "
    "Your role is to behave like a curious kid, respond naturally, and keep a childlike tone."
)

MODEL_NAME = "gemini-2.5-flash-lite"
model = genai.GenerativeModel(MODEL_NAME, system_instruction=system_instruction)


# --- Audio Queue Worker ---
async def audio_worker(websocket, queue: asyncio.Queue):
    while True:
        chunk_text, audio_filename = await queue.get()
        try:
            audio_fp = io.BytesIO()
            tts = gTTS(text=chunk_text, lang="en")
            tts.write_to_fp(audio_fp)
            audio_bytes = audio_fp.getvalue()
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            await websocket.send(f"AUDIO::{audio_b64}")
            
            # Save audio file if filename provided
            if audio_filename:
                # Make sure recordings directory exists
                os.makedirs("/recordings", exist_ok=True)
                audio_path = f"/recordings/{audio_filename}.mp3"
                with open(audio_path, "wb") as f:
                    f.write(audio_bytes)
                    
        except Exception as e:
            print(f"Audio generation error: {e}")
        queue.task_done()


# --- WebSocket Handler ---
async def handle_client(websocket):
    # Create a queue for sequential audio
    audio_queue = asyncio.Queue()
    # Start background audio worker
    audio_task = asyncio.create_task(audio_worker(websocket, audio_queue))
    
    # Variables to accumulate the conversation
    current_user_message = ""
    full_gemini_reply = ""
    audio_filename = None

    try:
        async for message in websocket:
            try:
                # Store user message
                current_user_message = message
                full_gemini_reply = ""  # Reset for new response
                audio_filename = f"audio_{uuid.uuid4().hex}"  # Generate unique filename
                
                # Stream Gemini response
                response = model.generate_content(message, stream=True)

                for chunk in response:
                    if chunk.text:
                        # 1️⃣ Send text immediately
                        await websocket.send(chunk.text)
                        # 2️⃣ Accumulate full reply for database
                        full_gemini_reply += chunk.text
                        # 3️⃣ Enqueue audio for sequential sending
                        await audio_queue.put((chunk.text, audio_filename))

                # End marker
                await websocket.send("[[END]]")
                
                # Save conversation to database
                try:
                    audio_path = f"/recordings/{audio_filename}.mp3" if audio_filename else None
                    await insert_chat(
                        user_input=current_user_message,
                        gemini_reply=full_gemini_reply,
                        audio_path=audio_path
                    )
                    print(f"✅ Conversation saved to database: {current_user_message[:50]}...")
                except Exception as db_error:
                    print(f"❌ Database error: {db_error}")

            except Exception as e:
                await websocket.send(f"Error: {str(e)}")
    finally:
        # Cleanup
        audio_task.cancel()
        try:
            await audio_task
        except asyncio.CancelledError:
            pass


# --- Start WebSocket Server ---
async def start_gemini_websocket():
    server = await websockets.serve(handle_client, "0.0.0.0", 8765)
    print("✅ Gemini WebSocket server started on ws://localhost:8765")
    return server


if __name__ == "__main__":
    async def main():
        await start_gemini_websocket()
        await asyncio.Future()  # Run forever