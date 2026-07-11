import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export function TitleScene({
  copy,
  subtitle,
  accent,
}: {
  copy: string;
  subtitle?: string;
  accent: string;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enter = interpolate(frame, [0, fps * 0.4], [0, 1], { extrapolateRight: "clamp" });
  const slideY = interpolate(frame, [0, fps * 0.5], [40, 0], { extrapolateRight: "clamp" });
  const underline = interpolate(frame, [fps * 0.3, fps * 0.9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        alignItems: "center",
        justifyContent: "center",
        padding: 80,
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          opacity: enter,
          transform: `translateY(${slideY}px)`,
        }}
      >
        <h1
          style={{
            color: "white",
            fontSize: 100,
            fontWeight: 800,
            margin: 0,
            letterSpacing: -2,
            lineHeight: 1.05,
          }}
        >
          {copy}
        </h1>
        <div
          style={{
            marginTop: 24,
            height: 6,
            width: `${underline * 60}%`,
            background: accent,
            marginLeft: "auto",
            marginRight: "auto",
            borderRadius: 4,
          }}
        />
        {subtitle ? (
          <p
            style={{
              color: "rgba(255,255,255,0.75)",
              fontSize: 36,
              marginTop: 32,
              fontWeight: 400,
            }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </AbsoluteFill>
  );
}
