import logging
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import asyncio

from database import connect_db, disconnect_db, init_db
from routes.chats import router as chats_router
from routes.export import router as export_router

from gemini_websocket import start_gemini_websocket
from vosk_websocket import start_vosk_websocket

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--FASTAPI--")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/recordings", StaticFiles(directory="/recordings"), name="recordings")

app.include_router(chats_router)
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

    logger.info("✅ All servers started:")
    logger.info("   - FastAPI: http://localhost:8008")
    logger.info("   - Gemini WebSocket: ws://localhost:8765")
    logger.info("   - Vosk WebSocket: ws://localhost:2700")


@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()

    # Close WebSocket servers
    if hasattr(app.state, "gemini_server"):
        app.state.gemini_server.close()
        await app.state.gemini_server.wait_closed()
        logger.info("✅ Gemini WebSocket server stopped")

    if hasattr(app.state, "vosk_server"):
        app.state.vosk_server.close()
        await app.state.vosk_server.wait_closed()
        logger.info("✅ Vosk WebSocket server stopped")
