import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import AirQualityMap from "../components/AirQualityMap";
import AirQualityDetailPanel from "../components/AirQualityDetailPanel";
import { TopPollutedCities, LeastPollutedCities } from "../components/AirQualityCityTables";
import { LocationSearch } from "../components/FireMap";
import ParticleCanvas from "../components/ParticleCanvas";

const AQ_CACHE_KEY  = "geoscint_aq_cache";
const AQ_CACHE_TTL  = 10 * 60 * 1000; // 10 minutes
const AQ_CHECK_INTERVAL = 60 * 1000;

const saveCache = (stats, cities, timestamp) => {
  try {
    localStorage.setItem(AQ_CACHE_KEY, JSON.stringify({ stats, cities, timestamp }));
  } catch {
    console.warn("AQ cache save failed");
  }
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(AQ_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache.stats || !cache.cities || !cache.timestamp) return null;
    if (Date.now() - cache.timestamp > AQ_CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
};

// AQI colour helper (duplicated here so Dashboard is self-contained)
const getAqiColor = (aqi) => {
  if (aqi > 300) return "#7e0023";
  if (aqi > 200) return "#8f3f97";
  if (aqi > 150) return "#ff0000";
  if (aqi > 100) return "#ff7e00";
  if (aqi > 50)  return "#cfcf00";
  return "#00c400";
};

function AirQualityDashboard() {
  const [stats, setStats]               = useState(null);
  const [cities, setCities]             = useState(null);
  const [mapReady, setMapReady]         = useState(false);
  const [error, setError]               = useState(false);
  const [progress, setProgress]         = useState(0);
  const [lastUpdated, setLastUpdated]   = useState(null);
  const [selectedCity, setSelectedCity] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const mapRef          = useRef(null);
  const lastUpdatedRef  = useRef(null);

  const fetchFreshData = () =>
    Promise.all([
      api.get("/air-quality/stats"),
      api.get("/air-quality/map"),
    ]).then(([statsRes, mapRes]) => {
      const ts = Date.now();
      setStats(statsRes.data);
      setCities(mapRes.data);
      setLastUpdated(new Date(ts));
      lastUpdatedRef.current = ts;
      saveCache(statsRes.data, mapRes.data, ts);
    });

  useEffect(() => {
    const cache = loadCache();
    setProgress(10);

    if (cache) {
      setStats(cache.stats);
      setCities(cache.cities);
      setLastUpdated(new Date(cache.timestamp));
      lastUpdatedRef.current = cache.timestamp;
      setProgress(100);
      setTimeout(() => setMapReady(true), 300);
      return;
    }

    setProgress(30);
    fetchFreshData()
      .then(() => {
        setProgress(100);
        setTimeout(() => setMapReady(true), 300);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const refreshIfStale = () => {
      const last = lastUpdatedRef.current;
      if (!last || Date.now() - last >= AQ_CACHE_TTL) {
        fetchFreshData().catch(() => {});
      }
    };

    const interval = setInterval(refreshIfStale, AQ_CHECK_INTERVAL);
    const onVisibility = () => { if (document.visibilityState === "visible") refreshIfStale(); };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", refreshIfStale);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", refreshIfStale);
    };
  }, []);

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard">
          <div className="hero">
            <h1>Geoscint</h1>
            <p style={{ color: "#ff4d4d" }}>
              Could not connect to server. Make sure the backend is running.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!mapReady || !stats || !cities) {
    return (
      <div className="loading-bar-container">
        <div
          className="loading-bar"
          style={{
            width: `${progress}%`,
            transition: "width 0.4s ease",
            background: "linear-gradient(90deg, #0a5f66, #00cfdc, #a0f0f5)",
          }}
        />
      </div>
    );
  }

  // Dominant AQI category across monitored cities
  const dominantAqi = stats.average_aqi ?? 0;
  const dominantColor = getAqiColor(dominantAqi);

  return (
    <div className="dashboard-container aq-theme">
      <div>
        <div className="dashboard">

          {/* Hero */}
          <div className="hero animate delay-1" style={{ position: "relative", overflow: "hidden" }}>
            <ParticleCanvas colors={["#00cfdc", "#a0f0f5", "#ffffff"]} />
            <h1>Geoscint</h1>
            <p>Planetary Intelligence Platform</p>
          </div>

          <p
            className="hero-glow-subtitle"
            style={{
              color: "#00cfdc",
              textShadow:
                "0 0 8px rgba(0,207,220,0.85), 0 0 22px rgba(0,180,200,0.55), 0 0 40px rgba(0,150,180,0.3)",
            }}
          >
            Air Quality Intelligence
          </p>

          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card animate delay-2">
              <h2>{stats.total_stations?.toLocaleString()}</h2>
              <p>Stations Monitored</p>
            </div>
            <div className="stat-card animate delay-3">
              <h2 style={{ color: dominantColor }}>{stats.average_aqi?.toFixed(0)}</h2>
              <p>Global Avg AQI</p>
            </div>
            <div className="stat-card animate delay-4">
              <h2>{stats.hazardous_stations?.toLocaleString()}</h2>
              <p>Hazardous Zones</p>
            </div>
          </div>

          {lastUpdated && (
            <p style={{
              textAlign: "right", fontSize: "0.75rem",
              color: "rgba(255,255,255,0.3)", marginBottom: "10px",
            }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}

          <hr
            className="divider"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(0,180,200,0.6), rgba(0,207,220,0.6), transparent)",
            }}
          />

          {/* Location search */}
          <div className="dashboard-search animate delay-5">
            <LocationSearch
              onSelect={setSearchedLocation}
              onClear={() => setSearchedLocation(null)}
              activeLocation={searchedLocation}
              placeholder="Search a place to see nearby air quality…"
            />
            {searchedLocation && (
              <p className="dashboard-search-status">
                Showing stations within 100 km of{" "}
                <strong>{searchedLocation.label}</strong>
              </p>
            )}
          </div>

          {/* Map */}
          <div className="map-section animate delay-5">
            <AirQualityMap
              cities={cities}
              mapRef={mapRef}
              onSelectCity={setSelectedCity}
              searchedLocation={searchedLocation}
            />
          </div>

          {/* Tables — derived from map data (sorted client-side, no extra API calls) */}
          <div className="animate delay-6">
            <TopPollutedCities
              stations={cities}
              mapRef={mapRef}
              onSelectCity={setSelectedCity}
            />
            <LeastPollutedCities
              stations={cities}
              mapRef={mapRef}
              onSelectCity={setSelectedCity}
            />
          </div>

        </div>
      </div>

      <AirQualityDetailPanel city={selectedCity} onClose={() => setSelectedCity(null)} />
    </div>
  );
}

export default AirQualityDashboard;
