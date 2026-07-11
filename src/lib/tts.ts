/**
 * Text-to-speech.
 * Default: msedge-tts (free, no API key, commercial-safe).
 * Upgrade: ElevenLabs if ELEVENLABS_API_KEY is set (better quality).
 */

type VoiceId = "male-uk" | "female-uk" | "male-us" | "female-us";

const EDGE_VOICES: Record<VoiceId, string> = {
  "male-uk": "en-GB-RyanNeural",
  "female-uk": "en-GB-SoniaNeural",
  "male-us": "en-US-GuyNeural",
  "female-us": "en-US-JennyNeural",
};

const ELEVENLABS_VOICES: Record<VoiceId, string> = {
  "male-uk": "onwK4e9ZLuTAKqWW03F9",
  "female-uk": "XrExE9yKIg1WjnnlVkGX",
  "male-us": "TxGEqnHWrfWFTfGW9XjX",
  "female-us": "21m00Tcm4TlvDq8ikWAM",
};

export interface SynthesizeResult {
  bytes: Buffer;
  mimeType: "audio/mpeg";
  durationSec: number;
  provider: "msedge-tts" | "elevenlabs";
}

export async function synthesize(
  text: string,
  voice: VoiceId = "male-uk"
): Promise<SynthesizeResult> {
  if (process.env.ELEVENLABS_API_KEY) return synthesizeElevenLabs(text, voice);
  return synthesizeEdge(text, voice);
}

async function synthesizeEdge(text: string, voice: VoiceId): Promise<SynthesizeResult> {
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
  };
}

async function synthesizeElevenLabs(text: string, voice: VoiceId): Promise<SynthesizeResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY!;
  const voiceId = ELEVENLABS_VOICES[voice];
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
      Accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`ElevenLabs TTS failed: ${res.status} ${err.slice(0, 200)}`);
  }
  const bytes = Buffer.from(await res.arrayBuffer());
  return {
    bytes,
    mimeType: "audio/mpeg",
    durationSec: estimateDurationFromMp3(bytes, 128000),
    provider: "elevenlabs",
  };
}

function estimateDurationFromMp3(buf: Buffer, bitrateBps: number): number {
  return (buf.length * 8) / bitrateBps;
}
