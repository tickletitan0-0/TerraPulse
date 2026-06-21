import { useEffect, useState, useRef } from "react";
import api from "../services/api";
import FireMap from "../components/FireMap";
import TopFires from "../components/TopFires";

const CACHE_KEY = "terrapulse_cache";
const CACHE_TTL = 65 * 60 * 1000;

const saveCache = (stats, timestamp) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      stats,
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
    if (Date.now() - cache.timestamp > CACHE_TTL) return null;
    return cache;
  } catch {
    return null;
  }
};

function EmberCanvas() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const embers = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      radius: Math.random() * 2.5 + 0.5,
      opacity: Math.random(),
      speedX: (Math.random() - 0.5) * 0.4,
      speedY: -(Math.random() * 0.8 + 0.3),
      color: Math.random() > 0.5 ? "#00cfff" : "#ffffff",
    }));

    let animId;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      embers.forEach((e) => {
        e.x += e.speedX;
        e.y += e.speedY;
        e.opacity -= 0.003;
        if (e.opacity <= 0 || e.y < 0) {
          e.x = Math.random() * canvas.width;
          e.y = canvas.height;
          e.opacity = Math.random() * 0.8 + 0.2;
          e.speedX = (Math.random() - 0.5) * 0.4;
          e.speedY = -(Math.random() * 0.8 + 0.3);
        }
        ctx.beginPath();
        ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
        ctx.fillStyle = e.color;
        ctx.globalAlpha = e.opacity;
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        top: 0, left: 0,
        width: "100%", height: "100%",
        pointerEvents: "none",
      }}
    />
  );
}

function Dashboard() {
  const [stats, setStats]             = useState(null);
  const [fires, setFires]             = useState(null);
  const [mapReady, setMapReady]       = useState(false);
  const [error, setError]             = useState(false);
  const [progress, setProgress]       = useState(0);
  const [lastUpdated, setLastUpdated] = useState(null);
  const mapRef                        = useRef(null);

  useEffect(() => {
    const cache = loadCache();

    setProgress(10);

    const statsPromise = cache
      ? Promise.resolve({ data: cache.stats })
      : api.get("/fires/stats");

    statsPromise
      .then((res) => {
        setStats(res.data);
        if (!cache) saveCache(res.data, Date.now());
        setProgress(50);
        return api.get("/fires/map");
      })
      .then((res) => {
        setFires(res.data);
        setProgress(100);
        setLastUpdated(cache ? new Date(cache.timestamp) : new Date());
        setTimeout(() => setMapReady(true), 300);
      })
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    const refresh = () => {
      api.get("/fires/stats").then((res) => {
        setStats(res.data);
        api.get("/fires/map").then((mapRes) => {
          setFires(prev => {
            if (prev?.length === mapRes.data.length) return prev;
            saveCache(res.data, Date.now()); // ✅ fixed
            return mapRes.data;
          });
          setLastUpdated(new Date());
        });
      });
    };

    const interval = setInterval(refresh, CACHE_TTL);
    return () => clearInterval(interval);
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
            <EmberCanvas />
            <h1>Terrapulse</h1>
            <p>Global Wildfire Intelligence Platform</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card animate delay-2">
              <h2>{stats.total_fires?.toLocaleString()}</h2>
              <p>Total Fires</p>
            </div>
            <div className="stat-card animate delay-3">
              <h2>{stats.average_brightness?.toFixed(1)}</h2>
              <p>Avg Brightness</p>
            </div>
            <div className="stat-card animate delay-4">
              <h2>{stats.high_confidence_fires?.toLocaleString()}</h2>
              <p>High Risk Fires</p>
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

          <hr className="divider" />

          <div className="animate delay-5">
            <FireMap fires={fires} mapRef={mapRef} />
          </div>

          <div className="animate delay-6">
            <TopFires mapRef={mapRef} />
          </div>

        </div>
      </div>
    </div>
  );
}

export default Dashboard;