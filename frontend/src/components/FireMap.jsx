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
import { formatAcqDateLocal, formatAcqTimeLocal } from "../utils/datetime";

export const SEARCH_RADIUS_KM = 100;

// Haversine distance in km between two lat/lon points
export const distanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

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

function ClusterLayer({ fires, onSelectFire }) {
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
      const popupId = `fire-popup-${fire.latitude}-${fire.longitude}-${fire.acquisition_time}`;
      marker.bindPopup(`
        <div style="font-family: JetBrains Mono, monospace;">
          <h3 style="color: #ff6b00; margin-bottom: 8px;">Fire Hotspot</h3>
          <p>Brightness: ${fire.brightness}</p>
          <p>Satellite: ${fire.satellite}</p>
          <p>Date: ${formatAcqDateLocal(fire.acquisition_date, fire.acquisition_time)}</p>
          <p>Time: ${formatAcqTimeLocal(fire.acquisition_date, fire.acquisition_time)}</p>
          <button id="${popupId}" style="
            margin-top: 8px;
            padding: 4px 10px;
            border-radius: 6px;
            border: 1px solid rgba(255,107,0,0.5);
            background: rgba(255,107,0,0.15);
            color: #ff8800;
            font-family: JetBrains Mono, monospace;
            font-size: 0.75rem;
            cursor: pointer;
          ">View details</button>
        </div>
      `);
      marker.on("popupopen", () => {
        const btn = document.getElementById(popupId);
        if (btn) btn.onclick = () => onSelectFire?.(fire);
      });
      clusterGroup.addLayer(marker);
    });

    map.addLayer(clusterGroup);
    return () => map.removeLayer(clusterGroup);
  }, [fires, map, onSelectFire]);

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

export function SearchLocationLayer({ location, radiusKm }) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;

    const pinIcon = L.divIcon({
      className: "",
      html: `
        <div style="
          width: 18px; height: 18px;
          border-radius: 50% 50% 50% 0;
          background: #00cfff;
          transform: rotate(-45deg);
          box-shadow: 0 0 10px rgba(0,207,255,0.8);
          border: 2px solid rgba(255,255,255,0.85);
        "></div>
      `,
      iconSize: [18, 18],
      iconAnchor: [9, 18],
    });

    const marker = L.marker([location.lat, location.lon], { icon: pinIcon, zIndexOffset: 1000 });
    const circle = L.circle([location.lat, location.lon], {
      radius: radiusKm * 1000,
      color: "#00cfff",
      weight: 1.5,
      dashArray: "6 6",
      fillColor: "#00cfff",
      fillOpacity: 0.06,
    });

    marker.addTo(map);
    circle.addTo(map);

    const targetZoom = Math.max(map.getZoom(), 7);
    map.flyTo([location.lat, location.lon], targetZoom, { duration: 1.1 });

    return () => {
      map.removeLayer(marker);
      map.removeLayer(circle);
    };
  }, [location, radiusKm, map]);

  return null;
}

export function LocationSearch({ onSelect, onClear, activeLocation, placeholder = "Search a place…" }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim() || (activeLocation && query === activeLocation.label)) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(debounceRef.current);
  }, [query, activeLocation]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (place) => {
    const label = place.display_name;
    setQuery(label);
    setResults([]);
    setShowResults(false);
    onSelect({ lat: parseFloat(place.lat), lon: parseFloat(place.lon), label });
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    onClear();
  };

  return (
    <div className="location-search" ref={containerRef}>
      <div className="location-search-input-wrapper">
        <span className="location-search-icon">⌖</span>
        <input
          type="text"
          className="location-search-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(true);
          }}
          onFocus={() => setShowResults(true)}
        />
        {loading && <span className="location-search-spinner" />}
        {!loading && (query || activeLocation) && (
          <button className="location-search-clear" onClick={handleClear} title="Clear search">
            ✕
          </button>
        )}
      </div>

      {showResults && results.length > 0 && (
        <div className="location-search-results">
          {results.map((place) => (
            <button
              key={place.place_id}
              className="location-search-result"
              onClick={() => handleSelect(place)}
            >
              {place.display_name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  padding: "5px 12px",
  borderRadius: "8px",
  border: `1px solid ${active ? "rgba(255,107,0,0.7)" : "rgba(255,255,255,0.2)"}`,
  background: active ? "rgba(255,107,0,0.35)" : "rgba(180,180,180,0.1)",
  color: active ? "#ff8800" : "rgba(255,255,255,0.6)",
  fontSize: "0.75rem",
  cursor: "pointer",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  transition: "all 0.2s ease",
});

function FireMap({ fires = [], mapRef, onSelectFire, searchedLocation = null }) {

  const [mode, setMode]           = useState("cluster");
  const [filters, setFilters]     = useState({
    high: true, mid: true, low: true, lowest: true
  });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeSatellites, setActiveSatellites] = useState(null); // null = all
  const [minConfidence, setMinConfidence] = useState(0);

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allSatellites = [...new Set(fires.map(f => f.satellite).filter(Boolean))].sort();
  const hasConfidenceData = fires.some(f => typeof f.confidence === "number");

  const toggleSatellite = (sat) => {
    setActiveSatellites(prev => {
      const current = prev ?? allSatellites;
      const next = current.includes(sat)
        ? current.filter(s => s !== sat)
        : [...current, sat];
      return next;
    });
  };

  const isSatelliteActive = (sat) => (activeSatellites ?? allSatellites).includes(sat);

  const filteredFires = fires.filter((f) => {
    const tierOk =
      f.brightness > 370 ? filters.high :
      f.brightness > 350 ? filters.mid :
      f.brightness > 330 ? filters.low :
      filters.lowest;
    if (!tierOk) return false;

    if (f.satellite && activeSatellites && !activeSatellites.includes(f.satellite)) return false;

    if (hasConfidenceData && typeof f.confidence === "number" && f.confidence < minConfidence) return false;

    if (searchedLocation) {
      const dist = distanceKm(searchedLocation.lat, searchedLocation.lon, f.latitude, f.longitude);
      if (dist > SEARCH_RADIUS_KM) return false;
    }

    return true;
  });

  const highCount   = fires.filter(f => f.brightness > 370).length;
  const midCount    = fires.filter(f => f.brightness > 350 && f.brightness <= 370).length;
  const lowCount    = fires.filter(f => f.brightness > 330 && f.brightness <= 350).length;
  const lowestCount = fires.filter(f => f.brightness <= 330).length;

  return (
    <>
    <div className="map-wrapper" style={{ height: "75vh" }}>

      <div className="map-toolbar">
        <div style={{
          display: "flex",
          gap: "6px",
          alignItems: "center",
          background: "rgba(180,180,180,0.15)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.2)",
          borderRadius: "12px",
          padding: "8px 12px",
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

          {(allSatellites.length > 1 || hasConfidenceData) && (
            <>
              <div style={{ width: "1px", height: "20px", background: "rgba(255,255,255,0.15)", margin: "0 4px" }} />
              <button
                onClick={() => setShowAdvanced(v => !v)}
                style={modeStyle(showAdvanced)}
                title="Satellite source and confidence filters"
              >
                Advanced {showAdvanced ? "▴" : "▾"}
              </button>
            </>
          )}
        </div>

        {showAdvanced && (allSatellites.length > 1 || hasConfidenceData) && (
          <div className="advanced-filter-panel">
            {allSatellites.length > 1 && (
              <div className="advanced-filter-group">
                <span className="advanced-filter-label">Satellite</span>
                <div className="advanced-filter-options">
                  {allSatellites.map(sat => (
                    <button
                      key={sat}
                      onClick={() => toggleSatellite(sat)}
                      style={filterStyle(isSatelliteActive(sat), "#00cfff")}
                    >
                      {sat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasConfidenceData && (
              <div className="advanced-filter-group">
                <span className="advanced-filter-label">
                  Min. confidence: {minConfidence}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="advanced-filter-slider"
                />
              </div>
            )}
          </div>
        )}
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
        {mode === "cluster" && <ClusterLayer fires={filteredFires} onSelectFire={onSelectFire} />}
        {mode === "heat"    && <HeatLayer    fires={filteredFires} />}
        {searchedLocation && <SearchLocationLayer location={searchedLocation} radiusKm={SEARCH_RADIUS_KM} />}
      </MapContainer>

      <div className="map-legend">
        <div className="legend-row">
          <span className="legend-dot red"></span>
          <span>Critical  . &gt; 370 K </span>
          <span className="legend-count">{highCount.toLocaleString()}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot orange"></span>
          <span>Elevated  · 350–370 K</span>
          <span className="legend-count">{midCount.toLocaleString()}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot yellow"></span>
          <span>Moderate  · 330–350 K</span>
          <span className="legend-count">{lowCount.toLocaleString()}</span>
        </div>
        <div className="legend-row">
          <span className="legend-dot" style={{ background: "#ffe600" }}></span>
          <span>Minimal  · &lt; 330 K</span>
          <span className="legend-count">{lowestCount.toLocaleString()}</span>
        </div>
      </div>

    </div>
    </>
  );
}

export default FireMap;