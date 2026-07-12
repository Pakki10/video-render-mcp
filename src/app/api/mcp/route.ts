import path from "node:path";
import fs from "node:fs/promises";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { findLiveKey } from "@/lib/keys";
import { readDailyUsage } from "@/lib/quota";
import { scenePlanSchema, type ScenePlan } from "@/lib/scene-plan";
import { synthesize } from "@/lib/tts";
import { renderVideo } from "@/lib/render";
import { quoteCredits, tryDeduct, refund, readBalance } from "@/lib/credits";
import {
  TOOL_DEFINITIONS,
  findTool,
  jsonSchemaFor,
  type ToolName,
} from "@/lib/mcp/tools";

const TOPUP_URL =
  (process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "") + "/dashboard#credits";

export const runtime = "nodejs";
export const maxDuration = 300; // Remotion renders can be slow

const PROTOCOL_VERSION = "2025-06-18";
const SERVER_INFO = {
  name: "video-render-mcp",
  version: "0.1.0",
};

/**
 * Standard JSON-RPC 2.0 endpoint that speaks MCP.
 *
 * Auth: Bearer <apiKey> in the Authorization header. Sign up at
 * https://video-render.regiq.in to get one.
 *
 * Quota: 20 successful renders per user per UTC day. `tools/list` and
 * `initialize` are free.
 */
export async function POST(req: Request) {
  const rpc = await req.json().catch(() => null);
  if (!isValidRpc(rpc)) return jsonRpcError(null, -32700, "Parse error");

  // initialize is the one method that doesn't require auth — it's how the
  // client discovers the server and MUST work before Claude Desktop bothers
  // with the token.
  if (rpc.method === "initialize") {
    return jsonRpcOk(rpc.id, {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }

  const auth = req.headers.get("authorization") || "";
  const raw = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const key = raw ? await findLiveKey(raw) : null;
  if (!key) return jsonRpcError(rpc.id, -32001, "Unauthorized — set Authorization: Bearer <key>");
  const userId = key.userId;

  switch (rpc.method) {
    case "tools/list":
      return jsonRpcOk(rpc.id, {
        tools: TOOL_DEFINITIONS.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: jsonSchemaFor(t.name),
        })),
      });

    case "tools/call": {
      const { name, arguments: args } = (rpc.params ?? {}) as {
        name?: string;
        arguments?: unknown;
      };
      if (!name) return jsonRpcError(rpc.id, -32602, "Missing tool name");
      const tool = findTool(name);
      if (!tool) return jsonRpcError(rpc.id, -32601, `Unknown tool: ${name}`);

      const parsed = tool.inputSchema.safeParse(args);
      if (!parsed.success) {
        return jsonRpcError(
          rpc.id,
          -32602,
          "Invalid arguments: " + JSON.stringify(parsed.error.flatten())
        );
      }

      try {
        const result = await runTool(name as ToolName, parsed.data, userId);
        return jsonRpcOk(rpc.id, result);
      } catch (err) {
        const message = (err as Error).message || String(err);
        return jsonRpcOk(rpc.id, {
          isError: true,
          content: [{ type: "text", text: message }],
        });
      }
    }

    case "ping":
      return jsonRpcOk(rpc.id, {});

    default:
      return jsonRpcError(rpc.id, -32601, `Method not found: ${rpc.method}`);
  }
}

async function runTool(name: ToolName, args: ScenePlan, userId: string) {
  switch (name) {
    case "plan_video_scenes":
      // Pure schema tool: echo the plan back so the model can show + edit it.
      return {
        content: [
          {
            type: "text",
            text:
              "Plan drafted. Review with the user, then call render_video with the same object.\n\n" +
              JSON.stringify(args, null, 2),
          },
        ],
        structuredContent: { plan: args },
      };

    case "render_video":
      return doRender(args, userId);
  }
}

async function doRender(plan: ScenePlan, userId: string) {
  // Legacy quota (20/day) is now advisory — credits are the real limit.
  // Keep this call so we still write to RenderJob for analytics.
  await readDailyUsage(userId);

  // Cost estimate based on target duration — actual might differ by up to
  // ~10% depending on TTS pacing. We deduct the ESTIMATE up front and
  // reconcile once we know the true duration.
  const upfront = quoteCredits(plan);
  const balanceAfter = await tryDeduct(userId, upfront.totalCredits, "render");
  if (balanceAfter === null) {
    const currentBalance = await readBalance(userId);
    throw new Error(
      `Insufficient credits: this render needs ${upfront.totalCredits} credits, you have ${currentBalance}. Top up at ${TOPUP_URL}`
    );
  }

  const job = await prisma.renderJob.create({
    data: { userId, status: "pending" },
  });

  try {
    const audio = await synthesize(plan.script, plan.voice);
    const dataDir = process.env.RENDER_DATA_DIR || path.join(process.cwd(), "data");
    const outputDir = path.join(dataDir, "renders", userId);
    const result = await renderVideo({
      plan,
      narrationBytes: audio.bytes,
      narrationDurationSec: audio.durationSec,
      words: audio.words,
      outputDir,
    });

    // Reconcile: if the actual render was shorter than the target, refund the
    // difference. If it was LONGER we eat the delta — cheaper than surprising
    // the user with a second deduction.
    const actual = quoteCredits(plan, result.durationSec);
    let creditsRemaining = balanceAfter;
    if (actual.totalCredits < upfront.totalCredits) {
      const overcharge = upfront.totalCredits - actual.totalCredits;
      await refund(userId, overcharge, job.id);
      creditsRemaining = balanceAfter + overcharge;
    }

    const fileName = path.basename(result.filePath);
    const videoUrl = publicUrlFor(fileName, job.id);

    await prisma.renderJob.update({
      where: { id: job.id },
      data: {
        status: "success",
        durationSec: result.durationSec,
        sizeBytes: result.bytes.length,
        fileName,
      },
    });

    const renamedPath = path.join(outputDir, `${job.id}.mp4`);
    await fs.rename(result.filePath, renamedPath).catch(() => undefined);

    const lowCredits = creditsRemaining < 50;
    const lowNote = lowCredits
      ? `\n⚠ Only ${creditsRemaining} credits left (~${Math.floor(creditsRemaining / actual.totalCredits)} more videos). Top up: ${TOPUP_URL}`
      : "";

    return {
      content: [
        {
          type: "text",
          text:
            `Rendered ${plan.title} — ${result.durationSec.toFixed(1)}s, ${(result.bytes.length / 1024 / 1024).toFixed(2)} MB. Cost: ${actual.totalCredits} credits (${creditsRemaining} left).\n${videoUrl}${lowNote}`,
        },
      ],
      structuredContent: {
        videoUrl,
        durationSec: result.durationSec,
        sizeBytes: result.bytes.length,
        creditsSpent: actual.totalCredits,
        creditsRemaining,
        topupUrl: TOPUP_URL,
        provider: audio.provider,
      },
    };
  } catch (err) {
    // Render failed — refund every credit we deducted up front.
    await refund(userId, upfront.totalCredits, job.id);
    await prisma.renderJob
      .update({
        where: { id: job.id },
        data: { status: "failed", errorMessage: (err as Error).message.slice(0, 500) },
      })
      .catch(() => undefined);
    throw err;
  }
}

function publicUrlFor(_fileName: string, jobId: string): string {
  const base = process.env.PUBLIC_BASE_URL?.replace(/\/$/, "") || "";
  return `${base}/api/renders/${encodeURIComponent(jobId)}.mp4`;
}

// ---------- JSON-RPC helpers ----------

interface RpcRequest {
  jsonrpc: "2.0";
  id?: number | string | null;
  method: string;
  params?: unknown;
}

function isValidRpc(x: unknown): x is RpcRequest {
  if (!x || typeof x !== "object") return false;
  const r = x as RpcRequest;
  return r.jsonrpc === "2.0" && typeof r.method === "string";
}

function jsonRpcOk(id: RpcRequest["id"] | undefined, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id: id ?? null, result });
}

function jsonRpcError(
  id: RpcRequest["id"] | undefined | null,
  code: number,
  message: string
) {
  return NextResponse.json(
    { jsonrpc: "2.0", id: id ?? null, error: { code, message } },
    { status: code === -32001 ? 401 : 200 }
  );
}

// Silence unused-imports lint — z is re-exported for other files' benefit
void z;
