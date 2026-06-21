import { useEffect, useState } from "react";
import api from "../services/api";

// FIRMS acq_time is UTC time as HHMM (leading zeros dropped), e.g. 412 -> 04:12, 1842 -> 18:42
const formatAcqTime = (time) => {
  if (time === undefined || time === null || time === "") return "—";
  const str = String(time).padStart(4, "0");
  return `${str.slice(0, 2)}:${str.slice(2)} UTC`;
};

function TopFires({ mapRef }) {

  const [fires, setFires] = useState([]);

  useEffect(() => {
    api.get("/fires/top")
      .then((res) => setFires(res.data));
  }, []);

  const handleRowClick = (fire) => {
  if (mapRef?.current) {
    document.querySelector(".map-wrapper").scrollIntoView({ 
      behavior: "smooth", 
      block: "center" 
    });
    setTimeout(() => {
      mapRef.current.flyTo([fire.latitude, fire.longitude], 8, {
        animate: true,
        duration: 1.5,
      });
    }, 500);
  }
};

  const handleExportCSV = () => {
    if (!fires.length) return;

    const headers = ["Brightness", "Latitude", "Longitude", "Date", "Time (UTC)"];
    const rows = fires.map((fire) => [
      fire.brightness,
      fire.latitude,
      fire.longitude,
      fire.date,
      formatAcqTime(fire.acquisition_time),
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
    link.download = `top-fires-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="top-fires">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <h2>Top 10 Hottest Fires</h2>
        <button
          onClick={handleExportCSV}
          disabled={!fires.length}
          style={{
            padding: "5px 12px",
            borderRadius: "8px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: "rgba(15,23,42,0.85)",
            color: fires.length ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.3)",
            fontSize: "0.75rem",
            cursor: fires.length ? "pointer" : "not-allowed",
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
            <th>Brightness</th>
            <th>Latitude</th>
            <th>Longitude</th>
            <th>Date</th>
            <th>Time</th>
          </tr>
        </thead>
        <tbody>
          {fires.map((fire, index) => {
            const tier =
              fire.brightness > 370 ? "tier-high" :
              fire.brightness > 350 ? "tier-mid" : "tier-low";

            return (
              <tr
                key={index}
                className={tier}
                onClick={() => handleRowClick(fire)}
                style={{ cursor: "pointer" }}
              >
                <td>{fire.brightness}</td>
                <td>{fire.latitude}</td>
                <td>{fire.longitude}</td>
                <td>{fire.date}</td>
                <td>{formatAcqTime(fire.acquisition_time)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default TopFires;