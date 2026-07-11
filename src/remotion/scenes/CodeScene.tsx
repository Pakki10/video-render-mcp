import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export function CodeScene({
  language,
  snippet,
  caption,
  highlightLines,
  accent,
}: {
  language: string;
  snippet: string;
  caption?: string;
  highlightLines?: number[];
  accent: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const highlightSet = new Set(highlightLines ?? []);
  const lines = snippet.split("\n");

  const lineReveal = (idx: number) => {
    const start = fps * 0.25 + idx * 2;
    return interpolate(frame, [start, start + fps * 0.2], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
  };

  return (
    <AbsoluteFill
      style={{
        background: "#0b1220",
        padding: 60,
        fontFamily: "'Fira Code', 'Consolas', monospace",
        justifyContent: "center",
      }}
    >
      {caption ? (
        <div
          style={{
            color: "rgba(255,255,255,0.75)",
            fontSize: 32,
            marginBottom: 24,
            opacity: enter,
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {caption}
        </div>
      ) : null}
      <div
        style={{
          background: "#0f1a2e",
          border: `1px solid rgba(255,255,255,0.08)`,
          borderRadius: 16,
          padding: "28px 36px",
          opacity: enter,
          boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        }}
      >
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <span style={dot("#ef4444")} />
          <span style={dot("#eab308")} />
          <span style={dot("#22c55e")} />
          <span style={{ marginLeft: 12, color: "rgba(255,255,255,0.4)", fontSize: 18 }}>
            {language}
          </span>
        </div>
        <pre style={{ margin: 0, fontSize: 28, lineHeight: 1.55 }}>
          {lines.map((line, i) => {
            const highlighted = highlightSet.has(i + 1);
            const alpha = lineReveal(i);
            return (
              <div
                key={i}
                style={{
                  color: highlighted ? "#fff" : "rgba(255,255,255,0.72)",
                  background: highlighted ? `${accent}22` : "transparent",
                  borderLeft: highlighted ? `3px solid ${accent}` : "3px solid transparent",
                  padding: "2px 12px",
                  opacity: alpha,
                }}
              >
                <span style={{ color: "rgba(255,255,255,0.3)", marginRight: 16 }}>
                  {String(i + 1).padStart(2, " ")}
                </span>
                {line || " "}
              </div>
            );
          })}
        </pre>
      </div>
    </AbsoluteFill>
  );
}

const dot = (color: string): React.CSSProperties => ({
  width: 14,
  height: 14,
  borderRadius: 999,
  background: color,
  display: "inline-block",
});
