import logging
import asyncio
import websockets
from vosk import Model, KaldiRecognizer

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("--VOSK--")

MODEL_PATH = "models/vosk-model-small-en-us-0.15"
model = Model(MODEL_PATH)


async def recognize(websocket):
    """
    WebSocket handler for Vosk streaming recognition
    """
    rec = KaldiRecognizer(model, 16000)
    try:
        async for message in websocket:
            if rec.AcceptWaveform(message):
                await websocket.send(rec.Result())
            else:
                await websocket.send(rec.PartialResult())

        # send final result when client disconnects
        try:
            await websocket.send(rec.FinalResult())
        except websockets.exceptions.ConnectionClosedOK:
            pass

    except websockets.exceptions.ConnectionClosedOK:
        pass


async def start_vosk_websocket():
    server = await websockets.serve(recognize, "0.0.0.0", 2700)
    logger.info("✅ Vosk WebSocket server started on ws://localhost:2700")
    return server


if __name__ == "__main__":

    async def main():
        server = await start_vosk_websocket()
        await asyncio.Future()  # run forever

    asyncio.run(main())
