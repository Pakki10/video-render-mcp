/**
 * Text-to-speech.
 * Free tier: msedge-tts (Microsoft Edge neural, no key, no cost).
 * Premium tier: ElevenLabs — human-indistinguishable + word-level timestamps
 * for burn-in captions. Requires ELEVENLABS_API_KEY.
 */

import type { WordTiming } from "./scene-plan";

type VoiceId =
  | "male-uk"
  | "female-uk"
  | "male-us"
  | "female-us"
  | "premium-male-uk"
  | "premium-female-uk"
  | "premium-male-us"
  | "premium-female-us";

const EDGE_VOICES: Record<Exclude<VoiceId, `premium-${string}`>, string> = {
  "male-uk": "en-GB-RyanNeural",
  "female-uk": "en-GB-SoniaNeural",
  "male-us": "en-US-GuyNeural",
  "female-us": "en-US-JennyNeural",
};

// ElevenLabs voice IDs — hand-picked from their public library for the
// closest match to each accent/gender the Edge voices offer.
const ELEVENLABS_VOICES: Record<`premium-${string}`, string> = {
  "premium-male-uk": "onwK4e9ZLuTAKqWW03F9", // Daniel
  "premium-female-uk": "XrExE9yKIg1WjnnlVkGX", // Matilda
  "premium-male-us": "TxGEqnHWrfWFTfGW9XjX", // Josh
  "premium-female-us": "21m00Tcm4TlvDq8ikWAM", // Rachel
};

export interface SynthesizeResult {
  bytes: Buffer;
  mimeType: "audio/mpeg";
  durationSec: number;
  provider: "msedge-tts" | "elevenlabs";
  /** Word-level timings — populated only for ElevenLabs. */
  words: WordTiming[];
}

export async function synthesize(text: string, voice: VoiceId): Promise<SynthesizeResult> {
  if (voice.startsWith("premium-")) {
    if (!process.env.ELEVENLABS_API_KEY) {
      throw new Error(
        "Premium voice requested but ELEVENLABS_API_KEY is not set on the server."
      );
    }
    return synthesizeElevenLabs(text, voice as `premium-${string}`);
  }
  return synthesizeEdge(text, voice as Exclude<VoiceId, `premium-${string}`>);
}

async function synthesizeEdge(
  text: string,
  voice: Exclude<VoiceId, `premium-${string}`>
): Promise<SynthesizeResult> {
  const { MsEdgeTTS, OUTPUT_FORMAT } = await import("msedge-tts");
  const tts = new MsEdgeTTS();
  await tts.setMetadata(EDGE_VOICES[voice], OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  const { audioStream } = tts.toStream(text);

  const chunks: Buffer[] = [];
  await new Promise<void>((resolve, reject) => {
    audioStream.on("data", (c: Buffer) => chunks.push(c));
    audioStream.on("end", () => resolve());
    audioStream.on("close", () => resolve());
    audioStream.on("error", (e: Error) => reject(e));
  });
  const bytes = Buffer.concat(chunks);
  return {
    bytes,
    mimeType: "audio/mpeg",
    durationSec: estimateDurationFromMp3(bytes, 48000),
    provider: "msedge-tts",
    words: [], // no timestamps available on free tier
  };
}

/**
 * ElevenLabs with timestamps. The `/with-timestamps` endpoint returns:
 *   { audio_base64, alignment: { characters, character_start_times_seconds, character_end_times_seconds } }
 * We collapse the character-level alignment into word-level timings so the
 * Remotion caption component only re-renders once per word.
 */
async function synthesizeElevenLabs(
  text: string,
  voice: `premium-${string}`
): Promise<SynthesizeResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const voiceId = ELEVENLABS_VOICES[voice];
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        output_format: "mp3_44100_128",
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${err.slice(0, 300)}`);
  }
  const json = (await res.json()) as {
    audio_base64: string;
    alignment?: {
      characters: string[];
      character_start_times_seconds: number[];
      character_end_times_seconds: number[];
    };
  };
  const bytes = Buffer.from(json.audio_base64, "base64");
  const words = json.alignment ? collapseAlignmentToWords(json.alignment) : [];
  return {
    bytes,
    mimeType: "audio/mpeg",
    durationSec: estimateDurationFromMp3(bytes, 128000),
    provider: "elevenlabs",
    words,
  };
}

function collapseAlignmentToWords(a: {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}): WordTiming[] {
  const words: WordTiming[] = [];
  let cur = "";
  let startSec = 0;
  for (let i = 0; i < a.characters.length; i++) {
    const ch = a.characters[i];
    const s = a.character_start_times_seconds[i];
    const e = a.character_end_times_seconds[i];
    const isWordBreak = /\s/.test(ch);
    if (!isWordBreak) {
      if (cur.length === 0) startSec = s;
      cur += ch;
      // On the last character of the alignment, flush.
      if (i === a.characters.length - 1 && cur.length > 0) {
        words.push({ word: cur, startSec, endSec: e });
        cur = "";
      }
    } else if (cur.length > 0) {
      words.push({ word: cur, startSec, endSec: a.character_end_times_seconds[i - 1] });
      cur = "";
    }
  }
  return words;
}

function estimateDurationFromMp3(buf: Buffer, bitrateBps: number): number {
  return (buf.length * 8) / bitrateBps;
}
