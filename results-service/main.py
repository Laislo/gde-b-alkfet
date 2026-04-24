from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from datetime import datetime
from bson import ObjectId
from pydantic import BaseModel, model_validator
import os

app = FastAPI(title="KLab LIMS Results Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# MongoDB kapcsolat
client = AsyncIOMotorClient(os.getenv("MONGO_URI", "mongodb://db:27017"))
db = client.klab_db

class ResultUpdate(BaseModel):
    assayValue: float

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
