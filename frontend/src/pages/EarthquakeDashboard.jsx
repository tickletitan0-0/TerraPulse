import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import EarthquakeMap from "../components/EarthquakeMap";
import TopEarthquakes from "../components/TopEarthquakes";
import { LocationSearch } from "../components/FireMap";
import ParticleCanvas from "../components/ParticleCanvas";
import EarthquakeDetailPanel from "../components/EarthquakeDetailPanel";

const EQ_CACHE_KEY = "terrapulse_eq_cache";
const EQ_CACHE_TTL = 5 * 60 * 1000; // 5 minutes since USGS updates frequently
const EQ_CHECK_INTERVAL = 60 * 1000; // re-check every minute while tab is open

const saveCache = (stats, quakes, timestamp) => {
  try {
    localStorage.setItem(EQ_CACHE_KEY, JSON.stringify({ stats, quakes, timestamp }));
  } catch {
    console.warn("EQ cache save failed");
  }
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(EQ_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache.stats || !cache.quakes || !cache.timestamp) return null;
    if (Date.now() - cache.timestamp > EQ_CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
};

function EarthquakeDashboard() {
  const [stats, setStats]             = useState(null);
  const [quakes, setQuakes]           = useState(null);
  const [mapReady, setMapReady]       = useState(false);
  const [error, setError]             = useState(false);
  const [progress, setProgress]       = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedQuake, setSelectedQuake] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null);
  const mapRef         = useRef(null);
  const lastUpdatedRef = useRef(null); // mirrors lastUpdated for use inside intervals/listeners

  const fetchFreshData = () =>
    Promise.all([
      api.get("/earthquakes/stats"),
      api.get("/earthquakes/map"),
    ]).then(([statsRes, mapRes]) => {
      const timestamp = Date.now();
      setStats(statsRes.data);
      setQuakes(mapRes.data);
      setLastUpdated(new Date(timestamp));
      lastUpdatedRef.current = timestamp;
      saveCache(statsRes.data, mapRes.data, timestamp);
    });

  useEffect(() => {
    const cache = loadCache();
    setProgress(10);

    if (cache) {
      setStats(cache.stats);
      setQuakes(cache.quakes);
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
      if (!last || Date.now() - last >= EQ_CACHE_TTL) {
        fetchFreshData().catch(() => {
          // Swallow background refresh errors — keep showing last-known-good data
        });
      }
    };

    const interval = setInterval(refreshIfStale, EQ_CHECK_INTERVAL);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") refreshIfStale();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", refreshIfStale);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
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

  if (!mapReady || !stats || !quakes) {
    return (
      <div className="loading-bar-container">
        <div
          className="loading-bar"
          style={{
            width: `${progress}%`,
            transition: "width 0.4s ease",
            background: "linear-gradient(90deg, #4c1d95, #7c3aed, #c4b5fd)",
          }}
        ></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container eq-theme">
      <div>
        <div className="dashboard">

          <div className="hero animate delay-1" style={{ position: "relative", overflow: "hidden" }}>
            <ParticleCanvas colors={["#a78bfa", "#c4b5fd", "#ffffff"]} />
            <h1>Geoscint</h1>
            <p>Planetary Intelligence Platform</p>
          </div>

          <p className="hero-glow-subtitle" style={{
            color: "#a78bfa",
            textShadow: "0 0 8px rgba(167,139,250,0.8), 0 0 22px rgba(124,58,237,0.55), 0 0 40px rgba(124,58,237,0.3)",
          }}>
            Seismic Activity Intelligence
          </p>

          <div className="stats-grid">
            <div className="stat-card animate delay-2">
              <h2>{stats.total_earthquakes?.toLocaleString()}</h2>
              <p>Total Detected</p>
            </div>
            <div className="stat-card animate delay-3">
              <h2>{stats.average_magnitude?.toFixed(2)}</h2>
              <p>Avg Magnitude</p>
            </div>
            <div className="stat-card animate delay-4">
              <h2>{stats.significant_earthquakes?.toLocaleString()}</h2>
              <p>Significant (M5.0+)</p>
            </div>
          </div>

          {lastUpdated && (
            <p style={{
              textAlign: "right",
              fontSize: "0.75rem",
              color: "rgba(255,255,255,0.3)",
              marginBottom: "10px"
            }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}

          <hr className="divider" style={{
            background: "linear-gradient(90deg, transparent, rgba(124,58,237,0.6), rgba(167,139,250,0.6), transparent)"
          }} />

          <div className="dashboard-search">
            <LocationSearch
              onSelect={setSearchedLocation}
              onClear={() => setSearchedLocation(null)}
              activeLocation={searchedLocation}
              placeholder="Search a place to see nearby earthquakes…"
            />
            {searchedLocation && (
              <p className="dashboard-search-status">
                Showing earthquakes within 100km of <strong>{searchedLocation.label}</strong>
              </p>
            )}
          </div>

          <div className="animate delay-5">
            <EarthquakeMap quakes={quakes} mapRef={mapRef} onSelectQuake={setSelectedQuake} searchedLocation={searchedLocation} />
          </div>

          <div className="animate delay-6">
            <TopEarthquakes mapRef={mapRef} onSelectQuake={setSelectedQuake} />
          </div>

        </div>
      </div>

      <EarthquakeDetailPanel quake={selectedQuake} onClose={() => setSelectedQuake(null)} />
    </div>
  );
}

export default EarthquakeDashboard;
