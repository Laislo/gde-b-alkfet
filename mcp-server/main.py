import os
import httpx
import asyncio
import mcp.types as types
from mcp.server import Server
from mcp.server.sse import SseServerTransport
from fastapi import FastAPI, Request
from starlette.responses import Response

# 1. MCP Szerver inicializálása
app_mcp = Server("KLab-LIMS-Assistant-Server")

SAMPLES_URL = os.getenv("SAMPLES_API_URL", "http://samples-service:8000")

# --- Regisztrált Toolok ---
@app_mcp.list_tools()
async def handle_list_tools():
    return [
        types.Tool(
            name="get_system_info",
            description="Lekéri a távoli szerver adatait",
            inputSchema={"type": "object", "properties": {}},
        ),
        types.Tool(
            name="get_all_samples",
            description="Lekéri az összes laboratóriumi minta listáját elemzésre.",
            inputSchema={"type": "object", "properties": {}},
        ),
        types.Tool(
            name="check_sample_history",
            description="Lekéri egy konkrét minta adatait a Lab ID alapján.",
            inputSchema={
                "type": "object",
                "properties": {
                    "lab_id": {"type": "string", "description": "A minta egyedi azonosítója"}
                },
                "required": ["lab_id"]
            },
        ),
        types.Tool(
            name="get_lab_summary",
            description="Összegző statisztikát készít a labor aktuális mintáiról.",
            inputSchema={"type": "object", "properties": {}},
        )
    ]

@app_mcp.call_tool()
async def handle_call_tool(name: str, arguments: dict | None):
    async with httpx.AsyncClient() as client:
        if name == "get_system_info":
            return [types.TextContent(type="text", text="Üdvözlet a Docker konténerből!")]

        elif name == "get_all_samples":
            resp = await client.get(f"{SAMPLES_URL}/api/samples")
            return [types.TextContent(type="text", text=str(resp.json()))]

        elif name == "check_sample_history":
            lab_id = arguments.get("lab_id")
            resp = await client.get(f"{SAMPLES_URL}/api/samples")
            samples = resp.json()
            for s in samples:
                if s.get('labId') == lab_id:
                    return [types.TextContent(type="text", text=str(s))]
            return [types.TextContent(type="text", text="Nincs ilyen azonosítójú minta.")]

        elif name == "get_lab_summary":
            resp = await client.get(f"{SAMPLES_URL}/api/samples")
            samples = resp.json()
            total = len(samples)
            oos = len([s for s in samples if s.get('status') == 'OOS'])
            return [types.TextContent(type="text", text=f"Összes minta: {total}, ebből OOS: {oos}.")]

    raise ValueError(f"Ismeretlen tool: {name}")

# 2. FastAPI és SSE transport beállítása
mcp_web_app = FastAPI(title="Klab-LIMS-Assistant")

# Fontos: A SseServerTransport-nak szüksége van egy alap URL-re a /messages-hez
sse = SseServerTransport("/messages")

@mcp_web_app.get("/sse")
async def handle_sse(request: Request):
    # Az SSE kapcsolat létrejöttekor az SDK kezeli a streamet
    async with sse.connect_sse(request.scope, request.receive, request._send) as (read_stream, write_stream):
        await app_mcp.run(
            read_stream,
            write_stream,
            app_mcp.create_initialization_options()
        )

@mcp_web_app.post("/messages")
async def handle_messages(request: Request):
    # A beérkező JSON-RPC üzenetek feldolgozása
    await sse.handle_post_message(request.scope, request.receive, request._send)
    # Üres válasz visszaadása, hogy a FastAPI ne próbáljon meg sajátot generálni
    return Response(status_code=202)