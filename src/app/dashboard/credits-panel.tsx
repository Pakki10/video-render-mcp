"use client";

import { useState, useTransition } from "react";

interface Pack {
  id: string;
  priceUsd: number;
  credits: number;
  bonusLabel: string | null;
}

export function CreditsPanel({
  balance,
  packs,
  billingLive,
  purchaseResult,
}: {
  balance: number;
  packs: Pack[];
  billingLive: boolean;
  purchaseResult: string | null;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const buy = (packId: string) => {
    setError(null);
    setPendingId(packId);
    startTransition(async () => {
      try {
        const res = await fetch("/api/credits/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ packId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.message || data.error || `HTTP ${res.status}`);
        }
        const data = (await res.json()) as { url?: string };
        if (data.url) window.location.href = data.url;
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setPendingId(null);
      }
    });
  };

  return (
    <section id="credits" className="mt-10 rounded-lg border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-500">
            Credit balance
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-bold text-teal-300">{balance.toLocaleString()}</span>
            <span className="text-sm text-neutral-500">credits</span>
          </div>
        </div>
        {purchaseResult === "success" ? (
          <div className="rounded-md bg-teal-500/15 px-3 py-1.5 text-xs text-teal-300">
            Purchase received — credits added ✓
          </div>
        ) : purchaseResult === "cancelled" ? (
          <div className="rounded-md bg-neutral-800 px-3 py-1.5 text-xs text-neutral-400">
            Purchase cancelled
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {packs.map((p) => (
          <button
            key={p.id}
            disabled={pending || !billingLive}
            onClick={() => buy(p.id)}
            className="group relative flex flex-col items-start rounded-lg border border-neutral-800 bg-neutral-950 p-4 text-left transition hover:border-teal-500/60 disabled:opacity-60 disabled:hover:border-neutral-800"
          >
            <div className="text-xs uppercase tracking-wider text-neutral-500">
              ${p.priceUsd}
            </div>
            <div className="mt-1 text-2xl font-bold text-neutral-100">
              {p.credits.toLocaleString()}
            </div>
            <div className="text-xs text-neutral-500">credits</div>
            {p.bonusLabel ? (
              <div className="mt-2 rounded bg-teal-500/15 px-2 py-0.5 text-[10px] font-medium text-teal-300">
                {p.bonusLabel}
              </div>
            ) : null}
            <div className="mt-3 text-[11px] text-neutral-500">
              {(p.priceUsd / p.credits * 100).toFixed(2)}¢ per credit
            </div>
            {pendingId === p.id ? (
              <div className="mt-2 text-[11px] text-teal-300">Redirecting…</div>
            ) : null}
          </button>
        ))}
      </div>

      {!billingLive ? (
        <p className="mt-3 text-xs text-amber-400">
          Billing isn&apos;t configured on this instance yet — packs are visible
          but purchases are disabled. Trial credits work fine.
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-xs text-red-400">Purchase error: {error}</p>
      ) : null}
    </section>
  );
}
