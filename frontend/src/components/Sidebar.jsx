// Sidebar.jsx — updated to enable the Air Quality nav item
// Replace your existing Sidebar.jsx with this file.

const NAV_ITEMS = [
  {
    key: "wildfires",
    label: "Wildfires",
    icon: (
      <path d="M12 2c-1 3-3.5 4.5-3.5 7.5a3.5 3.5 0 0 0 7 0c0-1.2-.5-2-1-2.7.7.2 2.5 1.3 2.5 4.2a5 5 0 0 1-10 0C7 7 9 5.5 9 3.5c0-.6.2-1.1.5-1.5C10 2.7 11 2.3 12 2z" />
    ),
  },
  {
    key: "earthquakes",
    label: "Earthquakes",
    icon: (
      <path d="M2 14l3-4 2.5 3L11 8l2.5 4L16 9l2 5h4M2 14v6h20v-6" />
    ),
  },
  {
    key: "air-quality",
    label: "Air Quality",
    icon: (
      <path d="M4 8h11a3 3 0 1 0-3-3 M4 13h15a3 3 0 1 1-3 3 M4 18h9a2.5 2.5 0 1 1-2.5 2.5" />
    ),
  },
];

function NavIcon({ children }) {
  return (
    <svg
      width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function Sidebar({ activePage, onNavigate }) {
  return (
    <nav className="sidebar" aria-label="Primary">
      <div className="sidebar-inner">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">G</span>
          <span className="sidebar-brand-name">Geoscint</span>
        </div>

        <ul className="sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activePage;
            // All three items are now enabled
            const isEnabled = true;
            return (
              <li key={item.key}>
                <button
                  className={`sidebar-link ${item.key}${isActive ? " active" : ""}`}
                  disabled={!isEnabled}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => isEnabled && onNavigate(item.key)}
                >
                  <span className="sidebar-icon">
                    <NavIcon>{item.icon}</NavIcon>
                  </span>
                  <span className="sidebar-label">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export default Sidebar;
