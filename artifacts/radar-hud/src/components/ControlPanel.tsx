import { RadarSettings } from "../types";

interface Props {
  settings: RadarSettings;
  onChange: (s: RadarSettings) => void;
  colorScheme: "green" | "blue" | "amber";
}

const SCHEME_COLORS = {
  green: { accent: "#00ff3c", dim: "#005500", border: "#003300", bg: "#001500" },
  blue: { accent: "#3a8fff", dim: "#002255", border: "#001833", bg: "#00091a" },
  amber: { accent: "#ffaa00", dim: "#442200", border: "#2a1400", bg: "#120800" },
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  accent,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  accent: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <label className="text-xs font-mono opacity-50">{label}</label>
        <span className="text-xs font-mono font-bold" style={{ color: accent }}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 rounded appearance-none cursor-pointer"
        style={{
          background: `linear-gradient(to right, ${accent} 0%, ${accent} ${((value - min) / (max - min)) * 100}%, #222 ${((value - min) / (max - min)) * 100}%, #222 100%)`,
          accentColor: accent,
        }}
      />
    </div>
  );
}

export function ControlPanel({ settings, onChange, colorScheme }: Props) {
  const colors = SCHEME_COLORS[colorScheme];

  const toggle = (key: keyof RadarSettings, val: unknown) => {
    onChange({ ...settings, [key]: val });
  };

  return (
    <div className="h-full overflow-y-auto font-mono space-y-4 px-3 py-3" style={{ color: colors.accent, scrollbarWidth: "none" }}>
      <div className="text-xs font-bold tracking-widest uppercase opacity-40">Display</div>

      <SliderRow
        label="Range"
        value={settings.radiusNm}
        min={10}
        max={500}
        step={5}
        display={`${settings.radiusNm} nm`}
        onChange={(v) => toggle("radiusNm", v)}
        accent={colors.accent}
      />

      <SliderRow
        label="Refresh"
        value={settings.refreshIntervalMs}
        min={1000}
        max={10000}
        step={500}
        display={`${(settings.refreshIntervalMs / 1000).toFixed(1)}s`}
        onChange={(v) => toggle("refreshIntervalMs", v)}
        accent={colors.accent}
      />

      <div className="border-t opacity-10" style={{ borderColor: colors.accent }} />
      <div className="text-xs font-bold tracking-widest uppercase opacity-40">Options</div>

      {/* Radar mode */}
      <div className="space-y-1.5">
        <div className="text-xs opacity-50">Radar Mode</div>
        <div className="flex gap-2">
          {(["sweep", "static"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => toggle("radarMode", mode)}
              className="flex-1 py-1 text-xs border rounded transition-all"
              style={{
                borderColor: settings.radarMode === mode ? colors.accent : colors.border,
                background: settings.radarMode === mode ? colors.dim : "transparent",
                color: settings.radarMode === mode ? colors.accent : colors.dim,
              }}
            >
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Labels toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs opacity-50">Show Labels</span>
        <button
          onClick={() => toggle("showLabels", !settings.showLabels)}
          className="relative w-9 h-5 rounded-full transition-all border"
          style={{
            background: settings.showLabels ? colors.dim : "transparent",
            borderColor: settings.showLabels ? colors.accent : colors.border,
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
            style={{
              background: settings.showLabels ? colors.accent : colors.border,
              left: settings.showLabels ? "calc(100% - 18px)" : "2px",
            }}
          />
        </button>
      </div>

      {/* Trails toggle */}
      <div className="flex items-center justify-between">
        <span className="text-xs opacity-50">Show Trails</span>
        <button
          onClick={() => toggle("showTrails", !settings.showTrails)}
          className="relative w-9 h-5 rounded-full transition-all border"
          style={{
            background: settings.showTrails ? colors.dim : "transparent",
            borderColor: settings.showTrails ? colors.accent : colors.border,
          }}
        >
          <span
            className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
            style={{
              background: settings.showTrails ? colors.accent : colors.border,
              left: settings.showTrails ? "calc(100% - 18px)" : "2px",
            }}
          />
        </button>
      </div>

      <div className="border-t opacity-10" style={{ borderColor: colors.accent }} />
      <div className="text-xs font-bold tracking-widest uppercase opacity-40">Color</div>

      <div className="grid grid-cols-2 gap-1.5">
        {([
          { key: "green", color: "#00ff3c", label: "PPI" },
          { key: "blue", color: "#3a8fff", label: "NAVY" },
          { key: "amber", color: "#ffaa00", label: "ATCO" },
          { key: "map", color: "#4fc3f7", label: "MAP" },
        ] as const).map((s) => (
          <button
            key={s.key}
            onClick={() => toggle("colorScheme", s.key)}
            className="py-1.5 text-xs border rounded transition-all font-mono"
            style={{
              borderColor: settings.colorScheme === s.key ? s.color : "#222",
              background: settings.colorScheme === s.key ? `${s.color}22` : "transparent",
              color: settings.colorScheme === s.key ? s.color : "#444",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>
      {settings.colorScheme === "map" && (
        <div className="text-xs opacity-40 mt-1 leading-tight">
          Real map view. Planes colored by altitude.
        </div>
      )}
    </div>
  );
}
