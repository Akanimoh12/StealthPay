// lib/hash.ts — client-side reproduction of the contract's commitment.
//
// This MUST match `stealth-payroll.clar`'s `compute-commitment` byte-for-byte:
//
//   commitment = sha256(
//       serializeCV(principalCV(recipient))   // Clarity consensus buffer
//     || serializeCV(uintCV(amount))          // Clarity consensus buffer
//     || nonce                                // raw 16 bytes, no wrapping
//   )
//
// A mismatch here means every claim silently fails, so the exact vector is
// asserted in tests/hash.test.ts against CONTRACT.md. Never hand-roll the byte
// encoding — always go through @stacks/transactions serialization.

import { sha256 } from "@noble/hashes/sha2.js";
import { serializeCVBytes, principalCV, uintCV } from "@stacks/transactions";

/** Convert bytes to a lowercase hex string (no 0x prefix). */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Parse a hex string (with or without 0x prefix) into bytes. */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error("hex string has odd length");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    const byte = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(byte)) throw new Error("invalid hex string");
    out[i] = byte;
  }
  return out;
}

/**
 * Generate a fresh 16-byte nonce from the CSPRNG.
 * Per SECURITY.md: 16 bytes of crypto.getRandomValues, never derived from
 * predictable data, unique per employee per cycle.
 */
export function generateNonce(): Uint8Array {
  const nonce = new Uint8Array(16);
  crypto.getRandomValues(nonce);
  return nonce;
}

/**
 * Compute the commitment for a (recipient, amount, nonce) tuple, exactly as the
 * contract does. Returns the raw 32-byte sha256 digest.
 */
export function computeCommitment(
  recipient: string,
  amount: bigint,
  nonce: Uint8Array
): Uint8Array {
  if (nonce.length !== 16) {
    throw new Error(`nonce must be 16 bytes, got ${nonce.length}`);
  }
  const recipientBytes = serializeCVBytes(principalCV(recipient));
  const amountBytes = serializeCVBytes(uintCV(amount));
  const preimage = new Uint8Array(
    recipientBytes.length + amountBytes.length + nonce.length
  );
  preimage.set(recipientBytes, 0);
  preimage.set(amountBytes, recipientBytes.length);
  preimage.set(nonce, recipientBytes.length + amountBytes.length);
  return sha256(preimage);
}

/** Same as computeCommitment but returns a 0x-prefixed hex string. */
export function computeCommitmentHex(
  recipient: string,
  amount: bigint,
  nonce: Uint8Array
): string {
  return "0x" + bytesToHex(computeCommitment(recipient, amount, nonce));
}
