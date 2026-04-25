# Klab LIMS

## Leírás

Ebben a projektben egy LIMS (Laboratory Information Management System - Laboratóriumi Információkezelő Rendszer) került megvalósításra.
Labóratóriumi minták rögzítésének lehetősége, ezen minták fontos adatai a hatóanyag, sarzsszám, minimum és maximum érték, amik között a mérés megfelelő, ellenben OOS jelölést kap (Out of specification).

### Rendszer felépítése

A rendszer Docker alapokra építve készült el.


```
┌─────────────┐      ┌─────────────────┐     ┌─────────┐
│  frontend   │────▶│ samples-service │────▶│ MongoDB │
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

#### Docker desktop

Ezzel is tesztelve.
- Letöltés: https://www.docker.com/get-started/

### Lépések

1. repository klónozása

```bash
git clone https://github.com/Laislo/gde-b-alkfet.git
cd gde-b-alkfet
```

Docker Desktop esetén a **docker-compose.yml** fájlra lesz szükség.

2. konténerek elindítása

```bash
docker compose up --build -d
```

Docker Desktop esetén, fusson a Docker Desktop, nyissunk egy parancssort, navigáljunk a oda, ahova a **docker-compose.yml** le lett töltve, majd futtassuk az alábbi parancsot

```bash
docker compose up
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

Docker Desktop esetén a paranccsorból való indítás után a **View in Docker Desktop** lehetőséggel tudjuk ellenőrizni. Ezután meg tudjuk nyitni a böngészőben is.

## Használat, ellenőrzés

Innentől, hogy fut minden konténer, megnyithatjuk a böngészőben.

Esetemben egy különálló gépen futtattam a környezetet.

- Saját gépen futtatva: **http://localhost**
- Külön szerveren futtatva: **http://SERVERIP**

Ezzel a LIMS rendszer grafikus felületét láthatjuk, ide tudunk felvinni mintákat.
Minden új minta **PENDING** állapotban jön létre, egészen addig amíg a **Minták listája** felületen nem kerül rögzítésre eredmény.
A minta regisztrálásakor megadott határértékektől függően a rögzített mérési érték alapján lehet **COMPLETED** vagy **OOS**.