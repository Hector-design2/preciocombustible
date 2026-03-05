# 🗺️ Geotab Add-In: Gasolineras España

Mapa integrado en MyGeotab que muestra:
- **🚛 Tus vehículos** en tiempo real (posición + estado)
- **⛽ Gasolineras cercanas** con precios actualizados de todos los carburantes
- **Código de colores** por precio del Gasóleo A

## 📡 Fuente de datos

**API REST oficial del Gobierno de España (MITECO/MINETUR):**
```
https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/
```
- ✅ Gratuita, sin registro, sin API key
- ✅ ~11.000 estaciones de servicio en toda España
- ✅ Actualización diaria de precios
- ✅ Datos: Gasóleo A, Gasolina 95/98, GLP, GNC, Hidrógeno...
- ⚠️ Puede tener restricciones CORS → usa el proxy incluido

## 📁 Archivos

```
geotab-gasolineras/
├── config.json            ← Manifiesto del Add-In (editar URLs)
├── app.js                 ← Lógica principal (ES5, Leaflet)
├── app.css                ← Estilos
├── proxy-gasolineras.js   ← Proxy Node.js (solución CORS)
└── README.md              ← Este archivo
```

## 🚀 Instalación

### Paso 1 — Levanta el proxy (recomendado)

```bash
npm install express node-fetch cors
node proxy-gasolineras.js
```

El proxy arranca en `http://localhost:3001`.

En **producción**, despliega en tu servidor con HTTPS (Railway, Render, VPS...).

### Paso 2 — Sirve los archivos del Add-In

Sube `app.js` y `app.css` a tu servidor web con HTTPS:
```
https://tu-servidor.com/gasolineras/app.js
https://tu-servidor.com/gasolineras/app.css
```

### Paso 3 — Edita config.json

```json
"url": "https://TU-SERVIDOR/gasolineras/app.js"
"url": "https://TU-SERVIDOR/gasolineras/app.css"
```

También, si usas el proxy, en `app.js` cambia:
```javascript
var MINETUR_URL = "https://TU-SERVIDOR:3001/gasolineras";
```

### Paso 4 — Instala en MyGeotab

1. Ve a **Administration → System → System Settings → Add-Ins**
2. Haz clic en **New Add-In**
3. Pega el contenido de `config.json`
4. Guarda y recarga MyGeotab
5. El Add-In aparece en el menú lateral como **"Gasolineras España"**

---

## 🎮 Cómo usar

1. **Abre el Add-In** desde el menú de MyGeotab
2. El mapa carga automáticamente con tus **vehículos activos** (iconos 🚛)
3. Haz clic en **"⛽ Cargar Gasolineras"**
4. Se descargan ~11.000 estaciones — se muestran las de la **vista actual del mapa**
5. Los **marcadores de colores** indican precio del Gasóleo A:
   - 🟢 Verde → muy barato (< 1.38 €/L)
   - 🟡 Amarillo → normal (1.38–1.48 €/L)
   - 🟠 Naranja → caro (1.48–1.55 €/L)
   - 🔴 Rojo → muy caro (> 1.65 €/L)
6. **Haz clic** en cualquier gasolinera para ver todos los precios
7. Al mover el mapa, los marcadores se actualizan solos

---

## ⚙️ Personalización

### Cambiar radio de filtro
En `app.js`, modifica `MAX_MARKERS = 300` para mostrar más o menos gasolineras.

### Cambiar rangos de precio (colores)
En `app.js`, función `getPriceColor()`:
```javascript
function getPriceColor(diesel) {
    if (diesel <= 1.38) return "#16a34a"; // verde
    if (diesel <= 1.48) return "#65a30d"; // lima
    if (diesel <= 1.55) return "#d97706"; // naranja
    if (diesel <= 1.65) return "#ea580c"; // rojo-naranja
    return "#dc2626";                      // rojo
}
```

### Filtrar solo por tipo de combustible
La API del Ministerio también soporta filtros por provincia:
```
/EstacionesTerrestres/FiltroProvincia/28   → Solo Madrid
/EstacionesTerrestres/FiltroMunicipio/4354 → Solo un municipio
```

---

## 🔧 Solución de problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| Error CORS | Navegador bloquea petición al Ministerio | Usa el proxy Node.js |
| "0 vehículos" | Sin datos `DeviceStatusInfo` | Verifica que los dispositivos tienen GPS activo |
| Mapa no carga | CDN de Leaflet inaccesible | Descarga Leaflet localmente y referencia la copia local |
| API Ministerio caída | Mantenimiento frecuente del MITECO | Espera 1-2h o usa datos en caché |

---

## 📜 Licencia y créditos

- Precios combustibles: [Ministerio de Transición Ecológica (MITECO)](https://geoportalgasolineras.es)
- Mapas: [OpenStreetMap](https://www.openstreetmap.org/copyright)
- Librería de mapas: [Leaflet.js](https://leafletjs.com) (BSD-2)
