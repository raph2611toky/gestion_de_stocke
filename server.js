require('dotenv').config(); // Charger les variables d'environnement

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const app = express();
const multer = require("multer");
const path = require("path");

// :::: Middleware :::: //
app.use(cors());
app.use(bodyParser.json()); // Utilisation de body-parser pour parser les requêtes JSON
app.use(bodyParser.urlencoded({ extended: true })); // Utilisation de body-parser pour parser les données url-encodées
app.use(morgan('dev')); // Utilisation de morgan pour le logging des requêtes HTTP


app.use("/api", require("./apps/routes/employe_route"));
app.use("/api", require("./apps/routes/stocke_route"));

// :::: Testing API :::: //
app.get("/", (req, res) => {
    res.json({ message: "Hello from API" });
});

// :::: Port :::: //
const PORT = process.env.PORT || 8001;
const HOST = process.env.HOST || 'localhost';

// :::: Server :::: //
app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}/`);
});