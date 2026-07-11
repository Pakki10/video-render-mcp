import { Composition, getInputProps } from "remotion";
import { HyperplexedStyle } from "./HyperplexedStyle";
import type { RemotionInputProps } from "../lib/scene-plan";

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;

/**
 * Composition entry point. The renderer supplies real inputProps when it calls
 * renderMedia(); the fallbacks below only exist so the Remotion Studio preview
 * (`npx remotion studio`) doesn't crash on a bare load.
 */
export function RemotionRoot() {
  const raw = getInputProps() as Partial<RemotionInputProps>;
  const totalDurationSec =
    typeof raw.totalDurationSec === "number" && raw.totalDurationSec > 0
      ? raw.totalDurationSec
      : 10;

  return (
    <Composition
      id="HyperplexedStyle"
      component={HyperplexedStyle}
      durationInFrames={Math.max(1, Math.round(totalDurationSec * FPS))}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={buildDefaults()}
    />
  );
}

function buildDefaults(): RemotionInputProps {
  return {
    plan: {
      title: "Preview",
      targetDurationSec: 10,
      script: "Preview.",
      voice: "male-uk",
      scenes: [{ type: "title", copy: "Preview" }],
      music: "none",
      accent: "#0D9488",
    },
    narrationDataUrl:
      "data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAABAAAB4AA=",
    totalDurationSec: 10,
    sceneRanges: [{ startSec: 0, endSec: 10 }],
  };
}
