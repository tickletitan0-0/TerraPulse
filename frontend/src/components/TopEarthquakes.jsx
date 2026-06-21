import { useEffect, useState } from "react";
import api from "../services/api";

function TopEarthquakes({ mapRef, onSelectQuake }) {

  const [quakes, setQuakes] = useState([]);

  useEffect(() => {
    let ignored = false;
    api.get("/earthquakes/top").then((res) => {
      if (!ignored) setQuakes(res.data);
    });
    return () => { ignored = true; };
  }, []);

  const handleRowClick = (quake) => {
    onSelectQuake?.(quake);
    if (mapRef?.current) {
      document.querySelector(".map-wrapper").scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
      setTimeout(() => {
        mapRef.current.flyTo([quake.latitude, quake.longitude], 7, {
          animate: true,
          duration: 1.5,
        });
      }, 500);
    }
  };

  const getTierClass = (mag) => {
    if (mag >= 6.0) return "tier-high";
    if (mag >= 5.0) return "tier-mid";
    return "tier-low";
  };

  const formatTime = (usgsTime) => {
    if (!usgsTime) return "—";
    try {
      return new Date(parseInt(usgsTime)).toLocaleString();
    } catch {
      return "—";
    }
  };

  const handleExportCSV = () => {
    if (!quakes.length) return;

    const headers = ["Magnitude", "Location", "Depth (km)", "Tsunami", "Time"];
    const rows = quakes.map((quake) => [
      quake.magnitude,
      quake.place ?? "—",
      quake.depth,
      quake.tsunami ? "Yes" : "No",
      formatTime(quake.usgs_time),
    ]);

    const escapeCell = (value) => {
      const str = String(value ?? "");
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `top-earthquakes-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="top-fires" style={{ marginTop: "25px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <h2>Top 10 Strongest Earthquakes</h2>
        <button
          onClick={handleExportCSV}
          disabled={!quakes.length}
          style={{
            padding: "5px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(15,23,42,0.85)",
            color: quakes.length ? "rgba(167,139,250,0.9)" : "rgba(255,255,255,0.3)",
            fontSize: "0.75rem",
            cursor: quakes.length ? "pointer" : "not-allowed",
            fontFamily: "JetBrains Mono, monospace",
            backdropFilter: "blur(8px)",
          }}
        >
          Export CSV
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th>Magnitude</th>
            <th>Location</th>
            <th>Depth (km)</th>
            <th>Tsunami</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {quakes.map((quake, index) => (
            <tr
              key={index}
              className={getTierClass(quake.magnitude)}
              onClick={() => handleRowClick(quake)}
              style={{ cursor: "pointer" }}
            >
              <td>{quake.magnitude}</td>
              <td>{quake.place ?? "—"}</td>
              <td>{quake.depth}</td>
              <td>{quake.tsunami ? "⚠️ Yes" : "No"}</td>
              <td>{formatTime(quake.usgs_time)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TopEarthquakes;