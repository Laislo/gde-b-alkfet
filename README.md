# Klab LIMS

## Leírás

Ebben a projektben egy LIMS (Laboratory Information Management System - Laboratóriumi Információkezelő Rendszer) került megvalósításra.
Labóratóriumi minták rögzítésének lehetősége, ezen minták fontos adatai a hatóanyag, sarzsszám, minimum és maximum érték, amik között a mérés megfelelő, ellenben OOS jelölést kap (Out Of Specification).

## Funkcionális követelmények - MoSCoW

1. Must have (Implementált)
- Minta név (Hatóanyag) bevitel
- Minta sarzsszám (Batch) bevitel
- Nem vihető be a rendszerben már létező sarzsszám
- Hatóanyagtaralom alsó és felső specifikáció megadás (default: 95.0 - 105.0 %)
- Automatikus laboratóriumi futó ID generálás (KLab/[ÉVSZÁM]/[SORSZÁM])
- Vizsgálati státusz jelölése (Pending/Completed/OOS)
- Vizsgálati eredmény rögzítése (Hatóanyag-tartalom %)
- Specifikáción kívüli eredmény esetén auotomatikus futó OOS azonosító generálás (OOS-[ÉVSZÁM]-[SORSZÁM])
- Minta törlés
- Keresés funkció (Hatóanyag, Sarzsszám, LAB ID alapján)

2. Should have (Implementált)
- Minta érkeztetési és a vizsgálati eredmény beviteli idők rögzítése KPI számítás érdekében (átfutási idők)
- Értelmetlen vizsgálati eredmény bevitelének tiltása (negatív számok, 200% feletti hatóanyagtartalom)

3. Could have (Nem implementált)
- Felhasználó azonosítás
- Jogosultsági körök (pl.: Minta érkeztető, Eredmény bevivő, Vizsgálati eredményt jóváhagyó / törlő jogosultság)

4. Won't have (Nem implementált)
- Integráció egy különálló gyógyszeripari QA szoftverrel, mely az OOS eredményeket jóváhagyja (Termékhiba), vagy újravizsgálatot rendel el (Mintavételi vagy analitikai hiba). 

### Rendszer felépítése

A rendszer Docker alapokra építve készült el.


```
┌─────────────┐      ┌─────────────────┐     ┌─────────┐
│  frontend   │────▶ │ samples-service │────▶│ MongoDB │
│  (Vue.js)   │      │ results-service │     │  (8.0)  │
│  port: 80   │      │  (FastAPI)      │     │  27017  │
│             │      │  port: 8000     │     │         │
└─────────────┘      └─────────────────┘     └─────────┘
                              │
                      ┌──────────────────┐
                      │  mcp-server      │
                      │ (MCP + FastAPI)  │
                      │  port: 8085      │
                      └──────────────────┘
                              │
                  MCP kliens, SSE-n keresztül
```

| Komponens | Technológia | Port | Leírás |
|-----------|-------------|------|--------|
| **frontend** | Vue.JS + TailWind CSS, Nginx | 80 | Frontend alkalmazás |
| **samples-service** | FastAPI | 8000 | REST API gateway - samples |
| **results-service** | FastAPI | 8000 | REST API gateway - results |
| **mcp-server** | MCP + FastAPI | 8080 | MCP server (SSE) — AI tool - csak a samples-service-hez csatlakozik |
| **MongoDB** | MongoDB 8.0 | 27017 | adatok tárolása, samples és results-service-ektől érkező adatok |

---

## Telepítés

Ubuntu LTS 24 Server alatt tesztelve.

### Előfeltételek

A telepítéshez, használathoz szükségünk lesz az alábbiakra:

- docker
- docker-compose
- 80 és 8080-as portok elérhetősége

### Lépések

1. repository klónozása

```bash
git clone https://github.com/Laislo/gde-b-alkfet.git
cd gde-b-alkfet
```

2. konténerek elindítása

```bash
docker compose up --build -d
```

3. konténerek állapotának ellenőrzése

Az összes információ mutatása a futó konténerekről:

```bash
docker ps
```

Kicsit konszolidáltabb kimenet.

```bash
docker ps --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"
```
A megfelelő működés esetén egy listát kapunk, amiben látjuk a futó konténereket.

```
CONTAINER ID   IMAGE                                        NAMES                  STATUS
bdbbc67cf57a   ghcr.io/laislo/klab-frontend:latest          klab_frontend          Up 12 minutes
cf950327f802   ghcr.io/laislo/klab-mcp-server:latest        klab_mcp_server        Up 4 minutes
1dd9141db9f9   ghcr.io/laislo/klab-samples-service:latest   klab_samples_service   Up 12 minutes
3bcb42f862a1   ghcr.io/laislo/klab-results-service:latest   klab_results_service   Up 12 minutes
a73e08674947   mongo:latest                                 klab_db                Up 12 minutes
```

### Docker desktop

Ezzel is tesztelve.
- Letöltés: https://www.docker.com/get-started/

1. docker-compose.yml letöltése

Git repo: https://github.com/Laislo/gde-b-alkfet.git

Docker Desktop esetén a **docker-compose.yml** fájlra lesz szükség.

2. konténerek elindítása

Docker Desktop esetén, fusson a Docker Desktop, nyissunk egy parancssort, navigáljunk a oda, ahova a **docker-compose.yml** le lett töltve, majd futtassuk az alábbi parancsot

```bash
docker compose up
```

3. konténerek állapotának ellenőrzése

Docker Desktop esetén a paranccsorból való indítás után a **View in Docker Desktop** lehetőséggel tudjuk ellenőrizni. Ezután meg tudjuk nyitni a böngészőben is.

## Használat, ellenőrzés

Innentől, hogy fut minden konténer, megnyithatjuk a böngészőben.

Esetemben egy különálló gépen futtattam a környezetet.

- Saját gépen futtatva: **http://localhost**
- Külön szerveren futtatva: **http://SERVERIP**

Ezzel a LIMS rendszer grafikus felületét láthatjuk, ide tudunk felvinni mintákat.
Minden új minta **PENDING** állapotban jön létre, egészen addig amíg a **Minták listája** felületen nem kerül rögzítésre eredmény.
A minta regisztrálásakor megadott határértékektől függően a rögzített mérési érték alapján lehet **COMPLETED** vagy **OOS**.

## API végpontok

### Samples

GET

- /api/samples - az összes feltöltött minta listázása
- /api/samples/{s_id} - megadott minta adatainak lekérdezése

POST

- /api/samples - új minta feltöltése

DELETE

- /api/samples/{s_id} - megadott minta törlése

### Results

PATCH

- /api/results/{s_id} - megadott mintához történő érték rögzítése

## MCP szerver

MCP szerver elérése: http://SERVERIP:8080/sse

### curl alapú tesztelés

```bash
curl -N http://<SERVER_IP>:8080/sse
```

Az itt kapott **session_id** segítségével inicializálunk:

```bash
curl -X POST "http://<SERVER_IP>:8080/messages?session_id=<session_id>" \
-H "Content-Type: application/json" \
-d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Elérhető MCP funkciók

- get_system_info: rendszerinformáció lekérése.
- get_all_samples: Összes laboratóriumi minta listázása.
- get_lab_summary: Statisztikai összegzés (Összes minta, OOS darabszám).
- check_sample_history: Egy konkrét minta részletes adatai lab_id alapján.

get_all_samples
```bash
curl -X POST "http://192.168.1.60:8080/messages?session_id=<session_id>" \
-H "Content-Type: application/json" \
-d '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_all_samples",
    "arguments": {}
  }
}'
```

get_lab_summary
```bash
curl -X POST "http://192.168.1.60:8080/messages?session_id=<session_id>" \
-H "Content-Type: application/json" \
-d '{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_lab_summary",
    "arguments": {}
  }
}'
```

check_sample_history (példa: KLab/2026/001, ha már hoztunk létre egy mintát)
```bash
curl -X POST "http://192.168.1.60:8080/messages?session_id=IDE_AZ_IDT" \
-H "Content-Type: application/json" \
-d '{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "check_sample_history",
    "arguments": {
      "lab_id": "KLab/2026/001"
    }
  }
}'
```

### Claude Desktop összekötés

Menü->File->Settings...->Developer->Edit config

Az itt található **claude_desktop_config.json** fájlt módosítsuk az alábbi szerint

```json
{
  "preferences": {
    "coworkWebSearchEnabled": true,
    "coworkScheduledTasksEnabled": false,
    "ccdScheduledTasksEnabled": false
  },
  "mcpServers": {
    "klab-lims": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://SZERVER_IP:8080/sse",
		"--allow-http"
      ]
    }
  }
}
```

Indítsuk újra a Claude-ot (jobb klikk az óra melletti ikonon, Quit, majd nyissuk meg újra).
Ezután a Developers alatt megjelenik a **Local MCP Servers** alatt a **klab-lims** néven és **running** állapotban. Más esetben hibára futott.

Ezután már lekérhetjük, milyen toolokat érünk el, milyen adatokhoz tudunk hozzáférni.