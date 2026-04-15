const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors({ origin: '*' })); // Engedélyezzünk minden forrást tesztelésre
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://db:27017/testdb';

mongoose.connect(MONGO_URI)
  .then(() => console.log("DB Connected"))
  .catch(err => console.error("DB Error:", err));

app.get('/api/version', async (req, res) => {
  try {
    // Lekérdezzük a MongoDB verziót az adatbázistól
    const status = await mongoose.connection.db.admin().serverStatus();
    res.json({ 
      status: "Sikeres kapcsolat!", 
      dbVersion: status.version,
      backend: "Node.js v20"
    });
  } catch (err) {
    res.status(500).json({ error: "Adatbázis hiba" });
  }
});

app.listen(5000, () => console.log("Backend fut a 5000-esen"));
