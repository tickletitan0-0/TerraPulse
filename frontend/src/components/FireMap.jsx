import { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMap
} from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster/dist/leaflet.markercluster.js";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.heat";

const getMarkerColor = (brightness) => {
  if (brightness > 370) return "#ff0000";
  if (brightness > 350) return "#ff5c00";
  if (brightness > 330) return "#ffb000";
  return "#ffe600";
};

const getRadius = (brightness) => {
  if (brightness > 370) return 10;
  if (brightness > 350) return 8;
  if (brightness > 330) return 6;
  return 4;
};

// FIRMS acq_time is UTC time as HHMM (leading zeros dropped), e.g. 412 -> 04:12, 1842 -> 18:42
const formatAcqTime = (time) => {
  if (time === undefined || time === null || time === "") return "—";
  const str = String(time).padStart(4, "0");
  return `${str.slice(0, 2)}:${str.slice(2)} UTC`;
};

const createPulseIcon = () => L.divIcon({
  className: "",
  html: `
    <div style="
      width: 14px; height: 14px;
      background: #ff0000;
      border-radius: 50%;
      animation: pulse 1.5s ease-in-out infinite;
      box-shadow: 0 0 8px #ff0000;
    "></div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7],
});

function MapRefSetter({ mapRef }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
  }, [map, mapRef]);
  return null;
}

function ClusterLayer({ fires }) {
  const map = useMap();

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 40,
      disableClusteringAtZoom: 6,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: (cluster) => L.divIcon({
        className: "",
        html: `
          <div style="
            width: 36px; height: 36px;
            background: rgba(255, 107, 0, 0.85);
            border: 2px solid rgba(255, 200, 0, 0.6);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 11px;
            font-weight: 700;
            font-family: JetBrains Mono, monospace;
            box-shadow: 0 0 12px rgba(255, 107, 0, 0.5);
          ">${cluster.getChildCount()}</div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    });

    fires.forEach((fire) => {
      const icon = fire.brightness > 370 ? createPulseIcon() : L.divIcon({
        className: "",
        html: `<div style="
          width: ${getRadius(fire.brightness) * 2}px;
          height: ${getRadius(fire.brightness) * 2}px;
          background: ${getMarkerColor(fire.brightness)};
          border-radius: 50%;
          opacity: 0.85;
        "></div>`,
        iconSize: [getRadius(fire.brightness) * 2, getRadius(fire.brightness) * 2],
        iconAnchor: [getRadius(fire.brightness), getRadius(fire.brightness)],
      });

      const marker = L.marker([fire.latitude, fire.longitude], { icon });
      marker.bindPopup(`
        <div style="font-family: JetBrains Mono, monospace;">
          <h3 style="color: #ff6b00; margin-bottom: 8px;">Fire Hotspot</h3>
          <p>Brightness: ${fire.brightness}</p>
          <p>Satellite: ${fire.satellite}</p>
          <p>Date: ${fire.acquisition_date}</p>
          <p>Time: ${formatAcqTime(fire.acquisition_time)}</p>
        </div>
      `);
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    return () => map.removeLayer(clusterGroup);
  }, [fires, map]);

  return null;
}

function HeatLayer({ fires }) {
  const map = useMap();

  useEffect(() => {
    const points = fires.map((f) => [
      f.latitude,
      f.longitude,
      (f.brightness - 300) / 100
    ]);

    const heat = L.heatLayer(points, {
      radius: 18,
      blur: 15,
      maxZoom: 6,
      gradient: {
        0.2: "#ffe600",
        0.5: "#ffb000",
        0.8: "#ff5c00",
        1.0: "#ff0000",
      },
    });

    map.addLayer(heat);
    return () => map.removeLayer(heat);
  }, [fires, map]);

  return null;
}

const TIERS = [
  { key: "high",   label: "High",   color: "#ff4d4d", min: 370, max: Infinity },
  { key: "mid",    label: "Medium", color: "#ff8800", min: 350, max: 370 },
  { key: "low",    label: "Lower",  color: "#ffb000", min: 330, max: 350 },
  { key: "lowest", label: "Lowest", color: "#ffe600", min: 0,   max: 330 },
];

const filterStyle = (active, color) => ({
  padding: "5px 12px",
  borderRadius: "8px",
  border: `1px solid ${active ? color : "rgba(255,255,255,0.1)"}`,
  background: active ? `${color}22` : "rgba(15,23,42,0.85)",
  color: active ? color : "rgba(255,255,255,0.5)",
  fontSize: "0.75rem",
  cursor: "pointer",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(8px)",
  transition: "all 0.2s ease",
});

const modeStyle = (active) => ({
  padding: "5px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(255,255,255,0.15)",
  background: active ? "rgba(255,107,0,0.8)" : "rgba(15,23,42,0.85)",
  color: "white",
  fontSize: "0.75rem",
  cursor: "pointer",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(8px)",
});

function FireMap({ fires = [], mapRef }) {

  const [mode, setMode]       = useState("cluster");
  const [filters, setFilters] = useState({
    high: true, mid: true, low: true, lowest: true
  });

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const filteredFires = fires.filter((f) => {
    if (f.brightness > 370) return filters.high;
    if (f.brightness > 350) return filters.mid;
    if (f.brightness > 330) return filters.low;
    return filters.lowest;
  });

  const highCount   = fires.filter(f => f.brightness > 370).length;
  const midCount    = fires.filter(f => f.brightness > 350 && f.brightness <= 370).length;
  const lowCount    = fires.filter(f => f.brightness > 330 && f.brightness <= 350).length;
  const lowestCount = fires.filter(f => f.brightness <= 330).length;

  return (
    <>
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
      }}>
        {TIERS.map(tier => (
          <button
            key={tier.key}
            onClick={() => toggleFilter(tier.key)}
            style={filterStyle(filters[tier.key], tier.color)}
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
        {mode === "cluster" && <ClusterLayer fires={filteredFires} />}
        {mode === "heat"    && <HeatLayer    fires={filteredFires} />}
      </MapContainer>

      <div className="map-legend">
        <div className="legend-row">
          <span className="legend-dot red"></span>
          <span>High Risk (&gt; 370)</span>
          <span className="legend-count">{highCount.toLocaleString()}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot orange"></span>
          <span>Medium Risk (350–370)</span>
          <span className="legend-count">{midCount.toLocaleString()}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot yellow"></span>
          <span>Lower Risk (330–350)</span>
          <span className="legend-count">{lowCount.toLocaleString()}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: "#ffe600" }}></span>
          <span>Lowest (&lt; 330)</span>
          <span className="legend-count">{lowestCount.toLocaleString()}</span>
        </div>
      </div>

    </div>
    </>
  );
}

export default FireMap;