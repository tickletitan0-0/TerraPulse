import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";
import { SearchLocationLayer, distanceKm, SEARCH_RADIUS_KM } from "./FireMap";

const getMagColor = (mag) => {
  if (mag >= 6.0) return "#4c1d95";
  if (mag >= 5.0) return "#7c3aed";
  if (mag >= 4.0) return "#a78bfa";
  if (mag >= 3.0) return "#c4b5fd";
  return "#e0d4fc";
};

const getMagRadius = (mag) => {
  if (mag >= 6.0) return 14;
  if (mag >= 5.0) return 10;
  if (mag >= 4.0) return 7;
  if (mag >= 3.0) return 5;
  return 3;
};

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function ClusterLayer({ quakes, onSelectQuake }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 40,
      disableClusteringAtZoom: 5,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => L.divIcon({
        className: "",
        html: `
          <div style="
            width: 36px; height: 36px;
            background: rgba(124, 58, 237, 0.85);
            border: 2px solid rgba(167, 139, 250, 0.6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 700;
            font-family: JetBrains Mono, monospace;
            box-shadow: 0 0 12px rgba(124, 58, 237, 0.5);
          ">${cluster.getChildCount()}</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    });

    quakes.forEach((quake) => {
      const r = getMagRadius(quake.magnitude);
      const icon = L.divIcon({
        className: "",
        html: `<div style="
          width: ${r * 2}px;
          height: ${r * 2}px;
          background: ${getMagColor(quake.magnitude)};
          border-radius: 50%;
          opacity: 0.85;
          box-shadow: 0 0 6px ${getMagColor(quake.magnitude)};
        "></div>`,
        iconSize: [r * 2, r * 2],
        iconAnchor: [r, r],
        popupAnchor: [0, -r],
      });

      const marker = L.marker([quake.latitude, quake.longitude], { icon });
      const popupId = `quake-popup-${quake.latitude}-${quake.longitude}-${quake.time ?? quake.place ?? ""}`;
      marker.bindPopup(
        `
        <div style="font-family: JetBrains Mono, monospace;">
          <h3 style="color: #a78bfa; margin-bottom: 8px;">Earthquake</h3>
          <p>Magnitude: ${quake.magnitude}</p>
          <p>Depth: ${quake.depth} km</p>
          <p>Location: ${quake.place ?? "—"}</p>
          <p>Tsunami: ${quake.tsunami ? "⚠️ Yes" : "No"}</p>
          <button id="${popupId}" style="
            margin-top: 8px;
            padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid rgba(124,58,237,0.5);
            background: rgba(124,58,237,0.15);
            color: #a78bfa;
            font-family: JetBrains Mono, monospace;
            font-size: 0.75rem;
            cursor: pointer;
          ">View details</button>
        </div>
      `,
        { autoPan: true, autoPanPadding: [40, 40] }
      );
      marker.on("popupopen", () => {
        const btn = document.getElementById(popupId);
        if (btn) btn.onclick = () => onSelectQuake?.(quake);
      });
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    return () => map.removeLayer(clusterGroup);
  }, [quakes, map, onSelectQuake]);

  return null;
}

function HeatLayer({ quakes }) {
  const map = useMap();

  useEffect(() => {
    const points = quakes.map((q) => [
      q.latitude,
      q.longitude,
      q.magnitude / 10
    ]);

    const heat = L.heatLayer(points, {
      radius: 20,
      blur: 18,
      maxZoom: 5,
      gradient: {
        0.2: "#e0d4fc",
        0.5: "#a78bfa",
        0.8: "#7c3aed",
        1.0: "#4c1d95",
      },
    });

    map.addLayer(heat);
    return () => map.removeLayer(heat);
  }, [quakes, map]);

  return null;
}

const TIERS = [
  { key: "major",    label: "Major",    color: "#4c1d95", min: 6.0, range: "Magnitude 6.0+" },
  { key: "strong",   label: "Strong",   color: "#7c3aed", min: 5.0, range: "Magnitude 5.0–5.9" },
  { key: "moderate", label: "Moderate", color: "#a78bfa", min: 4.0, range: "Magnitude 4.0–4.9" },
  { key: "minor",    label: "Minor",    color: "#c4b5fd", min: 3.0, range: "Magnitude 3.0–3.9" },
  { key: "micro",    label: "Micro",    color: "#e0d4fc", min: 0,   range: "Magnitude < 3.0" },
];

const filterStyle = (active, color) => ({
  padding: "5px 10px",
  borderRadius: "8px",
  border: `1px solid ${active ? color : "rgba(255,255,255,0.2)"}`,
  background: active ? `${color}33` : "rgba(180,180,180,0.1)",
  color: active ? color : "rgba(255,255,255,0.6)",
  fontSize: "0.75rem",
  cursor: "pointer",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  transition: "all 0.2s ease",
});

const modeStyle = (active) => ({
  padding: "5px 10px",
  borderRadius: "8px",
  border: `1px solid ${active ? "rgba(124,58,237,0.7)" : "rgba(255,255,255,0.2)"}`,
  background: active ? "rgba(124,58,237,0.35)" : "rgba(180,180,180,0.1)",
  color: active ? "#a78bfa" : "rgba(255,255,255,0.6)",
  fontSize: "0.75rem",
  cursor: "pointer",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  transition: "all 0.2s ease",
});

function EarthquakeMap({ quakes = [], mapRef, onSelectQuake, searchedLocation = null }) {

  const [mode, setMode] = useState("cluster");
  const [filters, setFilters] = useState({
    major: true, strong: true, moderate: true, minor: true, micro: true
  });

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredQuakes = quakes.filter((q) => {
    const tierOk =
      q.magnitude >= 6.0 ? filters.major :
      q.magnitude >= 5.0 ? filters.strong :
      q.magnitude >= 4.0 ? filters.moderate :
      q.magnitude >= 3.0 ? filters.minor :
      filters.micro;
    if (!tierOk) return false;

    if (searchedLocation) {
      const dist = distanceKm(searchedLocation.lat, searchedLocation.lon, q.latitude, q.longitude);
      if (dist > SEARCH_RADIUS_KM) return false;
    }

    return true;
  });

  return (
    <div className="map-wrapper" style={{ height: "75vh" }}>

      <div style={{
        position: "absolute",
        top: 12,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        gap: "6px",
        alignItems: "center",
        flexWrap: "wrap",
        justifyContent: "center",
        maxWidth: "96%",
      }}>
        {TIERS.map(tier => (
          <button
            key={tier.key}
            onClick={() => toggleFilter(tier.key)}
            style={filterStyle(filters[tier.key], tier.color)}
            title={tier.range}
          >
            {tier.label}
          </button>
        ))}
        <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
        <button onClick={() => setMode("cluster")} style={modeStyle(mode === "cluster")}>Cluster</button>
        <button onClick={() => setMode("heat")}    style={modeStyle(mode === "heat")}>Heatmap</button>
      </div>

      <MapContainer
        center={[20, -30]}
        zoom={2}
        minZoom={2}
        maxBounds={[[-90, -180], [90, 180]]}
        maxBoundsViscosity={1.0}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />
        <MapRefSetter mapRef={mapRef} />
        {mode === "cluster" && <ClusterLayer quakes={filteredQuakes} onSelectQuake={onSelectQuake} />}
        {mode === "heat"    && <HeatLayer    quakes={filteredQuakes} />}
        {searchedLocation && <SearchLocationLayer location={searchedLocation} radiusKm={SEARCH_RADIUS_KM} />}
      </MapContainer>

      <div className="map-legend">
        {TIERS.map(tier => (
          <div className="legend-row" key={tier.key}>
            <span className="legend-dot" style={{ background: tier.color }}></span>
            <span>{tier.label}</span>
            <span className="legend-count">
              {quakes.filter(q =>
                tier.key === "micro"
                  ? q.magnitude < 3.0
                  : q.magnitude >= tier.min && (tier.min === 6.0 || q.magnitude < tier.min + 1)
              ).length.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

    </div>
  );
}

export default EarthquakeMap;