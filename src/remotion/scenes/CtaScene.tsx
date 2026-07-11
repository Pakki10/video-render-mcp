import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export function CtaScene({
  url,
  copy,
  accent,
}: {
  url: string;
  copy: string;
  accent: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = spring({ frame, fps, config: { damping: 10 } });
  const pulse = 1 + Math.sin(frame / 6) * 0.02;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 50%, ${accent}22 0%, #0f172a 70%)`,
        alignItems: "center",
        justifyContent: "center",
        padding: 60,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          transform: `scale(${enter})`,
        }}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.9)",
            fontSize: 54,
            fontWeight: 700,
            marginBottom: 30,
            lineHeight: 1.15,
          }}
        >
          {copy}
        </div>
        <div
          style={{
            display: "inline-block",
            padding: "22px 44px",
            border: `3px solid ${accent}`,
            borderRadius: 14,
            color: "white",
            fontSize: 44,
            fontWeight: 600,
            background: `${accent}18`,
            transform: `scale(${pulse})`,
            fontFamily: "'Fira Code', Consolas, monospace",
          }}
        >
          {url}
        </div>
      </div>
    </AbsoluteFill>
  );
}
