import { useEffect, useState } from "react";
import { reverseGeocode } from "../utils/geocode";

const getTier = (magnitude) => {
  if (magnitude >= 6.0) return { label: "Major", color: "#4c1d95" };
  if (magnitude >= 5.0) return { label: "Strong", color: "#7c3aed" };
  if (magnitude >= 4.0) return { label: "Moderate", color: "#a78bfa" };
  if (magnitude >= 3.0) return { label: "Minor", color: "#c4b5fd" };
  return { label: "Micro", color: "#e0d4fc" };
};

// Depth bands are a simple, non-authoritative read for display purposes —
// shallower quakes are generally felt more strongly at the surface.
const describeDepth = (depth) => {
  if (depth < 70) return "Shallow — felt more strongly at the surface";
  if (depth < 300) return "Intermediate depth";
  return "Deep — often felt less strongly despite magnitude";
};

function EarthquakeDetailPanel({ quake, onClose }) {
  const [location, setLocation] = useState(null);

  useEffect(() => {
    setLocation(null);
    if (!quake) return;

    // USGS-style data usually already includes a human-readable place name;
    // only fall back to reverse geocoding when it's missing.
    if (quake.place) {
      setLocation(quake.place);
      return;
    }

    if (typeof quake.latitude !== "number" || typeof quake.longitude !== "number") return;

    let cancelled = false;
    reverseGeocode(quake.latitude, quake.longitude).then((label) => {
      if (!cancelled) setLocation(label);
    });
    return () => {
      cancelled = true;
    };
  }, [quake]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (quake) document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [quake, onClose]);

  if (!quake) return null;

  const tier = getTier(quake.magnitude);
  const hasDepth = quake.depth !== undefined && quake.depth !== null;
  const hasTsunami = quake.tsunami !== undefined && quake.tsunami !== null;

  return (
    <>
      <div className="fire-panel-backdrop" onClick={onClose} />
      <aside className="fire-panel eq-panel" role="dialog" aria-label="Earthquake details">
        <button className="fire-panel-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        <div className="fire-panel-header">
          <span className="fire-panel-tier" style={{ color: tier.color, borderColor: tier.color }}>
            {tier.label} · M{quake.magnitude}
          </span>
          <h3>{location ?? <span className="location-loading">resolving…</span>}</h3>
          <p className="fire-panel-coords">
            {quake.latitude?.toFixed(3)}, {quake.longitude?.toFixed(3)}
          </p>
        </div>

        <div className="fire-panel-section">
          <div className="fire-panel-row">
            <span>Magnitude</span>
            <strong>{quake.magnitude}</strong>
          </div>

          {hasDepth && (
            <div className="fire-panel-row">
              <span>Depth</span>
              <strong>{quake.depth} km</strong>
            </div>
          )}

          {hasDepth && (
            <p className="fire-panel-note">{describeDepth(quake.depth)}</p>
          )}

          {hasTsunami && (
            <div className="fire-panel-row">
              <span>Tsunami risk</span>
              <strong style={quake.tsunami ? { color: "#ff8800" } : undefined}>
                {quake.tsunami ? "⚠️ Possible" : "None reported"}
              </strong>
            </div>
          )}

          {quake.time && (
            <div className="fire-panel-row">
              <span>Time</span>
              <strong>{new Date(quake.time).toLocaleString()}</strong>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

export default EarthquakeDetailPanel;
