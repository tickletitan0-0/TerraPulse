// Both tables receive the full `stations` array (already fetched by
// AirQualityDashboard from /air-quality/map) and sort client-side.
// This avoids separate API calls and matches the actual backend which
// only exposes /top (not /top-polluted and /least-polluted separately).

const getAqiColor = (aqi) => {
  if (aqi > 300) return "#7e0023";
  if (aqi > 200) return "#8f3f97";
  if (aqi > 150) return "#ff0000";
  if (aqi > 100) return "#ff7e00";
  if (aqi > 50)  return "#cfcf00";
  return "#00c400";
};

const getAqiLabel = (aqi) => {
  if (aqi > 300) return "Hazardous";
  if (aqi > 200) return "Very Unhealthy";
  if (aqi > 150) return "Unhealthy";
  if (aqi > 100) return "Sensitive";
  if (aqi > 50)  return "Moderate";
  return "Good";
};

const getTierClass = (aqi) => {
  if (aqi > 150) return "tier-high";
  if (aqi > 50)  return "tier-mid";
  return "aq-tier-good";
};

function exportCSV(headers, rows, filename) {
  const escapeCell = (v) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(escapeCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

const exportBtnStyle = (enabled) => ({
  padding: "5px 12px",
  borderRadius: "8px",
  border: "1px solid rgba(0,207,220,0.2)",
  background: "rgba(0,207,220,0.06)",
  color: enabled ? "rgba(0,207,220,0.8)" : "rgba(255,255,255,0.25)",
  fontSize: "0.75rem",
  cursor: enabled ? "pointer" : "not-allowed",
  fontFamily: "JetBrains Mono, monospace",
  backdropFilter: "blur(8px)",
  transition: "background 0.2s ease",
});

function StationRow({ station, rank, onSelectCity, mapRef }) {
  const handleClick = () => {
    onSelectCity?.(station);
    if (mapRef?.current) {
      document.querySelector(".map-wrapper")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => {
        mapRef.current.flyTo([station.latitude, station.longitude], 7, {
          animate: true, duration: 1.5,
        });
      }, 500);
    }
  };

  const color = getAqiColor(station.aqi);

  return (
    <tr
      className={getTierClass(station.aqi)}
      onClick={handleClick}
      style={{ cursor: "pointer" }}
    >
      <td style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>{rank}</td>
      <td style={{ fontWeight: 600, maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {station.station_name ?? "—"}
      </td>
      <td>
        <span style={{ color, fontWeight: 700, fontSize: "1rem" }}>{station.aqi}</span>
      </td>
      <td>
        <span style={{
          fontSize: "0.7rem", padding: "2px 8px", borderRadius: "10px",
          border: `1px solid ${color}60`, background: `${color}18`,
          color, whiteSpace: "nowrap",
        }}>
          {getAqiLabel(station.aqi)}
        </span>
      </td>
      <td style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
        {station.pm25 != null ? `${station.pm25} µg/m³` : "—"}
      </td>
      <td style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.85rem" }}>
        {station.pm10 != null ? `${station.pm10} µg/m³` : "—"}
      </td>
      <td style={{ color: "#00cfdc", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {station.dominant_pollutant ?? "—"}
      </td>
    </tr>
  );
}

function TableShell({ children, title, subtitle, titleAccent, onExport, hasData }) {
  return (
    <div className="top-fires aq-table">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div>
          <h2 style={{ color: "rgba(255,255,255,0.7)" }}>
            <span style={{ color: titleAccent, marginRight: "8px" }}>
              {titleAccent === "#ff4d4d" ? "▲" : "▼"}
            </span>
            {title}
          </h2>
          <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginTop: "4px" }}>
            {subtitle}
          </p>
        </div>
        <button onClick={onExport} disabled={!hasData} style={exportBtnStyle(hasData)}>
          Export CSV
        </button>
      </div>
      <table>
        <thead>
          <tr>
            <th style={{ width: "36px" }}>#</th>
            <th>Station</th>
            <th>AQI</th>
            <th>Category</th>
            <th>PM2.5</th>
            <th>PM10</th>
            <th>Dominant</th>
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Most Polluted — top 10 by highest AQI
// ─────────────────────────────────────────────────────────
export function TopPollutedCities({ stations = [], mapRef, onSelectCity }) {
  const sorted = [...stations].sort((a, b) => b.aqi - a.aqi).slice(0, 10);

  const handleExport = () => {
    if (!sorted.length) return;
    exportCSV(
      ["Rank", "Station", "AQI", "Category", "PM2.5 (µg/m³)", "PM10 (µg/m³)", "Dominant Pollutant"],
      sorted.map((s, i) => [
        i + 1, s.station_name ?? "—", s.aqi, getAqiLabel(s.aqi),
        s.pm25 ?? "—", s.pm10 ?? "—", s.dominant_pollutant ?? "—",
      ]),
      "most-polluted-stations"
    );
  };

  return (
    <TableShell
      title="Most Polluted Stations"
      subtitle="Top 10 highest AQI readings"
      titleAccent="#ff4d4d"
      onExport={handleExport}
      hasData={sorted.length > 0}
    >
      {sorted.map((s, i) => (
        <StationRow key={s.station_name + i} station={s} rank={i + 1} onSelectCity={onSelectCity} mapRef={mapRef} />
      ))}
    </TableShell>
  );
}

// ─────────────────────────────────────────────────────────
// Least Polluted — top 10 by lowest AQI (cleanest air)
// ─────────────────────────────────────────────────────────
export function LeastPollutedCities({ stations = [], mapRef, onSelectCity }) {
  const sorted = [...stations].sort((a, b) => a.aqi - b.aqi).slice(0, 10);

  const handleExport = () => {
    if (!sorted.length) return;
    exportCSV(
      ["Rank", "Station", "AQI", "Category", "PM2.5 (µg/m³)", "PM10 (µg/m³)"],
      sorted.map((s, i) => [
        i + 1, s.station_name ?? "—", s.aqi, getAqiLabel(s.aqi),
        s.pm25 ?? "—", s.pm10 ?? "—",
      ]),
      "cleanest-stations"
    );
  };

  return (
    <TableShell
      title="Cleanest Stations"
      subtitle="Top 10 lowest AQI readings — best air quality"
      titleAccent="#00c400"
      onExport={handleExport}
      hasData={sorted.length > 0}
    >
      {sorted.map((s, i) => (
        <StationRow key={s.station_name + i} station={s} rank={i + 1} onSelectCity={onSelectCity} mapRef={mapRef} />
      ))}
    </TableShell>
  );
}
