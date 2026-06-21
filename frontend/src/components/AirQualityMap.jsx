import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";
import { SearchLocationLayer, distanceKm, SEARCH_RADIUS_KM } from "./FireMap";

// AQI colour scale following US EPA breakpoints
const getAqiColor = (aqi) => {
  if (aqi > 300) return "#7e0023";  // Hazardous
  if (aqi > 200) return "#8f3f97";  // Very Unhealthy
  if (aqi > 150) return "#ff0000";  // Unhealthy
  if (aqi > 100) return "#ff7e00";  // Unhealthy for Sensitive Groups
  if (aqi > 50)  return "#ffff00";  // Moderate
  return "#00e400";                  // Good
};

const getAqiRadius = (aqi) => {
  if (aqi > 200) return 14;
  if (aqi > 150) return 11;
  if (aqi > 100) return 8;
  if (aqi > 50)  return 6;
  return 4;
};

const getAqiLabel = (aqi) => {
  if (aqi > 300) return "Hazardous";
  if (aqi > 200) return "Very Unhealthy";
  if (aqi > 150) return "Unhealthy";
  if (aqi > 100) return "Sensitive Groups";
  if (aqi > 50)  return "Moderate";
  return "Good";
};

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function ClusterLayer({ cities, onSelectCity }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 40,
      disableClusteringAtZoom: 5,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) =>
        L.divIcon({
          className: "",
          html: `<div style="
            width: 36px; height: 36px;
            background: rgba(0,207,220,0.85);
            border: 2px solid rgba(0,180,200,0.6);
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            color: #000; font-size: 11px; font-weight: 700;
            font-family: JetBrains Mono, monospace;
            box-shadow: 0 0 12px rgba(0,207,220,0.5);
          ">${cluster.getChildCount()}</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
    });

    cities.forEach((city) => {
      const r = getAqiRadius(city.aqi);
      const color = getAqiColor(city.aqi);
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width: ${r * 2}px; height: ${r * 2}px;
          background: ${color};
          border-radius: 50%;
          opacity: 0.88;
          box-shadow: 0 0 6px ${color};
        "></div>`,
        iconSize: [r * 2, r * 2],
        iconAnchor: [r, r],
        popupAnchor: [0, -r],
      });

      const marker = L.marker([city.latitude, city.longitude], { icon });
      const popupId = `aq-popup-${city.latitude}-${city.longitude}-${city.station_name ?? city.aqi}`;

      marker.bindPopup(
        `<div style="font-family: JetBrains Mono, monospace;">
          <h3 style="color: #00cfdc; margin-bottom: 8px;">${city.station_name ?? "Station"}</h3>
          <p>AQI: <strong style="color:${color}">${city.aqi} — ${getAqiLabel(city.aqi)}</strong></p>
          <p>PM2.5: ${city.pm25 ?? "—"} µg/m³</p>
          <p>PM10: ${city.pm10 ?? "—"} µg/m³</p>
          <p>Dominant: ${city.dominant_pollutant ?? "—"}</p>
          <button id="${popupId}" style="
            margin-top: 8px; padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid rgba(0,207,220,0.5);
            background: rgba(0,207,220,0.12);
            color: #00cfdc;
            font-family: JetBrains Mono, monospace;
            font-size: 0.75rem; cursor: pointer;
          ">View details</button>
        </div>`,
        { autoPan: true, autoPanPadding: [40, 40] }
      );
      marker.on("popupopen", () => {
        const btn = document.getElementById(popupId);
        if (btn) btn.onclick = () => onSelectCity?.(city);
      });
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    return () => map.removeLayer(clusterGroup);
  }, [cities, map, onSelectCity]);

  return null;
}

function HeatLayer({ cities }) {
  const map = useMap();
  useEffect(() => {
    const points = cities.map((c) => [c.latitude, c.longitude, c.aqi / 500]);
    const heat = L.heatLayer(points, {
      radius: 22,
      blur: 18,
      maxZoom: 5,
      gradient: {
        0.0: "#00e400",
        0.3: "#ffff00",
        0.5: "#ff7e00",
        0.7: "#ff0000",
        0.9: "#8f3f97",
        1.0: "#7e0023",
      },
    });
    map.addLayer(heat);
    return () => map.removeLayer(heat);
  }, [cities, map]);
  return null;
}

const TIERS = [
  { key: "hazardous",  label: "Hazardous",       color: "#7e0023", min: 301, max: Infinity },
  { key: "veryBad",   label: "Very Unhealthy",   color: "#8f3f97", min: 201, max: 300 },
  { key: "unhealthy", label: "Unhealthy",         color: "#ff0000", min: 151, max: 200 },
  { key: "sensitive", label: "Sensitive Groups",  color: "#ff7e00", min: 101, max: 150 },
  { key: "moderate",  label: "Moderate",          color: "#ffff00", min: 51,  max: 100 },
  { key: "good",      label: "Good",              color: "#00e400", min: 0,   max: 50 },
];

const filterStyle = (active, color) => ({
  padding: "5px 10px",
  borderRadius: "8px",
  border: `1px solid ${active ? color : "rgba(255,255,255,0.2)"}`,
  background: active ? `${color}28` : "rgba(180,180,180,0.08)",
  color: active ? color : "rgba(255,255,255,0.55)",
  fontSize: "0.72rem",
  cursor: "pointer",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  transition: "all 0.2s ease",
});

const modeStyle = (active) => ({
  padding: "5px 10px",
  borderRadius: "8px",
  border: `1px solid ${active ? "rgba(0,207,220,0.7)" : "rgba(255,255,255,0.2)"}`,
  background: active ? "rgba(0,207,220,0.18)" : "rgba(180,180,180,0.08)",
  color: active ? "#00cfdc" : "rgba(255,255,255,0.55)",
  fontSize: "0.75rem",
  cursor: "pointer",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  transition: "all 0.2s ease",
});

function AirQualityMap({ cities = [], mapRef, onSelectCity, searchedLocation = null }) {
  const [mode, setMode] = useState("cluster");
  const [filters, setFilters] = useState({
    hazardous: true, veryBad: true, unhealthy: true,
    sensitive: true, moderate: true, good: true,
  });

  const toggleFilter = (key) =>
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));

  const filteredCities = cities.filter((c) => {
    const tier =
      c.aqi > 300 ? "hazardous" :
      c.aqi > 200 ? "veryBad" :
      c.aqi > 150 ? "unhealthy" :
      c.aqi > 100 ? "sensitive" :
      c.aqi > 50  ? "moderate" : "good";

    if (!filters[tier]) return false;

    if (searchedLocation) {
      const dist = distanceKm(
        searchedLocation.lat, searchedLocation.lon,
        c.latitude, c.longitude
      );
      if (dist > SEARCH_RADIUS_KM) return false;
    }

    return true;
  });

  return (
    <div className="map-wrapper" style={{ height: "75vh" }}>
      <div style={{
        position: "absolute", top: 12, left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex", gap: "6px", alignItems: "center",
        flexWrap: "wrap", justifyContent: "center", maxWidth: "96%",
      }}>
        {TIERS.map((tier) => (
          <button
            key={tier.key}
            onClick={() => toggleFilter(tier.key)}
            style={filterStyle(filters[tier.key], tier.color)}
            title={`AQI ${tier.min}–${tier.max === Infinity ? "500+" : tier.max}`}
          >
            {tier.label}
          </button>
        ))}
        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.12)", margin: "0 4px" }} />
        <button onClick={() => setMode("cluster")} style={modeStyle(mode === "cluster")}>Cluster</button>
        <button onClick={() => setMode("heat")}    style={modeStyle(mode === "heat")}>Heatmap</button>
      </div>

      <MapContainer
        center={[20, 0]}
        zoom={2}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
        <MapRefSetter mapRef={mapRef} />
        {mode === "cluster" && <ClusterLayer cities={filteredCities} onSelectCity={onSelectCity} />}
        {mode === "heat"    && <HeatLayer    cities={filteredCities} />}
        {searchedLocation  && <SearchLocationLayer location={searchedLocation} radiusKm={SEARCH_RADIUS_KM} />}
      </MapContainer>

      <div className="map-legend">
        {TIERS.map((tier) => (
          <div className="legend-row" key={tier.key}>
            <span className="legend-dot" style={{ background: tier.color }} />
            <span style={{ fontSize: "0.78rem" }}>{tier.label}</span>
            <span className="legend-count">
              {cities.filter((c) => c.aqi > tier.min - 1 && c.aqi <= (tier.max === Infinity ? 9999 : tier.max)).length.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default AirQualityMap;
