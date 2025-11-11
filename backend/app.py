from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from database import connect_db, disconnect_db, init_db
from routes.chats import router as chats_router
from routes.csv_export import router as export_router
# Comment out PDF export for now
# from routes.pdf_export import router as pdf_router

from gemini_websocket import start_gemini_websocket
from vosk_websocket import start_vosk_websocket

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/recordings", StaticFiles(directory="/recordings"), name="recordings")

app.include_router(chats_router)
# app.include_router(pdf_router)  # Comment out for now
app.include_router(export_router) 
@app.on_event("startup")
async def startup():
    # Connect to database
    await connect_db()
    await init_db()

    # Start WebSocket servers
    gemini_server = await start_gemini_websocket()
    vosk_server = await start_vosk_websocket()

    # Store servers in app state for proper shutdown
    app.state.gemini_server = gemini_server
    app.state.vosk_server = vosk_server

    print("✅ All servers started:")
    print("   - FastAPI: http://localhost:8008")
    print("   - Gemini WebSocket: ws://localhost:8765")
    print("   - Vosk WebSocket: ws://localhost:2700")

@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()

    # Close WebSocket servers
    if hasattr(app.state, "gemini_server"):
        app.state.gemini_server.close()
        await app.state.gemini_server.wait_closed()
        print("✅ Gemini WebSocket server stopped")

    if hasattr(app.state, "vosk_server"):
        app.state.vosk_server.close()
        await app.state.vosk_server.wait_closed()
        print("✅ Vosk WebSocket server stopped")