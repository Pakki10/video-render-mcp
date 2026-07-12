import { redirect } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { getCurrentKeyPrefix } from "@/lib/keys";
import { readBalance, CREDIT_PACKS } from "@/lib/credits";
import { isStripeConfigured } from "@/lib/stripe";
import { KeyPanel } from "./key-panel";
import { CreditsPanel } from "./credits-panel";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const sp = await searchParams;
  const rawKey = typeof sp.freshKey === "string" ? sp.freshKey : null;
  const purchaseResult = typeof sp.purchase === "string" ? sp.purchase : null;
  const [prefix, balance] = await Promise.all([
    getCurrentKeyPrefix(session.user.id),
    readBalance(session.user.id),
  ]);
  const billingLive = isStripeConfigured();

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Your API key</h1>
          <p className="mt-1 text-sm text-neutral-400">
            Signed in as {session.user.email}
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:bg-neutral-800"
          >
            Sign out
          </button>
        </form>
      </header>

      <KeyPanel initialPrefix={prefix} freshKey={rawKey} />

      <CreditsPanel
        balance={balance}
        packs={CREDIT_PACKS.map((p) => ({ ...p }))}
        billingLive={billingLive}
        purchaseResult={purchaseResult}
      />

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5 text-xs text-neutral-400">
        <div className="mb-1 font-semibold uppercase tracking-wider text-neutral-500">
          Pricing
        </div>
        Every render deducts credits based on final duration and voice tier:
        <ul className="mt-2 space-y-1">
          <li>• <b>Standard voice</b> (msedge-tts, no key needed): <b>1 credit per 3 seconds</b> of output.</li>
          <li>• <b>Premium voice</b> (ElevenLabs, natural neural): <b>3× that</b>, plus <b>25% surcharge for captions</b>.</li>
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Claude Desktop config
        </div>
        <pre className="overflow-x-auto rounded bg-black/40 p-3 text-xs text-neutral-200">
{`{
  "mcpServers": {
    "video-render": {
      "url": "https://video-render.regiq.in/api/mcp",
      "headers": {
        "Authorization": "Bearer <PASTE_YOUR_KEY>"
      }
    }
  }
}`}
        </pre>
        <p className="mt-3 text-xs text-neutral-500">
          <Link href="/" className="underline">← Back to overview</Link>
        </p>
      </section>
    </main>
  );
}
