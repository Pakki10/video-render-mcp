import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "video-render-mcp — Hyperplexed-style video renders for any AI agent",
  description:
    "MCP server that turns a script into a motion-graphics MP4. Free voice, Remotion animations, no watermark. Plug the URL into Claude Desktop or any MCP client.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        {children}
      </body>
    </html>
  );
}
