import { z } from "zod";

/**
 * ScenePlan — the contract Claude (or any MCP client) fills in when it wants
 * a video rendered. Passed straight through to the Remotion composition as
 * `inputProps`.
 */

export const sceneSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("title"),
    copy: z.string(),
    subtitle: z.string().optional(),
  }),
  z.object({
    type: z.literal("code"),
    language: z.string(),
    snippet: z.string(),
    caption: z.string().optional(),
    highlightLines: z.array(z.number()).optional(),
  }),
  z.object({
    type: z.literal("stat"),
    big: z.string().describe("Big number or phrase, e.g. '11ms'"),
    small: z.string().describe("Small caption under it"),
  }),
  z.object({
    type: z.literal("cta"),
    url: z.string(),
    copy: z.string(),
  }),
]);

export const scenePlanSchema = z.object({
  title: z.string(),
  targetDurationSec: z.number().int().min(5).max(180).default(30),
  script: z.string().describe("Full narration text. Size it to ~150 wpm × duration."),
  voice: z
    .enum(["male-uk", "female-uk", "male-us", "female-us"])
    .default("male-uk"),
  scenes: z.array(sceneSchema).min(1).max(12),
  music: z.enum(["upbeat", "chill", "tense", "none"]).default("none"),
  accent: z
    .string()
    .default("#0D9488")
    .describe("Hex accent colour for titles/CTAs"),
});

export type ScenePlan = z.infer<typeof scenePlanSchema>;
export type Scene = z.infer<typeof sceneSchema>;

/**
 * The full input passed to the Remotion composition — plan + resolved audio
 * (as a data URL) + per-scene time ranges. Index signature keeps Remotion's
 * `Record<string, unknown>` constraint happy.
 */
export interface RemotionInputProps {
  plan: ScenePlan;
  narrationDataUrl: string;
  totalDurationSec: number;
  sceneRanges: Array<{ startSec: number; endSec: number }>;
  [key: string]: unknown;
}
