/**
 * Server-side Remotion renderer. Bundles the composition once per process
 * and reuses it. Writes MP4 to disk under RENDER_DATA_DIR.
 */

import path from "node:path";
import os from "node:os";
import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { RemotionInputProps, ScenePlan, Scene } from "./scene-plan";

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;

const BROWSER_EXECUTABLE =
  process.env.REMOTION_CHROME_EXECUTABLE ||
  process.env.PUPPETEER_EXECUTABLE_PATH ||
  null;

let cachedBundleUrl: string | null = null;

async function getBundle(): Promise<string> {
  if (cachedBundleUrl) return cachedBundleUrl;
  const entry = path.join(process.cwd(), "src", "remotion", "index.tsx");
  const outDir = path.join(os.tmpdir(), `remotion-bundle-${process.pid}`);
  await fs.mkdir(outDir, { recursive: true });
  cachedBundleUrl = await bundle({
    entryPoint: entry,
    outDir,
    webpackOverride: (config) => config,
  });
  return cachedBundleUrl;
}

export function computeSceneRanges(
  plan: ScenePlan,
  totalDurationSec: number
): Array<{ startSec: number; endSec: number }> {
  const weights = plan.scenes.map((s) => sceneWeight(s));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || plan.scenes.length;
  let t = 0;
  return plan.scenes.map((_, i) => {
    const duration = (weights[i] / totalWeight) * totalDurationSec;
    const startSec = t;
    const endSec = t + duration;
    t = endSec;
    return { startSec, endSec };
  });
}

function sceneWeight(scene: Scene): number {
  switch (scene.type) {
    case "title":
      return 2;
    case "code":
      return Math.max(3, Math.min(6, scene.snippet.split("\n").length * 0.5));
    case "stat":
      return 2;
    case "cta":
      return 2.5;
  }
}

export interface RenderVideoArgs {
  plan: ScenePlan;
  narrationBytes: Buffer;
  narrationDurationSec: number;
  /** Absolute directory that the caller owns; the mp4 will land here. */
  outputDir: string;
}

export interface RenderVideoResult {
  filePath: string;
  bytes: Buffer;
  mimeType: "video/mp4";
  durationSec: number;
  frameCount: number;
}

export async function renderVideo(args: RenderVideoArgs): Promise<RenderVideoResult> {
  const { plan, narrationBytes, narrationDurationSec, outputDir } = args;

  const totalDurationSec = Math.max(1, narrationDurationSec);
  const sceneRanges = computeSceneRanges(plan, totalDurationSec);
  const inputProps: RemotionInputProps = {
    plan,
    narrationDataUrl: `data:audio/mpeg;base64,${narrationBytes.toString("base64")}`,
    totalDurationSec,
    sceneRanges,
  };

  const serveUrl = await getBundle();
  const composition = await selectComposition({
    serveUrl,
    id: "HyperplexedStyle",
    inputProps,
    ...(BROWSER_EXECUTABLE ? { browserExecutable: BROWSER_EXECUTABLE } : {}),
  });

  const durationInFrames = Math.max(1, Math.round(totalDurationSec * FPS));

  await fs.mkdir(outputDir, { recursive: true });
  const outPath = path.join(outputDir, `${randomUUID()}.mp4`);

  await renderMedia({
    serveUrl,
    composition: { ...composition, durationInFrames, fps: FPS, width: WIDTH, height: HEIGHT },
    codec: "h264",
    outputLocation: outPath,
    inputProps,
    concurrency: 1,
    ...(BROWSER_EXECUTABLE ? { browserExecutable: BROWSER_EXECUTABLE } : {}),
  });

  const bytes = await fs.readFile(outPath);
  return {
    filePath: outPath,
    bytes,
    mimeType: "video/mp4",
    durationSec: totalDurationSec,
    frameCount: durationInFrames,
  };
}
