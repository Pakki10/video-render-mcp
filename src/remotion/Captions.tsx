import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import type { WordTiming } from "../lib/scene-plan";

/**
 * Fireship-style burn-in captions. Shows a rolling window of ~7 words
 * around the current playhead, with the active word highlighted.
 */
export function Captions({ words }: { words: WordTiming[] }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;

  if (words.length === 0) return null;

  // Find the active word index — the one whose [startSec, endSec] covers t.
  let activeIdx = -1;
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i].startSec && t <= words[i].endSec) {
      activeIdx = i;
      break;
    }
  }
  // Fall back to nearest word so captions never go blank mid-sentence.
  if (activeIdx === -1) {
    for (let i = 0; i < words.length; i++) {
      if (words[i].startSec > t) {
        activeIdx = Math.max(0, i - 1);
        break;
      }
    }
    if (activeIdx === -1) activeIdx = words.length - 1;
  }

  // Rolling 7-word window around the active word.
  const WINDOW = 7;
  const half = Math.floor(WINDOW / 2);
  const start = Math.max(0, activeIdx - half);
  const end = Math.min(words.length, start + WINDOW);
  const slice = words.slice(start, end);

  return (
    <AbsoluteFill
      style={{
        justifyContent: "flex-end",
        alignItems: "center",
        paddingBottom: 90,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "18px 30px",
          background: "rgba(0,0,0,0.72)",
          borderRadius: 14,
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: 46,
          fontWeight: 700,
          lineHeight: 1.25,
          letterSpacing: -0.5,
          color: "rgba(255,255,255,0.85)",
          textAlign: "center",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
        }}
      >
        {slice.map((w, i) => {
          const globalIdx = start + i;
          const isActive = globalIdx === activeIdx;
          const opacity = interpolate(
            Math.abs(globalIdx - activeIdx),
            [0, half],
            [1, 0.55],
            { extrapolateRight: "clamp" }
          );
          return (
            <span
              key={globalIdx}
              style={{
                color: isActive ? "#5eead4" : "rgba(255,255,255,0.9)",
                opacity,
                margin: "0 0.28em",
              }}
            >
              {w.word}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
