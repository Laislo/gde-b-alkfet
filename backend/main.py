from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, model_validator
import os

app = FastAPI(title="KLab LIMS API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB kapcsolat
client = AsyncIOMotorClient(os.getenv("MONGO_URI", "mongodb://db:27017"))
db = client.klab_db

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
        if self.specMin >= self.specMax:
            raise ValueError('A minimum értéknek kisebbnek kell lennie a maximumnál!')
        return self

class ResultUpdate(BaseModel):
    assayValue: float

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
    count = await db.samples.count_documents({
        "labId": {"$regex": f"^KLab/{year}/"}
    })
    
    new_id = f"KLab/{year}/{(count + 1):03d}"
    new_doc = sample.model_dump()
    new_doc.update({
        "labId": new_id,
        "status": "Pending",
        "arrivalDate": datetime.now(),
        "assayValue": None,
        "oosId": None
    })
    
    result = await db.samples.insert_one(new_doc)
    new_doc["_id"] = str(result.inserted_id)
    new_doc["arrivalDate"] = new_doc["arrivalDate"].isoformat()
    return new_doc

@app.patch("/api/samples/{s_id}")
async def update_sample(s_id: str, update: ResultUpdate):
    if not ObjectId.is_valid(s_id):
        raise HTTPException(status_code=400, detail="Érvénytelen ID formátum")
    
    sample = await db.samples.find_one({"_id": ObjectId(s_id)})
    if not sample:
        raise HTTPException(status_code=404, detail="Nincs meg a minta")

    val = update.assayValue
    s_min = sample.get("specMin", 95.0)
    s_max = sample.get("specMax", 105.0)
    
    status = "Completed" if s_min <= val <= s_max else "OOS"
    oos_id = sample.get("oosId")
    
    # Csak akkor generálunk új OOS ID-t, ha eddig nem volt, de most OOS lett
    if status == "OOS" and not oos_id:
        oos_count = await db.samples.count_documents({"status": "OOS"})
        oos_id = f"OOS-{datetime.now().year}-{(oos_count + 1):03d}"

    await db.samples.update_one(
        {"_id": ObjectId(s_id)},
        {"$set": {"assayValue": val, "status": status, "oosId": oos_id}}
    )
    return {"status": status, "oosId": oos_id, "assayValue": val}

@app.delete("/api/samples/{s_id}", status_code=204)
async def delete_sample(s_id: str):
    if not ObjectId.is_valid(s_id):
        raise HTTPException(status_code=400, detail="Érvénytelen ID formátum")
    result = await db.samples.delete_one({"_id": ObjectId(s_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="A minta nem található, így nem törölhető")
    return None # A 204-es kód nem küld vissza tartalmat
