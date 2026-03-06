/* =============================================================
   Geotab Add-In: Gasolineras España
   Fuente precios: API REST MINETUR (Ministerio de Industria)
   https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/
   ============================================================= */

// geotab.addin.gasolinerasEspana = function () {
//     "use strict";

//     var api;
//     var map = null;
//     var vehicleMarkers = [];
//     var stationMarkers = [];
//     var allStations = null;
//     var isLoadingStations = false;

//     var MINETUR_URL = "https://proxy-gasolineras.onrender.com/gasolineras";

//     // ---------- Utilidades ----------

//     function parseES(str) {
//         if (!str || str.trim() === "") return NaN;
//         return parseFloat(str.replace(",", "."));
//     }

//     function formatPrice(val) {
//         return isNaN(val) ? "-" : val.toFixed(3) + " €/L";
//     }

//     function setStatus(msg) {
//         var el = document.getElementById("gs-status");
//         if (el) el.textContent = msg;
//     }

//     function setLoading(active) {
//         var btn = document.getElementById("btn-gasolineras");
//         if (btn) btn.disabled = active;
//         var spinner = document.getElementById("gs-spinner");
//         if (spinner) spinner.style.display = active ? "inline-block" : "none";
//     }

//     // ---------- Mapa ----------

//     function initMap() {
//         if (map) { map.remove(); map = null; }
//         map = L.map("gs-map", { zoomControl: true }).setView([40.4168, -3.7038], 6);

//         L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
//             attribution: "© <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a> | Precios: <a href='https://geoportalgasolineras.es'>MITECO</a>",
//             maxZoom: 18
//         }).addTo(map);

//         // Refrescar gasolineras al mover mapa
//         map.on("moveend", function () {
//             if (allStations) showStationsInView();
//         });
//     }

//     // ---------- Vehículos ----------

//     function loadVehicles() {
//         setStatus("Cargando posición de vehículos...");
//         document.getElementById("btn-vehicles").disabled = true;

//         api.call("Get", { typeName: "DeviceStatusInfo" }, function (statuses) {
//             vehicleMarkers.forEach(function (m) { map.removeLayer(m); });
//             vehicleMarkers = [];

//             var bounds = [];
//             var count = 0;

//             statuses.forEach(function (s) {
//                 if (!s.latitude || !s.longitude) return;
//                 var lat = s.latitude;
//                 var lon = s.longitude;
//                 var isMoving = s.isDeviceCommunicating;

//                 var icon = L.divIcon({
//                     className: "",
//                     html: "<div class='v-marker " + (isMoving ? "v-moving" : "v-stopped") + "'>🚛</div>",
//                     iconSize: [34, 34],
//                     iconAnchor: [17, 17],
//                     popupAnchor: [0, -17]
//                 });

//                 var deviceName = s.device && s.device.id ? s.device.id : "Vehículo";

//                 var popup = "<div class='gs-popup'>" +
//                     "<b>🚛 " + deviceName + "</b><br>" +
//                     "<small>📍 " + lat.toFixed(5) + ", " + lon.toFixed(5) + "</small><br>" +
//                     "<small>Estado: " + (isMoving ? "🟢 En movimiento" : "🔴 Parado") + "</small>" +
//                     "</div>";

//                 var marker = L.marker([lat, lon], { icon: icon }).bindPopup(popup);
//                 marker.addTo(map);
//                 vehicleMarkers.push(marker);
//                 bounds.push([lat, lon]);
//                 count++;
//             });

//             if (bounds.length > 0) {
//                 map.fitBounds(bounds, { padding: [80, 80], maxZoom: 12 });
//             }

//             document.getElementById("btn-vehicles").disabled = false;
//             document.getElementById("btn-gasolineras").disabled = false;
//             document.getElementById("gs-count-vehicles").textContent = count;
//             setStatus(count + " vehículos cargados. Ahora carga gasolineras ⛽");

//         }, function (err) {
//             document.getElementById("btn-vehicles").disabled = false;
//             setStatus("Error vehículos: " + (err.message || err));
//         });
//     }

//     // ---------- Gasolineras ----------

//     function loadGasStations() {
//         if (isLoadingStations) return;

//         if (allStations) {
//             showStationsInView();
//             return;
//         }

//         isLoadingStations = true;
//         setLoading(true);
//         setStatus("⏳ Descargando datos del Ministerio de Industria (MITECO)...");

//         var xhr = new XMLHttpRequest();
//         xhr.open("GET", MINETUR_URL, true);
//         xhr.setRequestHeader("Accept", "application/json");

//         xhr.onreadystatechange = function () {
//             if (xhr.readyState !== 4) return;
//             isLoadingStations = false;
//             setLoading(false);

//             if (xhr.status === 200) {
//                 try {
//                     var data = JSON.parse(xhr.responseText);
//                     allStations = data.ListaEESSPrecio || [];
//                     document.getElementById("gs-count-stations").textContent = allStations.length;
//                     setStatus("✅ " + allStations.length + " gasolineras cargadas. Mostrando zona visible...");
//                     showStationsInView();
//                 } catch (e) {
//                     setStatus("❌ Error al parsear datos: " + e.message);
//                 }
//             } else if (xhr.status === 0) {
//                 setStatus("❌ Error CORS: El navegador bloqueó la petición al Ministerio. Ver instrucciones abajo.");
//                 document.getElementById("gs-cors-warning").style.display = "block";
//             } else {
//                 setStatus("❌ Error API Ministerio: HTTP " + xhr.status);
//             }
//         };

//         xhr.onerror = function () {
//             isLoadingStations = false;
//             setLoading(false);
//             setStatus("❌ Error de red / CORS. Ver instrucciones abajo.");
//             document.getElementById("gs-cors-warning").style.display = "block";
//         };

//         xhr.send();
//     }

//     function getPriceColor(diesel) {
//         if (isNaN(diesel)) return "#94a3b8";
//         if (diesel <= 1.38) return "#16a34a";
//         if (diesel <= 1.48) return "#65a30d";
//         if (diesel <= 1.55) return "#d97706";
//         if (diesel <= 1.65) return "#ea580c";
//         return "#dc2626";
//     }

//     function showStationsInView() {
//         stationMarkers.forEach(function (m) { map.removeLayer(m); });
//         stationMarkers = [];

//         var bounds = map.getBounds();
//         var ne = bounds.getNorthEast();
//         var sw = bounds.getSouthWest();
//         var MAX_MARKERS = 300;

//         var filtered = [];
//         allStations.forEach(function (s) {
//             var lat = parseES(s["Latitud"]);
//             var lon = parseES(s["Longitud (WGS84)"]);
//             if (isNaN(lat) || isNaN(lon)) return;
//             if (lat < sw.lat || lat > ne.lat || lon < sw.lng || lon > ne.lng) return;
//             s._lat = lat;
//             s._lon = lon;
//             s._diesel = parseES(s["Precio Gasoleo A"]);
//             s._g95 = parseES(s["Precio Gasolina 95 E5"]);
//             s._g98 = parseES(s["Precio Gasolina 98 E5"]);
//             s._glp = parseES(s["Precio Gases licuados del petróleo"]);
//             s._gnc = parseES(s["Precio Gas Natural Comprimido"]);
//             filtered.push(s);
//         });

//         // Ordenar por diesel más barato
//         filtered.sort(function (a, b) {
//             if (isNaN(a._diesel) && isNaN(b._diesel)) return 0;
//             if (isNaN(a._diesel)) return 1;
//             if (isNaN(b._diesel)) return -1;
//             return a._diesel - b._diesel;
//         });

//         var toShow = filtered.slice(0, MAX_MARKERS);

//         toShow.forEach(function (s) {
//             var color = getPriceColor(s._diesel);
//             var label = isNaN(s._diesel) ? "?" : s._diesel.toFixed(3) + "€";

//             var icon = L.divIcon({
//                 className: "",
//                 html: "<div class='gs-marker' style='background:" + color + "'>" + label + "</div>",
//                 iconSize: [68, 22],
//                 iconAnchor: [34, 11],
//                 popupAnchor: [0, -14]
//             });

//             var rotulo = s["Rótulo"] || "Gasolinera";
//             var dir = (s["Dirección"] || "") + ", " + (s["Municipio"] || "") + " (" + (s["Provincia"] || "") + ")";
//             var horario = s["Horario"] || "No disponible";
//             var fecha = s["Fecha"] || "";

//             var popup = "<div class='gs-popup'>" +
//                 "<div class='gs-popup-title'>⛽ " + rotulo + "</div>" +
//                 "<div class='gs-popup-addr'>📍 " + dir + "</div>" +
//                 "<table class='gs-price-table'>" +
//                 (isNaN(s._diesel) ? "" : "<tr><td>🔵 Gasóleo A</td><td class='price-val'>" + formatPrice(s._diesel) + "</td></tr>") +
//                 (isNaN(s._g95) ? "" : "<tr><td>🟢 Gasolina 95</td><td class='price-val'>" + formatPrice(s._g95) + "</td></tr>") +
//                 (isNaN(s._g98) ? "" : "<tr><td>🟡 Gasolina 98</td><td class='price-val'>" + formatPrice(s._g98) + "</td></tr>") +
//                 (isNaN(s._glp) ? "" : "<tr><td>🟣 GLP/Autogás</td><td class='price-val'>" + formatPrice(s._glp) + "</td></tr>") +
//                 (isNaN(s._gnc) ? "" : "<tr><td>⚪ GNC</td><td class='price-val'>" + formatPrice(s._gnc) + "</td></tr>") +
//                 "</table>" +
//                 "<div class='gs-popup-horario'>🕐 " + horario + "</div>" +
//                 (fecha ? "<div class='gs-popup-fecha'>📅 Actualizado: " + fecha + "</div>" : "") +
//                 "</div>";

//             var marker = L.marker([s._lat, s._lon], { icon: icon }).bindPopup(popup);
//             marker.addTo(map);
//             stationMarkers.push(marker);
//         });

//         var extra = filtered.length > MAX_MARKERS ? " (máx " + MAX_MARKERS + " mostradas, haz zoom)" : "";
//         setStatus("⛽ " + stationMarkers.length + " gasolineras en vista" + extra + " — ordenadas por Gasóleo A más barato");
//         document.getElementById("gs-count-view").textContent = stationMarkers.length;
//     }

//     // ---------- UI ----------

//     function buildUI() {
//         var container = document.getElementById("gasolineras-container");
//         if (!container) return;

//         container.innerHTML =
//             "<div id='gs-toolbar'>" +
//                 "<button id='btn-vehicles' class='gs-btn'>🔄 Vehículos</button>" +
//                 "<button id='btn-gasolineras' class='gs-btn gs-btn-primary' disabled>⛽ Cargar Gasolineras</button>" +
//                 "<button id='btn-refresh-view' class='gs-btn gs-btn-secondary'>🗺️ Refrescar vista</button>" +
//                 "<div id='gs-spinner' class='gs-spinner' style='display:none'></div>" +
//                 "<span id='gs-status' class='gs-status'>Iniciando mapa...</span>" +
//             "</div>" +

//             "<div id='gs-stats'>" +
//                 "<span class='gs-stat'>🚛 <b id='gs-count-vehicles'>0</b> vehículos</span>" +
//                 "<span class='gs-stat'>⛽ <b id='gs-count-stations'>0</b> estaciones España</span>" +
//                 "<span class='gs-stat'>👁️ <b id='gs-count-view'>0</b> en vista</span>" +
//             "</div>" +

//             "<div id='gs-legend'>" +
//                 "<span class='leg' style='color:#16a34a'>● &lt;1.38€</span>" +
//                 "<span class='leg' style='color:#65a30d'>● 1.38-1.48€</span>" +
//                 "<span class='leg' style='color:#d97706'>● 1.48-1.55€</span>" +
//                 "<span class='leg' style='color:#ea580c'>● 1.55-1.65€</span>" +
//                 "<span class='leg' style='color:#dc2626'>● &gt;1.65€</span>" +
//                 "<small> — Precio Gasóleo A (Fuente: MITECO · actualización diaria)</small>" +
//             "</div>" +

//             "<div id='gs-map'></div>" +

//             "<div id='gs-cors-warning' style='display:none'>" +
//                 "<b>⚠️ Error CORS:</b> La API del Ministerio bloquea peticiones directas desde el navegador.<br>" +
//                 "Soluciones: (1) Despliega un <b>proxy backend simple</b> (Node/Python) que reenvíe la petición.<br>" +
//                 "(2) Configura tu servidor Geotab Add-In con un proxy CORS.<br>" +
//                 "Endpoint real: <code>" + MINETUR_URL + "</code><br>" +
//                 "Respuesta JSON: campo <code>ListaEESSPrecio[]</code> con Latitud, Longitud (WGS84), Precio Gasoleo A, etc." +
//             "</div>" +

//             "<div id='gs-footer'>Datos de precios: " +
//                 "<a href='https://geoportalgasolineras.es' target='_blank'>geoportalgasolineras.es</a> · " +
//                 "<a href='https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/help' target='_blank'>API REST MITECO</a>" +
//             "</div>";

//         document.getElementById("btn-vehicles").onclick = loadVehicles;
//         document.getElementById("btn-gasolineras").onclick = loadGasStations;
//         document.getElementById("btn-refresh-view").onclick = function () {
//             if (allStations) showStationsInView();
//         };
//     }

//     function loadLeafletAndStart() {
//         if (typeof L !== "undefined") {
//             initMap();
//             loadVehicles();
//             return;
//         }
//         var link = document.createElement("link");
//         link.rel = "stylesheet";
//         link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
//         document.head.appendChild(link);

//         var script = document.createElement("script");
//         script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
//         script.onload = function () {
//             initMap();
//             loadVehicles();
//         };
//         document.head.appendChild(script);
//     }

//     // ---------- Ciclo de vida del Add-In ----------

//     return {
//         initialize: function (apiRef, state, callback) {
//             api = apiRef;
//             callback();
//         },

//         focus: function (apiRef, state) {
//             api = apiRef;
//             buildUI();
//             loadLeafletAndStart();
//         },

//         blur: function (apiRef, state) {
//             if (map) { map.remove(); map = null; }
//         }
//     };
// };
/* =============================================================
   Geotab Add-In: Gasolineras España
   Modo: customPage — Geotab inyecta la API automáticamente
   ============================================================= */

// ============================================================
// Geotab Add-In: Gasolineras España
// Patron identico al Add-In AdBlue — API inyectada por Geotab
// ============================================================

// Geotab Add-In: Gasolineras España
// Mismo patrón exacto que el Add-In AdBlue

// app.js — solo sirve para que Geotab llame a focus(api)
// y pasar la API al index.html que ya está cargado

geotab.addin.gasolineras = function(api, state) {
    return {
        initialize: function(api, state, callback) {
            callback();
        },
        focus: function(api, state) {
            // Guardamos la API en window para que el index.html la use
            window.api = api;
            // Si el botón ya existe (HTML ya cargado), cargamos vehículos
            var btn = document.getElementById("gs-bv");
            if (btn) {
                // Disparar carga automática de vehículos
                btn.click();
            }
        },
        blur: function() {
            window.api = null;
        }
    };
};
