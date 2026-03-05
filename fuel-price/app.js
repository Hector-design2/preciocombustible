/* global geotab */
/*
  Add-In: PreciosCombustibleES
  - Consume la API pública de precios de carburantes (MITECO).
  - Muestra mapa con Leaflet y tabla con estaciones ordenadas por precio.
  - Funcionalidad adicional: buscar, filtrar por radio, localizar gasolinera más barata cerca de la flota.
  NOTA: Ajusta MITECO_URL si el endpoint cambia o si usas un proxy.
*/

(function () {
  const MITECO_URL =
    "https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/";

  let map;
  let markersLayer;
  let currentFuelField = "Precio Gasolina 95 E5";
  let allStations = [];

  function initMap() {
    map = L.map("map").setView([40.4168, -3.7038], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18,
      attribution: "© OpenStreetMap contributors"
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
  }

  function clearMap() {
    markersLayer.clearLayers();
  }

  function parseCoord(value) {
    if (!value) return NaN;
    return parseFloat(String(value).replace(",", "."));
  }

  function addStationMarker(station, price, vehiclePos) {
    const lat = parseCoord(station["Latitud"]);
    const lon = parseCoord(station["Longitud (WGS84)"]);
    if (isNaN(lat) || isNaN(lon)) return;

    const marker = L.marker([lat, lon]);
    const popup = `
      <strong>${station["Rótulo"]}</strong><br/>
      ${station["Dirección"] || ""}<br/>
      ${station["Municipio"]} (${station["Provincia"]})<br/>
      <strong>${price} €/L</strong>
    `;
    marker.bindPopup(popup);
    markersLayer.addLayer(marker);
  }

  function fillTable(stations, fuelField, centerPos, radiusKm, searchTerm) {
    const tbody = document.getElementById("stationsTableBody");
    tbody.innerHTML = "";

    const filtered = stations
      .filter((st) => {
        const priceStr = st[fuelField];
        if (!priceStr || priceStr.trim() === "") return false;
        if (searchTerm) {
          const s = (st["Rótulo"] + " " + st["Municipio"] + " " + st["Provincia"]).toLowerCase();
          if (!s.includes(searchTerm.toLowerCase())) return false;
        }
        if (centerPos && radiusKm) {
          const lat = parseCoord(st["Latitud"]);
          const lon = parseCoord(st["Longitud (WGS84)"]);
          if (isNaN(lat) || isNaN(lon)) return false;
          const d = haversineKm(centerPos.lat, centerPos.lon, lat, lon);
          if (d > radiusKm) return false;
          st._distance = d;
        } else {
          st._distance = null;
        }
        return true;
      })
      .map((st) => {
        const price = parseFloat(st[fuelField].replace(",", "."));
        return { st, price };
      })
      .sort((a, b) => a.price - b.price);

    filtered.forEach(({ st, price }) => {
      const tr = document.createElement("tr");
      const dist = st._distance !== null ? st._distance.toFixed(2) : "";
      tr.innerHTML = `
        <td>${st["Rótulo"]}</td>
        <td>${st["Municipio"]}</td>
        <td>${st["Provincia"]}</td>
        <td>${price.toFixed(3)}</td>
        <td>${dist}</td>
      `;
      tbody.appendChild(tr);
    });

    // Pintar marcadores de los primeros 200 resultados para evitar sobrecarga
    clearMap();
    filtered.slice(0, 200).forEach(({ st, price }) => addStationMarker(st, price));
  }

  function haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  async function loadFuelData(fuelField) {
    try {
      const res = await fetch(MITECO_URL);
      const data = await res.json();
      allStations = data.ListaEESSPrecio || [];
      const searchTerm = document.getElementById("searchInput").value.trim();
      const radiusKm = parseFloat(document.getElementById("radiusKm").value) || null;
      // No centerPos por defecto; se usará al pedir "más barata cerca de flota"
      fillTable(allStations, fuelField, null, radiusKm, searchTerm);
    } catch (e) {
      console.error("Error cargando datos MITECO:", e);
      alert("Error cargando datos de precios. Revisa la consola.");
    }
  }

  function setupUI() {
    const fuelSelect = document.getElementById("fuelType");
    const refreshBtn = document.getElementById("refreshBtn");
    const searchInput = document.getElementById("searchInput");
    const nearestBtn = document.getElementById("nearestBtn");

    fuelSelect.addEventListener("change", () => {
      currentFuelField = fuelSelect.value;
      loadFuelData(currentFuelField);
    });

    refreshBtn.addEventListener("click", () => loadFuelData(currentFuelField));
    searchInput.addEventListener("input", () => loadFuelData(currentFuelField));

    nearestBtn.addEventListener("click", async () => {
      // Obtener posición media de la flota desde Geotab
      try {
        const devices = await apiGetDevices();
        if (!devices || devices.length === 0) {
          alert("No hay dispositivos en la cuenta o no se han podido obtener.");
          return;
        }
        // Calcular posición media de los últimos LogRecord con posición
        const positions = await Promise.all(
          devices.map((d) => apiGetLastPosition(d.id)).catch(() => null)
        );
        const valid = positions.filter(Boolean);
        if (valid.length === 0) {
          alert("No se han obtenido posiciones válidas de los dispositivos.");
          return;
        }
        const avg = valid.reduce(
          (acc, p) => {
            acc.lat += p.latitude;
            acc.lon += p.longitude;
            return acc;
          },
          { lat: 0, lon: 0 }
        );
        avg.lat /= valid.length;
        avg.lon /= valid.length;
        // Buscar la gasolinera más barata dentro del radio
        const radiusKm = parseFloat(document.getElementById("radiusKm").value) || 10;
        const candidates = allStations
          .filter((st) => {
            const priceStr = st[currentFuelField];
            if (!priceStr || priceStr.trim() === "") return false;
            const lat = parseCoord(st["Latitud"]);
            const lon = parseCoord(st["Longitud (WGS84)"]);
            if (isNaN(lat) || isNaN(lon)) return false;
            const d = haversineKm(avg.lat, avg.lon, lat, lon);
            return d <= radiusKm;
          })
          .map((st) => ({ st, price: parseFloat(st[currentFuelField].replace(",", ".")) }))
          .sort((a, b) => a.price - b.price);

        if (candidates.length === 0) {
          alert("No se han encontrado gasolineras en el radio especificado.");
          return;
        }

        const best = candidates[0];
        map.setView(
          [parseCoord(best.st["Latitud"]), parseCoord(best.st["Longitud (WGS84)"])],
          13
        );
        L.popup()
          .setLatLng([parseCoord(best.st["Latitud"]), parseCoord(best.st["Longitud (WGS84)"])])
          .setContent(
            `<strong>${best.st["Rótulo"]}</strong><br/>${best.st["Municipio"]} (${best.st["Provincia"]})<br/><strong>${best.price.toFixed(3)} €/L</strong>`
          )
          .openOn(map);
      } catch (err) {
        console.error(err);
        alert("Error al calcular la gasolinera más barata cerca de la flota.");
      }
    });
  }

  // Helpers para llamadas a la API de Geotab (usadas por el Add-In)
  function apiGetDevices() {
    return new Promise((resolve, reject) => {
      try {
        geotab.api.call("Get", { typeName: "Device" }, (devices) => {
          resolve(devices || []);
        }, (err) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  function apiGetLastPosition(deviceId) {
    return new Promise((resolve, reject) => {
      try {
        geotab.api.call("Get", {
          typeName: "LogRecord",
          search: {
            deviceSearch: { id: deviceId },
            fromDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString()
          },
          resultsLimit: 1,
          sort: { field: "dateTime", direction: "desc" }
        }, (records) => {
          if (!records || records.length === 0) return resolve(null);
          const r = records[0];
          if (r.latitude && r.longitude) {
            resolve({ latitude: r.latitude, longitude: r.longitude });
          } else {
            resolve(null);
          }
        }, (err) => reject(err));
      } catch (e) {
        reject(e);
      }
    });
  }

  // Registro del Add-In en Geotab
  geotab.addin.fuelPricesES = function () {
    return {
      initialize: function (api, state, callback) {
        // Exponer api para funciones internas
        window.geotab = window.geotab || {};
        window.geotab.api = api;
        initMap();
        setupUI();
        loadFuelData(currentFuelField);
        callback();
      },
      focus: function (api, state) {
        // No-op por ahora
      },
      blur: function () {
        // No-op por ahora
      }
    };
  };
})();
