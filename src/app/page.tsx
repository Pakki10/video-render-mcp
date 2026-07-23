import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignInButton } from "./signin-button";

/**
 * Landing page — has to work as both marketing and reference docs, because
 * the audience is "an engineer who's about to point an LLM at this and needs
 * to know exactly what it does, what it costs, and how to call it."
 */

const CLAUDE_DESKTOP_CONFIG = `{
  "mcpServers": {
    "video-render": {
      "url": "https://video-render.regiq.in/api/mcp",
      "headers": {
        "Authorization": "Bearer vrm_live_..."
      }
    }
  }
}`;

const CURL_EXAMPLE = `curl -X POST https://video-render.regiq.in/api/mcp \\
  -H "Authorization: Bearer vrm_live_..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "jsonrpc":"2.0","id":1,"method":"tools/call",
    "params":{"name":"render_video","arguments":{
      "title":"My video",
      "targetDurationSec":30,
      "voice":"female-uk",
      "script":"Hello world...",
      "scenes":[
        {"type":"title","copy":"My video"},
        {"type":"cta","url":"example.com","copy":"Try it"}
      ]
    }}
  }'`;

const SCENE_PLAN_EXAMPLE = `{
  "title": "60-second product explainer",
  "targetDurationSec": 60,
  "voice": "premium-female-uk",
  "music": "upbeat",
  "captions": true,
  "accent": "#0EA5A0",
  "script": "Your full narration here, sized to ~150 wpm × duration...",
  "scenes": [
    { "type": "image",
      "src": "data:image/png;base64,iVBORw0K...",
      "caption": "A friendly helper — on your phone",
      "fit": "contain" },
    { "type": "stat",
      "big": "Reminders",
      "small": "Pinged on WhatsApp when it's time",
      "image": "https://example.com/whatsapp-mockup.svg" },
    { "type": "code",
      "language": "typescript",
      "snippet": "const x: number = 42;\\nconsole.log(x);",
      "caption": "Fully typed" },
    { "type": "cta", "url": "paperloft.uk", "copy": "Free to try" }
  ]
}`;

const POLL_EXAMPLE = `# 1. Enqueue (returns in <1s)
POST /api/mcp  ->  { "jobId": "cmr...", "statusUrl": ".../api/jobs/cmr...",
                     "videoUrl": ".../api/renders/cmr....mp4" }

# 2. Poll every 5s until success (auth required)
GET /api/jobs/{jobId}  ->  { "status": "pending" | "rendering"
                                    | "success"  | "failed",
                             "videoUrl": "..." (when success),
                             "durationSec": 46.8,   "sizeBytes": 8829777 }

# 3. Fetch the mp4 (public, valid 7 days)
GET /api/renders/{jobId}.mp4`;

const VOICES: Array<{ id: string; label: string; tier: "free" | "premium" }> = [
  { id: "male-uk", label: "Ryan · UK male", tier: "free" },
  { id: "female-uk", label: "Sonia · UK female", tier: "free" },
  { id: "male-us", label: "Guy · US male", tier: "free" },
  { id: "female-us", label: "Jenny · US female", tier: "free" },
  { id: "premium-male-uk", label: "Daniel · UK male", tier: "premium" },
  { id: "premium-female-uk", label: "Matilda · UK female", tier: "premium" },
  { id: "premium-male-us", label: "Josh · US male", tier: "premium" },
  { id: "premium-female-us", label: "Rachel · US female", tier: "premium" },
];

const SCENE_TYPES = [
  {
    name: "title",
    desc: "Big animated headline with an accent underline and optional subtitle. Ideal opener.",
    fields: "copy, subtitle?",
  },
  {
    name: "image",
    desc: "Full-frame image with Ken Burns pan/zoom. Accepts https URLs or data:image/* URLs — inline your own screenshots, photos, or SVG mockups.",
    fields: "src, caption?, kenBurns?, fit?, background?",
  },
  {
    name: "stat",
    desc: "Big word or number with a caption underneath. Add an image and it switches to two-column (mockup left, copy right).",
    fields: "big, small, image?",
  },
  {
    name: "code",
    desc: "Syntax-highlighted code snippet with optional highlighted lines and a caption underneath.",
    fields: "language, snippet, caption?, highlightLines?",
  },
  {
    name: "cta",
    desc: "Radial-glow call-to-action with a pulsing URL bubble. Use for the closing frame.",
    fields: "url, copy",
  },
];

export default async function LandingPage() {
  const session = await auth().catch(() => null);
  const signedIn = !!session?.user;

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      {/* ---------- HERO ---------- */}
      <div className="mb-16 flex flex-col gap-10 md:flex-row md:items-center">
        <div className="md:flex-1">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs text-neutral-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-teal-400" />
            MCP · streamable-http · async jobs
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            video-render-mcp
          </h1>
          <p className="mt-4 text-lg text-neutral-400">
            Give any AI agent a scene plan, get a{" "}
            <span className="text-neutral-200">1080p MP4</span> back. Motion
            graphics + AI narration + optional captions + your own images. One
            MCP tool call, no watermark, no post-production.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {signedIn ? (
              <Link
                href="/dashboard"
                className="rounded-lg bg-teal-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-teal-400"
              >
                Get your API key →
              </Link>
            ) : (
              <SignInButton />
            )}
            <Link
              href="#quickstart"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              Quickstart ↓
            </Link>
            <Link
              href="https://github.com/globalion/video-render-mcp"
              target="_blank"
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800"
            >
              GitHub ↗
            </Link>
          </div>
        </div>

        {/* demo video */}
        <div className="md:flex-1">
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-black shadow-2xl shadow-teal-500/10">
            <video
              src="/demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              controls
              className="w-full"
              poster=""
            />
          </div>
          <p className="mt-2 text-center text-xs text-neutral-500">
            56s explainer rendered by this MCP — premium voice + custom SVG
            mockups + Ken Burns
          </p>
        </div>
      </div>

      {/* ---------- HOW IT WORKS ---------- */}
      <Section title="How it works">
        <div className="grid gap-4 md:grid-cols-3">
          <Step
            n={1}
            title="Describe"
            body="Tell your agent what you want. It drafts a scene plan — title, stats, images, script, voice."
          />
          <Step
            n={2}
            title="Render"
            body={
              <>
                Agent calls{" "}
                <Code>render_video</Code>. Returns a <Code>jobId</Code> in
                &lt;1s. Actual render runs 30–300s server-side.
              </>
            }
          />
          <Step
            n={3}
            title="Poll + download"
            body={
              <>
                Poll <Code>GET /api/jobs/{"{id}"}</Code> every ~5s. Once{" "}
                <Code>status=success</Code>, fetch the MP4. Valid 7 days.
              </>
            }
          />
        </div>
      </Section>

      {/* ---------- QUICKSTART ---------- */}
      <Section title="Quickstart" anchor="quickstart">
        <div className="space-y-6">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-200">
              1. Get an API key
            </h3>
            <p className="text-sm text-neutral-400">
              Sign in with Google (100 free credits ≈ 5 minutes of free-voice
              video or ~100s of premium voice). Rotate the key any time from
              the dashboard.
            </p>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-200">
              2. Wire it into your MCP client
            </h3>
            <p className="mb-3 text-sm text-neutral-400">
              Claude Desktop / Cursor / Zed — any MCP client with
              streamable-http support:
            </p>
            <CodeBlock>{CLAUDE_DESKTOP_CONFIG}</CodeBlock>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold text-neutral-200">
              3. Or hit the JSON-RPC endpoint directly
            </h3>
            <CodeBlock>{CURL_EXAMPLE}</CodeBlock>
          </div>
        </div>
      </Section>

      {/* ---------- TOOLS ---------- */}
      <Section title="The two tools">
        <div className="space-y-6">
          <Tool
            name="plan_video_scenes"
            purpose="Draft a scene plan from a natural-language brief."
            body={
              <>
                Pure scaffolder — echoes back a validated{" "}
                <Code>ScenePlan</Code> the model can iterate on with the user
                before spending credits. Free.
              </>
            }
          />
          <Tool
            name="render_video"
            purpose="Enqueue an async render of an MP4 from a ScenePlan."
            body={
              <>
                Returns immediately with{" "}
                <Code>{"{ jobId, statusUrl, videoUrl }"}</Code>. Deducts credits
                up front (refunded on failure). Renders 60–300s server-side;
                poll <Code>statusUrl</Code>. Async by design so a{" "}
                Cloudflare-tunnel-style 100s HTTP cap can&apos;t 524 the
                render.
              </>
            }
          />
        </div>
      </Section>

      {/* ---------- ASYNC MODEL ---------- */}
      <Section title="Async job model">
        <CodeBlock>{POLL_EXAMPLE}</CodeBlock>
      </Section>

      {/* ---------- SCENE TYPES ---------- */}
      <Section title="Scene types">
        <p className="mb-4 text-sm text-neutral-400">
          A scene plan is 1–12 scenes, each one of these types. Duration is
          allocated proportionally to the scenes based on their kind.
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {SCENE_TYPES.map((s) => (
            <div
              key={s.name}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="mb-1 flex items-baseline gap-2">
                <span className="rounded bg-teal-500/15 px-2 py-0.5 text-xs font-semibold text-teal-300">
                  {s.name}
                </span>
                <span className="text-xs text-neutral-500">{s.fields}</span>
              </div>
              <p className="text-sm text-neutral-300">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ---------- EXAMPLE ---------- */}
      <Section title="Example scene plan">
        <p className="mb-3 text-sm text-neutral-400">
          Send this as the <Code>arguments</Code> object to a{" "}
          <Code>render_video</Code> tools/call. Images are optional — omit them
          for pure motion-graphics text.
        </p>
        <CodeBlock>{SCENE_PLAN_EXAMPLE}</CodeBlock>
      </Section>

      {/* ---------- VOICES ---------- */}
      <Section title="Voices">
        <div className="grid gap-2 md:grid-cols-2">
          {VOICES.map((v) => (
            <div
              key={v.id}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3"
            >
              <div>
                <div className="text-sm text-neutral-100">{v.label}</div>
                <div className="mt-0.5 font-mono text-xs text-neutral-500">
                  {v.id}
                </div>
              </div>
              <span
                className={
                  v.tier === "premium"
                    ? "rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-300"
                    : "rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400"
                }
              >
                {v.tier === "premium" ? "premium · 3× credits" : "free"}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-neutral-400">
          Free = Microsoft Edge neural (msedge-tts, no key needed). Premium =
          ElevenLabs Turbo v2.5 with word-level timestamps for burn-in
          captions. Premium voices sound noticeably more human but cost 3×;
          captions add another 25%.
        </p>
      </Section>

      {/* ---------- CREDITS ---------- */}
      <Section title="Credits">
        <div className="grid gap-3 md:grid-cols-3">
          <Pack name="Starter" price="$2" credits="1,700" note="≈ 85 min free voice" />
          <Pack name="Regular" price="$5" credits="5,500" note="10% bonus · best per-second value" highlight />
          <Pack name="Bulk" price="$20" credits="25,000" note="33% bonus · agency" />
        </div>
        <p className="mt-4 text-sm text-neutral-400">
          New accounts start with <span className="text-neutral-200">100 free credits</span>. 1 credit ≈ 3
          seconds of free-voice output, or ≈ 1 second of premium voice.
          Rendering is free — you only pay for narration seconds.
        </p>
      </Section>

      {/* ---------- SELF-HOST ---------- */}
      <Section title="Self-host">
        <p className="text-sm text-neutral-400">
          MIT-licensed. Clone the repo, drop in a Postgres URL and (optionally)
          an ElevenLabs key, <Code>docker compose up</Code>. Full source for
          everything you see here.
        </p>
        <div className="mt-4 flex gap-3">
          <Link
            href="https://github.com/globalion/video-render-mcp"
            target="_blank"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            GitHub ↗
          </Link>
          <Link
            href="https://github.com/globalion/video-render-mcp/blob/main/README.md"
            target="_blank"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-5 py-2.5 text-sm text-neutral-200 hover:bg-neutral-800"
          >
            README ↗
          </Link>
        </div>
      </Section>

      <footer className="mt-16 border-t border-neutral-800 pt-6 text-xs text-neutral-500">
        Built by Shreyas Pavuluri · Published by Globalion · MIT
      </footer>
    </main>
  );
}

// ---------- helpers ----------

function Section({
  title,
  anchor,
  children,
}: {
  title: string;
  anchor?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={anchor} className="mb-14 scroll-mt-20">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-teal-500 text-xs font-bold text-black">
        {n}
      </div>
      <div className="mb-1 text-sm font-semibold text-neutral-100">{title}</div>
      <p className="text-sm text-neutral-400">{body}</p>
    </div>
  );
}

function Tool({
  name,
  purpose,
  body,
}: {
  name: string;
  purpose: string;
  body: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-2 flex items-baseline gap-3">
        <code className="rounded bg-teal-500/15 px-2 py-0.5 text-sm font-semibold text-teal-300">
          {name}
        </code>
        <span className="text-sm text-neutral-400">{purpose}</span>
      </div>
      <p className="text-sm text-neutral-300">{body}</p>
    </div>
  );
}

function Pack({
  name,
  price,
  credits,
  note,
  highlight,
}: {
  name: string;
  price: string;
  credits: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        "rounded-lg border p-5 " +
        (highlight
          ? "border-teal-500/60 bg-teal-500/5"
          : "border-neutral-800 bg-neutral-900")
      }
    >
      <div className="text-xs uppercase tracking-wider text-neutral-500">{name}</div>
      <div className="mt-1 text-3xl font-bold text-neutral-100">{price}</div>
      <div className="mt-1 text-sm text-neutral-300">{credits} credits</div>
      <div className="mt-2 text-xs text-neutral-500">{note}</div>
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-neutral-800 px-1.5 py-0.5 text-teal-300">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="overflow-x-auto rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-xs leading-relaxed text-neutral-200">
      {children}
    </pre>
  );
}
