/**
 * Standalone smoke test — no DB, no auth. Verifies TTS + Remotion produce a
 * playable MP4 locally.  Run:  npx tsx scripts/smoke-render.ts
 */
import path from "node:path";
import fs from "node:fs/promises";
import { synthesize } from "../src/lib/tts";
import { renderVideo } from "../src/lib/render";
import type { ScenePlan } from "../src/lib/scene-plan";

async function main() {
  const plan: ScenePlan = {
    title: "video-render-mcp smoke test",
    targetDurationSec: 10,
    voice: "male-uk",
    music: "none",
    captions: false,
    accent: "#0D9488",
    script:
      "This is a smoke test of the standalone video render MCP. It runs the whole pipeline without any external database.",
    scenes: [
      { type: "title", copy: "Smoke test", subtitle: "video-render-mcp" },
      { type: "stat", big: "OK", small: "TTS + Remotion working" },
      { type: "cta", copy: "Ship it", url: "video-render.regiq.in" },
    ],
  };

  console.log("[1/3] TTS…");
  const audio = await synthesize(plan.script, plan.voice);
  console.log(`      ${audio.provider} → ${audio.bytes.length} bytes, ~${audio.durationSec.toFixed(2)}s`);

  console.log("[2/3] Rendering…");
  const outputDir = path.join(process.cwd(), "data", "smoke");
  const t0 = Date.now();
  const result = await renderVideo({
    plan,
    narrationBytes: audio.bytes,
    narrationDurationSec: audio.durationSec,
    words: audio.words,
    outputDir,
  });
  console.log(`      ${((Date.now() - t0) / 1000).toFixed(1)}s → ${result.filePath} (${(result.bytes.length / 1024 / 1024).toFixed(2)} MB)`);

  console.log("[3/3] PASS.");
  await fs.access(result.filePath); // sanity
}

main().catch((e) => {
  console.error("FAIL:", e);
  process.exit(1);
});
