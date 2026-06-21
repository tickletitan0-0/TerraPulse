import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import FireMap, { LocationSearch, distanceKm, SEARCH_RADIUS_KM } from "../components/FireMap";
import TopFires from "../components/TopFires";
import FireDetailPanel from "../components/FireDetailPanel";
import ParticleCanvas from "../components/ParticleCanvas";

const CACHE_KEY = "terrapulse_cache";
const CACHE_TTL = 65 * 60 * 1000;
const REFRESH_CHECK_INTERVAL = 60 * 1000; // re-check every minute while the tab is open

const saveCache = (stats, fires, timestamp) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      stats,
      fires,
      timestamp,
    }));
  } catch {
    console.warn("Cache save failed — localStorage may be full");
  }
};

const loadCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw);
    if (!cache.stats || !cache.fires || !cache.timestamp) return null; // old/partial cache shape
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
};

function Dashboard() {
  const [stats, setStats]             = useState(null);
  const [fires, setFires]             = useState(null);
  const [mapReady, setMapReady]       = useState(false);
  const [error, setError]             = useState(false);
  const [progress, setProgress]       = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedFire, setSelectedFire] = useState(null);
  const [searchedLocation, setSearchedLocation] = useState(null); // { lat, lon, label } | null
  const mapRef                        = useRef(null);
  const lastUpdatedRef                = useRef(null); // mirrors lastUpdated for use inside intervals/listeners

  // Fetches stats + fires together and treats them as one atomic snapshot —
  // they always land in state (and in the cache) from the same moment in time.
  const fetchFreshData = () => {
    return Promise.all([
      api.get("/fires/stats"),
      api.get("/fires/map"),
    ]).then(([statsRes, mapRes]) => {
      const timestamp = Date.now();
      setStats(statsRes.data);
      setFires(mapRes.data);
      setLastUpdated(new Date(timestamp));
      lastUpdatedRef.current = timestamp;
      saveCache(statsRes.data, mapRes.data, timestamp);
    });
  };

  useEffect(() => {
    const cache = loadCache();
    setProgress(10);

    if (cache) {
      setStats(cache.stats);
      setFires(cache.fires);
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
      if (!last || Date.now() - last >= CACHE_TTL) {
        fetchFreshData().catch(() => {
          // Swallow background refresh errors — keep showing last-known-good data
          // rather than bouncing the user to the error screen.
        });
      }
    };

    // Checking every minute (instead of relying on one setInterval timed at the
    // full 65-minute TTL) means a throttled/backgrounded tab still catches up
    // soon after it's checked, instead of missing its one shot entirely.
    const interval = setInterval(refreshIfStale, REFRESH_CHECK_INTERVAL);

    // Browsers pause/throttle timers in hidden tabs and during system sleep, so
    // the interval above can't be relied on alone. Re-check the moment the tab
    // becomes visible or regains focus again — this is what catches the "left
    // it open for an hour, came back" case without needing a manual reload.
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
            <h1>Terrapulse</h1>
            <p style={{ color: "#ff4d4d" }}>
              Could not connect to server. Make sure the backend is running.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ✅ null guard added
  if (!mapReady || !stats || !fires) {
    return (
      <div className="loading-bar-container">
        <div
          className="loading-bar"
          style={{ width: `${progress}%`, transition: "width 0.4s ease" }}
        ></div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div>
        <div className="dashboard">
          <div className="hero animate delay-1" style={{ position: "relative", overflow: "hidden" }}>
            <ParticleCanvas />
            <h1>Geoscint</h1>
            <p>Planetary Intelligence Platform</p>
          </div>

          <p className="hero-glow-subtitle">Active Fire Intelligence</p>

          <div className="stats-grid">
            <div className="stat-card animate delay-2">
              <h2>{stats.total_fires?.toLocaleString()}</h2>
              <p>Active Detections</p>
            </div>
            <div className="stat-card animate delay-3">
              <h2>{stats.average_brightness?.toFixed(1)}</h2>
              <p>Mean Thermal Intensity</p>
            </div>
            <div className="stat-card animate delay-4">
              <h2>{stats.high_confidence_fires?.toLocaleString()}</h2>
              <p>Critical Detections</p>
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

          <div className="dashboard-search animate delay-5">
            <LocationSearch
              activeLocation={searchedLocation}
              onSelect={setSearchedLocation}
              onClear={() => setSearchedLocation(null)}
            />
            {searchedLocation && (
              <p className="dashboard-search-status">
                {fires.filter(f => distanceKm(searchedLocation.lat, searchedLocation.lon, f.latitude, f.longitude) <= SEARCH_RADIUS_KM).length.toLocaleString()} of {fires.length.toLocaleString()} fires within {SEARCH_RADIUS_KM} km of {searchedLocation.label.split(",")[0]}
              </p>
            )}
          </div>

          <hr className="divider" />

          <div className="map-section animate delay-5">
            <FireMap
              fires={fires}
              mapRef={mapRef}
              onSelectFire={setSelectedFire}
              searchedLocation={searchedLocation}
            />
          </div>

          <div className="animate delay-6">
            <TopFires mapRef={mapRef} onSelectFire={setSelectedFire} />
          </div>

        </div>
      </div>

      <FireDetailPanel fire={selectedFire} onClose={() => setSelectedFire(null)} />
    </div>
  );
}

export default Dashboard;