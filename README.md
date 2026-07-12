# video-render-mcp

> Built by [**Shreyas**](https://github.com/Shreyas-Profile) · Shipped by [**Globalion**](https://github.com/globalion)

An MCP server that turns a script into a Hyperplexed-style motion-graphics MP4.
Plug the URL into Claude Desktop, Cursor, or any MCP-compatible agent and it
gains a `render_video` tool.

- **No watermark.** Ever.
- **Free voice** (Microsoft Edge Neural TTS). Optional ElevenLabs upgrade via
  env var.
- **Motion graphics** via [Remotion](https://remotion.dev) — same engine
  Fireship-style channels use.
- **MCP over streamable-HTTP** — one URL, no local installation for the user.

Hosted for free at **[video-render.regiq.in](https://video-render.regiq.in)**
(20 renders/day per Google account) or self-host with the Docker Compose below.

## Use it (hosted)

1. Visit https://video-render.regiq.in and sign in with Google.
2. Copy your API key from the dashboard.
3. Add to Claude Desktop's `claude_desktop_config.json`:

    ```json
    {
      "mcpServers": {
        "video-render": {
          "url": "https://video-render.regiq.in/api/mcp",
          "headers": {
            "Authorization": "Bearer YOUR_KEY_HERE"
          }
        }
      }
    }
    ```

4. Restart Claude Desktop. Ask it: *"Make a 30-second promo video for X,
   Fireship style, then hand me the MP4."*

The agent will call `plan_video_scenes`, show you the plan, and — on your
confirmation — call `render_video` and return a downloadable MP4 URL.

## Tools

| Tool | Purpose |
|------|---------|
| `plan_video_scenes` | Fill a `ScenePlan` schema (title, targetDurationSec 5–180, script, 1–12 scenes, voice, accent). Returns the plan for user review — no server work. |
| `render_video` | Synthesise narration + render the MP4. Returns `{ videoUrl, durationSec, sizeBytes }`. The URL is valid for 7 days. |

Both tools take the same `ScenePlan` shape:

```ts
{
  title: string;
  targetDurationSec: number;            // 5..180
  script: string;                       // Claude sizes it to ~150 wpm × duration
  voice: "male-uk" | "female-uk" | "male-us" | "female-us";
  scenes: Array<
    | { type: "title";  copy: string;  subtitle?: string }
    | { type: "code";   language: string; snippet: string; caption?: string; highlightLines?: number[] }
    | { type: "stat";   big: string;   small: string }
    | { type: "cta";    url: string;   copy: string }
  >;
  music?: "upbeat" | "chill" | "tense" | "none";
  accent?: string;                      // hex, defaults to "#0D9488"
}
```

## Self-host

You'll need:
- Docker + Compose
- A Google OAuth client — [Cloud Console](https://console.cloud.google.com/apis/credentials)
- A domain pointed at the server (or run on `localhost:3010`)

Then:

```bash
git clone https://github.com/globalion/video-render-mcp
cd video-render-mcp
cp .env.example .env
# edit .env — set NEXTAUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, NEXTAUTH_URL, PUBLIC_BASE_URL
docker compose up -d
```

Open http://localhost:3010, sign in, copy your key, point Claude Desktop at
`http://localhost:3010/api/mcp`.

## Limits (hosted tier)

- 20 successful renders per Google account per UTC day
- 720p H.264
- Up to 180-second videos
- MP4s expire 7 days after render

Self-host removes all of these.

## License

MIT.
