import { useState } from "react";
import Dashboard from "./pages/Dashboard";
import EarthquakeDashboard from "./pages/EarthquakeDashboard";
import Sidebar from "./components/Sidebar";
import AirQualityDashboard from "./pages/AirQualityDashboard"
import "./App.css";


function App() {
  const [activePage, setActivePage] = useState("wildfires");

  return (
    <div className="app-shell">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />
      {activePage === "wildfires"   && <Dashboard />}
      {activePage === "earthquakes" && <EarthquakeDashboard />}
      {activePage === "air-quality" && <AirQualityDashboard />}
    </div>
  );
}

export default App;