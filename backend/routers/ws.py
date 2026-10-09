"""
WebSocket signaling server for WebRTC.
No media goes through here — only tiny JSON control messages (offer/answer/ICE candidates).
Actual audio/video travels peer-to-peer via WebRTC using Google's free STUN servers.
"""
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter()

# meeting_code -> { participant_id_str: WebSocket }
rooms: dict[str, dict[str, WebSocket]] = {}


@router.websocket("/ws/{code}")
async def signaling(websocket: WebSocket, code: str):
    await websocket.accept()
    my_id: str | None = None

    try:
        async for raw in websocket.iter_text():
            msg = json.loads(raw)
            msg_type = msg.get("type")

            if msg_type == "join":
                my_id = str(msg["from"])
                rooms.setdefault(code, {})[my_id] = websocket
                # Tell every existing peer that someone new arrived; they'll each send an offer.
                for pid, ws in list(rooms[code].items()):
                    if pid != my_id:
                        await ws.send_text(raw)

            elif msg_type in ("offer", "answer", "ice-candidate"):
                to = str(msg.get("to", ""))
                if to and code in rooms and to in rooms[code]:
                    await rooms[code][to].send_text(raw)

            elif msg_type == "leave":
                break

    except WebSocketDisconnect:
        pass
    finally:
        if my_id and code in rooms:
            rooms[code].pop(my_id, None)
            if not rooms[code]:
                del rooms[code]
            # Notify remaining peers so they can clean up the connection.
            leave = json.dumps({"type": "leave", "from": my_id})
            for ws in list(rooms.get(code, {}).values()):
                try:
                    await ws.send_text(leave)
                except Exception:
                    pass
