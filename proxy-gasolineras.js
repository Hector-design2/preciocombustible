/**
 * proxy-gasolineras.js
 * Proxy Node.js para la API REST del Ministerio (MITECO)
 * Resuelve el problema CORS cuando el Add-In corre en el navegador.
 *
 * Instalar: npm install express node-fetch cors
 * Ejecutar: node proxy-gasolineras.js
 * Puerto:   3001
 *
 * En app.js cambia MINETUR_URL a: "http://localhost:3001/gasolineras"
 * En producción: despliega en tu servidor y usa HTTPS.
 */

const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
const PORT = process.env.PORT || 3001;

const MINETUR_URL = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

// Permitir peticiones desde cualquier origen (en producción, restringe al dominio de Geotab)
app.use(cors({
    origin: "*",
    methods: ["GET"]
}));

// Endpoint principal: devuelve todos los precios de España
app.get("/gasolineras", async (req, res) => {
    try {
        console.log("[" + new Date().toISOString() + "] Fetching MINETUR data...");

        const response = await fetch(MINETUR_URL, {
            headers: { "Accept": "application/json" }
        });

        if (!response.ok) {
            return res.status(502).json({ error: "MINETUR API error: " + response.status });
        }

        const data = await response.json();

        // Cabeceras de caché: los precios se actualizan 1-2 veces al día
        res.setHeader("Cache-Control", "public, max-age=3600"); // 1 hora de caché
        res.setHeader("Content-Type", "application/json");
        res.json(data);

        console.log("[" + new Date().toISOString() + "] Sent " + (data.ListaEESSPrecio || []).length + " stations");

    } catch (err) {
        console.error("Proxy error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Endpoint con filtro por provincia (más rápido para flotas locales)
// Uso: GET /gasolineras/provincia/2   (2 = Albacete, ver lista abajo)
app.get("/gasolineras/provincia/:id", async (req, res) => {
    const provinciaId = parseInt(req.params.id);
    if (isNaN(provinciaId) || provinciaId < 1 || provinciaId > 52) {
        return res.status(400).json({ error: "ID de provincia inválido (1-52)" });
    }

    const url = "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/FiltroProvincia/" + provinciaId;

    try {
        const response = await fetch(url, { headers: { "Accept": "application/json" } });
        const data = await response.json();
        res.setHeader("Cache-Control", "public, max-age=1800");
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/health", (req, res) => res.json({ status: "ok", time: new Date() }));

app.listen(PORT, () => {
    console.log("🛢️  Proxy Gasolineras España corriendo en http://localhost:" + PORT);
    console.log("   GET /gasolineras              → Todas las estaciones");
    console.log("   GET /gasolineras/provincia/2  → Solo Albacete");
    console.log("   GET /health                   → Estado del proxy");
});

/*
 * IDs de Provincias más usados:
 * 1=Álava, 2=Albacete, 3=Alicante, 4=Almería, 5=Ávila
 * 6=Badajoz, 7=Illes Balears, 8=Barcelona, 9=Burgos
 * 10=Cáceres, 11=Cádiz, 12=Castellón, 13=Ciudad Real
 * 14=Córdoba, 15=A Coruña, 16=Cuenca, 17=Girona
 * 18=Granada, 19=Guadalajara, 20=Gipuzkoa, 21=Huelva
 * 22=Huesca, 23=Jaén, 24=León, 25=Lleida, 26=La Rioja
 * 27=Lugo, 28=Madrid, 29=Málaga, 30=Murcia, 31=Navarra
 * 32=Ourense, 33=Asturias, 34=Palencia, 35=Las Palmas
 * 36=Pontevedra, 37=Salamanca, 38=Sta Cruz de Tenerife
 * 39=Cantabria, 40=Segovia, 41=Sevilla, 42=Soria
 * 43=Tarragona, 44=Teruel, 45=Toledo, 46=Valencia
 * 47=Valladolid, 48=Bizkaia, 49=Zamora, 50=Zaragoza
 * 51=Ceuta, 52=Melilla
 */
