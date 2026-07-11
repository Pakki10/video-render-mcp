import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export function StatScene({
  big,
  small,
  accent,
}: {
  big: string;
  small: string;
  accent: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 12, mass: 0.6 } });
  const smallOpacity = interpolate(frame, [fps * 0.35, fps * 0.7], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "#0f172a",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          color: accent,
          fontSize: 220,
          fontWeight: 900,
          letterSpacing: -6,
          transform: `scale(${scale})`,
          lineHeight: 1,
        }}
      >
        {big}
      </div>
      <div
        style={{
          color: "rgba(255,255,255,0.85)",
          fontSize: 42,
          marginTop: 24,
          fontWeight: 500,
          opacity: smallOpacity,
          textAlign: "center",
          maxWidth: "70%",
        }}
      >
        {small}
      </div>
    </AbsoluteFill>
  );
}
