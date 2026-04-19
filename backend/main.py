from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, model_validator
import os

app = FastAPI()

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

@app.post("/api/samples")
async def add_sample(sample: SampleCreate):
    year = datetime.now().year
    
    # 1. Megszámoljuk az idei mintákat az adatbázisban
    # Keressük azokat, amiknek a labId-je az idei évvel kezdődik
    count = await db.samples.count_documents({
        "labId": {"$regex": f"^KLab/{year}/"}
    })
    
    # 2. Generáljuk a következő sorszámot (count + 1)
    # A :03d gondoskodik róla, hogy 001, 002 legyen a formátum
    new_id = f"KLab/{year}/{(count + 1):03d}"
    
    new_doc = sample.model_dump()
    new_doc["labId"] = new_id
    new_doc["status"] = "Pending"
    new_doc["arrivalDate"] = datetime.now()
    
    # 3. Mentés
    result = await db.samples.insert_one(new_doc)
    new_doc["_id"] = str(result.inserted_id)
    
    # Dátumot stringgé alakítjuk a válaszhoz, hogy ne legyen JSON hiba
    new_doc["arrivalDate"] = new_doc["arrivalDate"].isoformat()
    
    return new_doc

@app.patch("/api/samples/{s_id}")
async def update_sample(s_id: str, update: ResultUpdate):
    try:
        # 1. Megkeressük a mintát
        sample = await db.samples.find_one({"_id": ObjectId(s_id)})
        if not sample:
            raise HTTPException(status_code=404, detail="Nincs meg a minta")

        # 2. Logika futtatása
        val = update.assayValue
        s_min = sample.get("specMin", 95.0)
        s_max = sample.get("specMax", 105.0)
        
        status = "Completed" if s_min <= val <= s_max else "OOS"
        oos_id = None
        
        if status == "OOS":
            oos_count = await db.samples.count_documents({"status": "OOS"})
            oos_id = f"OOS-{datetime.now().year}-{(oos_count + 1):03d}"

        # 3. Mentés az adatbázisba
        await db.samples.update_one(
            {"_id": ObjectId(s_id)},
            {"$set": {"assayValue": val, "status": status, "oosId": oos_id}}
        )
        return {"status": status, "oosId": oos_id}
    except Exception as e:
        print(f"Hiba a mérésnél: {e}")
        raise HTTPException(status_code=500, detail=str(e))
