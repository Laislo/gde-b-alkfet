# Klab LIMS

## Leírás

Ebben a projektben egy LIMS (Laboratory Information Management System - Laboratóriumi Információkezelő Rendszer) került megvalósításra.
Labóratóriumi minták rögzítésének lehetősége, ezen minták fontos adatai a hatóanyag, sarzsszám, minimum és maximum érték, amik között a mérés megfelelő, ellenben OOS jelölést kap (Out of specification).

## Rendszer felépítése

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
| **frontend** | Vue.JS, Nginx | 80 | Frontend alkalmazás |
| **samples-service** | FastAPI | 8000 | REST API gateway - samples |
| **results-service** | FastAPI | 8000 | REST API gateway - results |
| **mcp-server** | MCP + FastAPI | 8080 | MCP server (SSE) — AI tool - csak a samples-service-hez csatlakozik |
| **MongoDB** | MongoDB 8.0 | 27017 | adatok tárolása, samples és results-service-ektől érkező adatok |

---