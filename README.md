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
┌─────────────┐      ┌─────────────────┐      ┌─────────┐
│  frontend   │────▶│ samples-service │────▶│ MongoDB │
│  (Vue.js)   │      │ results-service │      │  (8.0)  │
│  port: 80   │      │  (FastAPI)      │      │  27017  │
│             │      │  port: 8000     │      │         │
└─────────────┘      └─────────────────┘      └─────────┘
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


- kubernetes (k3s, k8s)


### Lépések


1. repository klónozása


```bash
git clone https://github.com/Laislo/gde-b-alkfet.git
cd gde-b-alkfet
```


2. ArgoCD telepítése

  1. Namespace létrehozása
```bash
kubectl create namespace argocd
```

  2. ArgoCD telepítése
```bash
kubectl apply -n argocd \
  --server-side \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
```

  3. Telepítés ellenőrzése
```bash
kubectl get pods -n argocd
```

  4. ArgoCD IU-t elérhetővé tesszük NodePort-on

```bash
kubectl patch svc argocd-server -n argocd \
  -p '{"spec": {"type": "NodePort"}}'
```

  5. Lekérjük a beállított portot

```bash
kubectl get svc argocd-server -n argocd
```

  6. Lekérjük az admin jelszót

```bash
kubectl get secret argocd-initial-admin-secret \
  -n argocd \
  -o jsonpath="{.data.password}" | base64 -d && echo
```

  7. Megnyitjuk az ArgoCD webes felületét

https://SzerverIP:<nodeport> (30000 feletti port, amit a 5. pontban adott vissza a rendszer)

Felhasználónév: admin
Jelszó: 6. pontban lekértük

3. ArgoCD application manifest alkalmazása

```bash
kubectl apply -f k8s/argocd/argocd-app.yaml
```


3. konténerek állapotának ellenőrzése


Az összes információ mutatása a futó konténerekről:


```bash
kubectl get pods -n klab
```


## Használat, ellenőrzés


Innentől, hogy fut minden konténer, megnyithatjuk a böngészőben.


Esetemben egy különálló gépen futtattam a környezetet.


- Saját gépen futtatva: **http://localhost:30000**
- Külön szerveren futtatva: **http://SERVERIP:30000**


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


MCP szerver elérése: http://SERVERIP:30080/sse


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

