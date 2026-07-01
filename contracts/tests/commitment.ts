// Off-chain reproduction of the CANONICAL commitment serialization.
// This is the reference the frontend `hash.ts` must match byte-for-byte:
//
//   sha256( serializeCV(principalCV(recipient))
//         || serializeCV(uintCV(amount))
//         || nonce (raw 16 bytes) )
//
// It exists in the test suite so we can build commitments to feed into
// `commit-salaries` and assert the contract agrees with the off-chain path.
import { Cl, serializeCV } from "@stacks/transactions";
import { createHash } from "node:crypto";

export function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

/** 16-byte nonce from a hex string like "000102...0f". */
export function nonceFromHex(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const b = Buffer.from(clean, "hex");
  if (b.length !== 16) throw new Error(`nonce must be 16 bytes, got ${b.length}`);
  return new Uint8Array(b);
}

/**
 * Compute the commitment exactly as the contract's `compute-commitment` does.
 * Returns the 0x-prefixed 32-byte sha256 hex.
 */
export function computeCommitment(
  recipient: string,
  amount: bigint | number,
  nonce: Uint8Array
): string {
  const principalHex = serializeCV(Cl.principal(recipient));
  const uintHex = serializeCV(Cl.uint(amount));
  const preimage = Buffer.concat([
    Buffer.from(principalHex, "hex"),
    Buffer.from(uintHex, "hex"),
    Buffer.from(nonce),
  ]);
  return "0x" + createHash("sha256").update(preimage).digest("hex");
}
