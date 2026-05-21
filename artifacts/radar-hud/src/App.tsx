import { useState, useMemo } from "react";
import { RadarDisplay } from "@/components/RadarDisplay";
import { AircraftPanel } from "@/components/AircraftPanel";
import { ControlPanel } from "@/components/ControlPanel";
import { LocationInput } from "@/components/LocationInput";
import { useAircraftData } from "@/hooks/useAircraftData";
import { RadarLocation, RadarSettings } from "@/types";

const DEFAULT_SETTINGS: RadarSettings = {
  radiusNm: 50,
  refreshIntervalMs: 3000,
  showLabels: true,
  showTrails: true,
  radarMode: "sweep",
  colorScheme: "green",
};

const SCHEME_COLORS = {
  green: { accent: "#00ff3c", dim: "#005500", border: "#003300", bg: "#000d00", panel: "#001200" },
  blue: { accent: "#3a8fff", dim: "#002255", border: "#001833", bg: "#00050f", panel: "#000d1a" },
  amber: { accent: "#ffaa00", dim: "#442200", border: "#2a1400", bg: "#0d0500", panel: "#100800" },
};

type PanelTab = "info" | "settings" | "location";

export default function App() {
  const [location, setLocation] = useState<RadarLocation | null>(null);
  const [settings, setSettings] = useState<RadarSettings>(DEFAULT_SETTINGS);
  const [selectedHex, setSelectedHex] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTab>("location");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const { aircraft, trails, loading, error, lastUpdated, totalCount, refetch } = useAircraftData(
    location,
    settings.radiusNm,
    settings.refreshIntervalMs
  );

  const selectedAircraft = useMemo(
    () => aircraft.find((a) => a.hex === selectedHex) || null,
    [aircraft, selectedHex]
  );

  const colors = SCHEME_COLORS[settings.colorScheme];

  const handleSelect = (hex: string | null) => {
    setSelectedHex(hex);
    if (hex) setActiveTab("info");
  };

  const handleLocationSet = (loc: RadarLocation) => {
    setLocation(loc);
    setActiveTab("settings");
  };

  const tabs: { id: PanelTab; label: string; icon: string }[] = [
    { id: "location", label: "LOC", icon: "◎" },
    { id: "info", label: "AC", icon: "✈" },
    { id: "settings", label: "SET", icon: "⚙" },
  ];

  return (
    <div
      className="h-screen w-screen overflow-hidden flex flex-col"
      style={{ background: colors.bg, color: colors.accent, fontFamily: "'Courier New', monospace" }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-1.5 border-b shrink-0 text-xs"
        style={{ borderColor: colors.border, background: colors.panel }}
      >
        <div className="flex items-center gap-3">
          <span className="font-bold tracking-widest text-sm">RADAR HUD</span>
          {location && (
            <span className="opacity-60 truncate max-w-[200px]">
              {location.label}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {/* Status indicators */}
          {location && (
            <>
              <span style={{ color: colors.accent }} className="opacity-70">
                {settings.radiusNm}nm
              </span>
              <span
                className="flex items-center gap-1"
                style={{ color: totalCount > 0 ? colors.accent : colors.dim }}
              >
                ✈ {totalCount}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${loading ? "animate-pulse" : ""}`}
                style={{ background: error ? "#ff4444" : loading ? colors.accent : colors.dim }}
                title={error || (loading ? "Updating…" : lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : "Idle")}
              />
              {lastUpdated && (
                <span className="opacity-40 hidden sm:inline">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={refetch}
                disabled={loading}
                className="opacity-50 hover:opacity-100 transition-opacity disabled:opacity-20 text-xs"
                title="Refresh now"
              >
                ↺
              </button>
            </>
          )}
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="opacity-50 hover:opacity-100 transition-opacity px-1"
          >
            {sidebarOpen ? "◀" : "▶"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Radar area */}
        <div className="flex-1 flex items-center justify-center p-2 min-w-0 relative">
          {!location ? (
            <div className="flex flex-col items-center gap-4 text-center max-w-xs">
              <div className="text-4xl opacity-20">◎</div>
              <div>
                <div className="text-sm font-bold mb-1">No location set</div>
                <div className="text-xs opacity-40">Open the location panel to get started</div>
              </div>
              <button
                onClick={() => { setActiveTab("location"); setSidebarOpen(true); }}
                className="text-xs px-4 py-2 border rounded transition-all hover:opacity-80"
                style={{ borderColor: colors.accent, color: colors.accent }}
              >
                SET LOCATION
              </button>
              {/* Preview radar rings (decorative) */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5">
                {[120, 200, 280, 360].map((r) => (
                  <div
                    key={r}
                    className="absolute rounded-full border"
                    style={{
                      width: r,
                      height: r,
                      borderColor: colors.accent,
                    }}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="w-full h-full max-w-[min(100%,calc(100vh-120px))] max-h-[min(100%,calc(100vw-300px))] aspect-square mx-auto">
              <RadarDisplay
                aircraft={aircraft}
                trails={trails}
                location={location}
                settings={settings}
                selectedHex={selectedHex}
                onSelect={handleSelect}
              />
            </div>
          )}
          {error && location && (
            <div
              className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded text-xs border"
              style={{ background: "#220000", borderColor: "#ff4444", color: "#ff6666" }}
            >
              {error}
            </div>
          )}
        </div>

        {/* Side panel */}
        {sidebarOpen && (
          <div
            className="w-64 border-l flex flex-col shrink-0"
            style={{ borderColor: colors.border, background: colors.panel }}
          >
            {/* Tabs */}
            <div
              className="flex border-b shrink-0"
              style={{ borderColor: colors.border }}
            >
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className="flex-1 py-2 text-xs transition-all"
                  style={{
                    color: activeTab === t.id ? colors.accent : colors.dim,
                    background: activeTab === t.id ? `${colors.accent}10` : "transparent",
                    borderBottom: activeTab === t.id ? `1px solid ${colors.accent}` : "1px solid transparent",
                  }}
                >
                  <span>{t.icon}</span>
                  <span className="ml-1">{t.label}</span>
                </button>
              ))}
            </div>

            {/* Panel content */}
            <div className="flex-1 overflow-hidden min-h-0">
              {activeTab === "location" && (
                <div className="h-full overflow-y-auto px-3 py-3" style={{ scrollbarWidth: "none" }}>
                  <LocationInput
                    location={location}
                    onLocationSet={handleLocationSet}
                    colorScheme={settings.colorScheme}
                  />
                </div>
              )}
              {activeTab === "info" && (
                <AircraftPanel
                  aircraft={selectedAircraft}
                  onClose={() => setSelectedHex(null)}
                  colorScheme={settings.colorScheme}
                />
              )}
              {activeTab === "settings" && (
                <ControlPanel
                  settings={settings}
                  onChange={setSettings}
                  colorScheme={settings.colorScheme}
                />
              )}
            </div>

            {/* Footer stats */}
            {location && (
              <div
                className="px-3 py-2 border-t text-xs opacity-40 shrink-0"
                style={{ borderColor: colors.border }}
              >
                <div className="flex justify-between">
                  <span>{totalCount} aircraft</span>
                  <span>{settings.radiusNm}nm radius</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
