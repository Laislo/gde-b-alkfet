db = db.getSiblingDB('klab_db');

// Töröljük a meglévő adatokat a tiszta kezdéshez (opcionális)
db.samples.drop();

const drugs = [
    { name: "Paracetamol", min: 95.0, max: 105.0 },
    { name: "Ibuprofen", min: 98.0, max: 102.0 },
    { name: "Amoxicillin", min: 90.0, max: 110.0 },
    { name: "Metformin", min: 95.0, max: 105.0 },
    { name: "Lisinopril", min: 97.0, max: 103.0 },
    { name: "Atorvastatin", min: 95.0, max: 105.0 },
    { name: "Omeprazole", min: 98.5, max: 101.5 },
    { name: "Amlodipine", min: 95.0, max: 105.0 },
    { name: "Sertraline", min: 92.0, max: 108.0 },
    { name: "Vitamin-C", min: 90.0, max: 110.0 }
];

let sampleList = [];
let now = new Date();

// Segédfüggvény a LabID formázáshoz
function getLabId(index) {
    return "KLab/2026/" + (index + 1).toString().padStart(3, '0');
}

// 1. Létrehozunk 3 PENDING mintát
for (let i = 0; i < 3; i++) {
    let drug = drugs[i % drugs.length];
    sampleList.push({
        labId: getLabId(sampleList.length),
        drugName: drug.name,
        batchNumber: "BAT-26-" + (100 + i),
        specMin: drug.min,
        specMax: drug.max,
        status: "Pending",
        arrivalDate: new Date(now.getTime() - (Math.random() * 86400000)),
        assayValue: null,
        oosId: null
    });
}

// 2. Létrehozunk 12 OOS mintát
for (let i = 0; i < 12; i++) {
    let drug = drugs[(i + 3) % drugs.length];
    // Generálunk egy értéket, ami garantáltan kívül esik a határokon
    let assay = Math.random() > 0.5 ? drug.max + 2.5 : drug.min - 2.5;
    sampleList.push({
        labId: getLabId(sampleList.length),
        drugName: drug.name,
        batchNumber: "BAT-26-OOS-" + (200 + i),
        specMin: drug.min,
        specMax: drug.max,
        status: "OOS",
        arrivalDate: new Date(now.getTime() - (86400000 * 2)),
        completedAt: new Date(now.getTime() - (86400000 * 1)),
        assayValue: assay,
        oosId: "OOS-2026-" + (i + 1).toString().padStart(3, '0')
    });
}

// 3. Létrehozunk 10 COMPLETED mintát
for (let i = 0; i < 10; i++) {
    let drug = drugs[(i + 6) % drugs.length];
    // Érték a határokon belül
    let assay = drug.min + (Math.random() * (drug.max - drug.min));
    sampleList.push({
        labId: getLabId(sampleList.length),
        drugName: drug.name,
        batchNumber: "BAT-26-OK-" + (300 + i),
        specMin: drug.min,
        specMax: drug.max,
        status: "Completed",
        arrivalDate: new Date(now.getTime() - (86400000 * 5)),
        completedAt: new Date(now.getTime() - (86400000 * 3)),
        assayValue: parseFloat(assay.toFixed(2)),
        oosId: null
    });
}

db.samples.insertMany(sampleList);

print("Adatbázis inicializálva 25 mintával:");
print("- 3 Pending");
print("- 12 OOS");
print("- 10 Completed");