"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  connect,
  disconnect,
  isConnected,
  getLocalStorage,
} from "@stacks/connect";
import { NETWORK_NAME } from "@/lib/stacks";

interface WalletState {
  address: string | null;
  connected: boolean;
  connecting: boolean;
  error: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

function readStxAddress(): string | null {
  try {
    const data = getLocalStorage();
    return data?.addresses?.stx?.[0]?.address ?? null;
  } catch {
    return null;
  }
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Rehydrate an existing session on mount.
  useEffect(() => {
    if (isConnected()) setAddress(readStxAddress());
  }, []);

  const connectWallet = useCallback(async () => {
    setError(null);
    setConnecting(true);
    try {
      await connect();
      setAddress(readStxAddress());
    } catch (err) {
      // User closing the wallet popup is a normal, non-fatal cancel.
      const msg =
        err instanceof Error ? err.message : "Could not connect the wallet.";
      if (!/reject|cancel|close/i.test(msg)) setError(msg);
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    disconnect();
    setAddress(null);
    setError(null);
  }, []);

  const value = useMemo<WalletState>(
    () => ({
      address,
      connected: Boolean(address),
      connecting,
      error,
      connectWallet,
      disconnectWallet,
    }),
    [address, connecting, error, connectWallet, disconnectWallet]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}

export { NETWORK_NAME };
