import { useEffect } from "react";

const getAqiTier = (aqi) => {
  if (aqi > 300) return { label: "Hazardous",            color: "#7e0023" };
  if (aqi > 200) return { label: "Very Unhealthy",       color: "#8f3f97" };
  if (aqi > 150) return { label: "Unhealthy",            color: "#ff0000" };
  if (aqi > 100) return { label: "Unhealthy — Sensitive",color: "#ff7e00" };
  if (aqi > 50)  return { label: "Moderate",             color: "#cfcf00" };
  return           { label: "Good",                      color: "#00c400" };
};

const describeAqi = (aqi) => {
  if (aqi > 300) return "Air quality is extremely hazardous. Avoid all outdoor activity.";
  if (aqi > 200) return "Everyone may begin to experience serious health effects.";
  if (aqi > 150) return "Everyone may experience health effects; sensitive groups severely affected.";
  if (aqi > 100) return "Unusually sensitive people should limit prolonged outdoor exertion.";
  if (aqi > 50)  return "Air quality is acceptable; some pollutants may cause concern for very sensitive individuals.";
  return "Air quality is satisfactory. Little or no risk.";
};

function AirQualityDetailPanel({ city, onClose }) {
  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === "Escape") onClose(); };
    if (city) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [city, onClose]);

  if (!city) return null;

  const tier = getAqiTier(city.aqi);

  const pollutants = [
    { key: "pm25",  label: "PM2.5",   unit: "µg/m³", value: city.pm25 },
    { key: "pm10",  label: "PM10",    unit: "µg/m³", value: city.pm10 },
    { key: "o3",    label: "Ozone (O₃)",  unit: "µg/m³", value: city.o3 },
    { key: "no2",   label: "NO₂",     unit: "µg/m³", value: city.no2 },
    { key: "so2",   label: "SO₂",     unit: "µg/m³", value: city.so2 },
    { key: "co",    label: "CO",      unit: "mg/m³", value: city.co },
  ].filter((p) => p.value !== undefined && p.value !== null);

  const aqiBarWidth = Math.min((city.aqi / 500) * 100, 100);

  return (
    <>
      <div className="fire-panel-backdrop" onClick={onClose} />
      <aside className="fire-panel aq-panel" role="dialog" aria-label="Air quality details">
        <button className="fire-panel-close" onClick={onClose} aria-label="Close">✕</button>

        <div className="fire-panel-header">
          <span
            className="fire-panel-tier"
            style={{ color: tier.color, borderColor: tier.color }}
          >
            {tier.label}
          </span>
          <h3 style={{ marginTop: "10px" }}>{city.station_name ?? "Unknown Station"}</h3>
          {city.latitude && city.longitude && (
            <p className="fire-panel-coords">
              {city.latitude?.toFixed(3)}, {city.longitude?.toFixed(3)}
            </p>
          )}
        </div>

        {/* AQI bar */}
        <div style={{ marginBottom: "20px" }}>
          <div style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "baseline", marginBottom: "6px",
          }}>
            <span style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.4)", letterSpacing: "1px", textTransform: "uppercase" }}>
              Air Quality Index
            </span>
            <span style={{ fontSize: "2rem", fontWeight: 700, color: tier.color, letterSpacing: "-1px" }}>
              {city.aqi}
            </span>
          </div>
          <div style={{
            height: "6px", borderRadius: "4px",
            background: "rgba(255,255,255,0.08)",
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${aqiBarWidth}%`,
              background: `linear-gradient(90deg, #00e400, #ffff00, #ff7e00, ${tier.color})`,
              borderRadius: "4px",
              transition: "width 0.6s ease",
            }} />
          </div>
          <p className="fire-panel-note" style={{ marginTop: "8px" }}>{describeAqi(city.aqi)}</p>
        </div>

        <div className="fire-panel-section">
          {pollutants.map((p) => (
            <div className="fire-panel-row" key={p.key}>
              <span>{p.label}</span>
              <strong>{p.value} <span style={{ fontWeight: 400, color: "rgba(255,255,255,0.3)", fontSize: "0.75rem" }}>{p.unit}</span></strong>
            </div>
          ))}

          {city.dominant_pollutant && (
            <div className="fire-panel-row">
              <span>Dominant Pollutant</span>
              <strong style={{ color: "#00cfdc" }}>{city.dominant_pollutant.toUpperCase()}</strong>
            </div>
          )}

          {city.station_time && (
            <div className="fire-panel-row">
              <span>Station Time</span>
              <strong>{city.station_time}</strong>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default AirQualityDetailPanel;
