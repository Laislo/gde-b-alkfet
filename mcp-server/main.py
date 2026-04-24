from mcp.server.fastmcp import FastMCP
import httpx
import os

# MCP inicializálása
mcp = FastMCP("KLab-LIMS-Assistant")

# A belső hálózati URL a Samples szervizhez (Docker hálózaton)
SAMPLES_URL = os.getenv("SAMPLES_API_URL", "http://samples-service:8000")

@mcp.tool()
async def get_all_samples():
    """Lekéri az összes laboratóriumi minta listáját elemzésre."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SAMPLES_URL}/api/samples")
        return resp.json()

@mcp.tool()
async def check_sample_history(lab_id: str):
    """Lekéri egy konkrét minta adatait a Lab ID alapján."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SAMPLES_URL}/api/samples")
        samples = resp.json()
        for s in samples:
            if s['labId'] == lab_id:
                return s
        return "Nincs ilyen azonosítójú minta."

@mcp.tool()
async def get_lab_summary():
    """Összegző statisztikát készít a labor aktuális mintáiról (Összesen vs OOS)."""
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{SAMPLES_URL}/api/samples")
        samples = resp.json()
        total = len(samples)
        oos = len([s for s in samples if s['status'] == 'OOS'])
        return f"Összes minta a rendszerben: {total}, ebből OOS állapotú: {oos}."

if __name__ == "__main__":
    import uvicorn
    # Itt a FastMCP belső appját hívjuk meg
    app = mcp.app 
    
    # A host="0.0.0.0" mellett kikapcsoljuk a szigorú host-header ellenőrzést
    # Ez engedélyezi, hogy IP-címen keresztül is elérd a hálózaton
    uvicorn.run(app, host="0.0.0.0", port=8000, proxy_headers=True, forwarded_allow_ips="*")