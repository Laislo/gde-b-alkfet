from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, model_validator
import os

from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await create_indexes()
    yield
    # Shutdown (ha kell)

app = FastAPI(title="KLab LIMS Samples Service", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB kapcsolat
client = AsyncIOMotorClient(os.getenv("MONGO_URI", "mongodb://db:27017"))
db = client.klab_db

# ÚJ: Egyedi indexek létrehozása az indításkor
async def create_indexes():
    await db.samples.create_index("labId", unique=True)
    await db.samples.create_index("batchNumber", unique=True)

# Segédfüggvény a MongoDB -> JSON konverzióhoz
def fix_id(doc):
    if doc:
        doc["_id"] = str(doc["_id"])
    return doc

class SampleCreate(BaseModel):
    drugName: str
    batchNumber: str
    specMin: float
    specMax: float

    @model_validator(mode='after')
    def check_limits(self):
        if self.specMax > 200.0:
            raise ValueError('A specifikációs maximum nem haladhatja meg a 200%-ot!')
        if self.specMin < 0.0:
            raise ValueError('A specifikációs minimum nem lehet negatív!')
        if self.specMin >= self.specMax:
            raise ValueError('A minimum értéknek kisebbnek kell lennie a maximumnál!')
        return self

@app.get("/api/samples")
async def get_samples():
    cursor = db.samples.find().sort("_id", -1)
    return [fix_id(s) async for s in cursor]

@app.get("/api/samples/{s_id}")
async def get_sample(s_id: str):
    if not ObjectId.is_valid(s_id):
        raise HTTPException(status_code=400, detail="Érvénytelen ID formátum")
    doc = await db.samples.find_one({"_id": ObjectId(s_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="A minta nem található")
    return fix_id(doc)

@app.post("/api/samples")
async def add_sample(sample: SampleCreate):
    # --- ÚJ: Sarzsszám ellenőrzése ---
    existing_batch = await db.samples.find_one({"batchNumber": sample.batchNumber})
    if existing_batch:
        raise HTTPException(
            status_code=400, 
            detail=f"Hiba: A '{sample.batchNumber}' sarzsszám már szerepel a rendszerben!"
        )
    # --- ELLENŐRZÉS VÉGE ---
    year = datetime.now().year

    # 2. Ütközésmentes Lab ID generálása
    # Megszámoljuk az összes idei mintát az alap sorszámhoz
    count = await db.samples.count_documents({"labId": {"$regex": f"^KLab/{year}/"}})
    
    candidate_id = ""
    offset = 1
    # Addig növeljük a sorszámot, amíg nem találunk egy szabad helyet
    while True:
        candidate_id = f"KLab/{year}/{(count + offset):03d}"
        exists = await db.samples.find_one({"labId": candidate_id})
        if not exists:
            break
        offset += 1

    new_doc = sample.model_dump()
    new_doc.update({
        "labId": candidate_id,
        "status": "Pending",
        "arrivalDate": datetime.now(),
        "assayValue": None,
        "oosId": None
    })
    
    try:
        result = await db.samples.insert_one(new_doc)
        new_doc["_id"] = str(result.inserted_id)
        new_doc["arrivalDate"] = new_doc["arrivalDate"].isoformat()
        return new_doc
    except Exception as e:
        # Ha valamiért mégis becsúszna egy duplikáció az index miatt
        raise HTTPException(status_code=500, detail="Adatbázis hiba az azonosító generálásakor.")

# --- ÚJ: Minta lekérése Lab ID alapján ---
@app.get("/api/samples/labid/{lab_id}")
async def get_sample_by_labid(lab_id: str):
    # Itt a pontos Lab ID-ra szűrünk (pl. KLab/2026/001)
    doc = await db.samples.find_one({"labId": lab_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Minta nem található ezzel a Lab ID-val")
    return fix_id(doc)

@app.patch("/api/samples/labid/{lab_id}/internal-update")
async def internal_update_sample(lab_id: str, update_data: dict):
    """Belső végpont, amit a results-service hívhat meg"""
    result = await db.samples.update_one(
        {"labId": lab_id},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Nincs mit frissíteni")
    return {"status": "success"}

@app.delete("/api/samples/{s_id}", status_code=204)
async def delete_sample(s_id: str):
    if not ObjectId.is_valid(s_id):
        raise HTTPException(status_code=400, detail="Érvénytelen ID formátum")
    result = await db.samples.delete_one({"_id": ObjectId(s_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="A minta nem található, így nem törölhető")
    return None # A 204-es kód nem küld vissza tartalmat
