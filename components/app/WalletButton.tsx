"use client";

import { useWallet } from "./WalletProvider";
import { NETWORK_NAME } from "@/lib/stacks";

function shorten(addr: string): string {
  return `${addr.slice(0, 5)}…${addr.slice(-4)}`;
}

export default function WalletButton() {
  const { address, connected, connecting, connectWallet, disconnectWallet } =
    useWallet();

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <span
          className="hidden rounded-full border border-line bg-paper-pure px-3 py-1.5 font-mono text-xs text-ink-soft sm:inline"
          title={address}
        >
          {shorten(address)}
        </span>
        <button
          type="button"
          onClick={disconnectWallet}
          className="btn-secondary !px-4 !py-2 !text-xs"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={connectWallet}
      disabled={connecting}
      className="btn-primary !px-5 !py-2.5 disabled:cursor-wait disabled:opacity-70"
    >
      {connecting ? "Connecting…" : "Connect Wallet"}
    </button>
  );
}

export function NetworkBadge() {
  return (
    <span className="rounded-full border border-line bg-paper px-2.5 py-1 text-[0.65rem] font-semibold uppercase tracking-cta text-ink-muted">
      {NETWORK_NAME}
    </span>
  );
}
