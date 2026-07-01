import { describe, it, expect } from "vitest";
import {
  computeCommitment,
  computeCommitmentHex,
  bytesToHex,
  hexToBytes,
  generateNonce,
} from "../lib/hash";

// ---------------------------------------------------------------------------
// CANONICAL TEST VECTOR — must match the contract byte-for-byte.
// Source of truth: contracts/README.md + docs/CONTRACT.md, generated once from
// the on-chain `compute-commitment`. If this assertion fails, the frontend and
// contract disagree and EVERY claim will fail. Stop and fix before shipping.
// ---------------------------------------------------------------------------
const VECTOR = {
  recipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  amount: 2000n,
  nonceHex: "000102030405060708090a0b0c0d0e0f",
  commitment:
    "0x4cf427427f24a4af9b37cbe4636bc5bf14b2c519478efa20693904ab70390d2f",
  // documented intermediate serialization (see contracts/README.md)
  preimageHex:
    "051a6d78de7b0625dfbfc16c3a8a5735f6dc3dc3f2ce" + // recipient consensus buff
    "01000000000000000000000000000007d0" + //           amount consensus buff
    "000102030405060708090a0b0c0d0e0f", //              raw 16-byte nonce
};

describe("computeCommitment — canonical vector", () => {
  it("matches the contract's compute-commitment output exactly", () => {
    const nonce = hexToBytes(VECTOR.nonceHex);
    expect(computeCommitmentHex(VECTOR.recipient, VECTOR.amount, nonce)).toBe(
      VECTOR.commitment
    );
  });

  it("returns the 32-byte digest form", () => {
    const nonce = hexToBytes(VECTOR.nonceHex);
    const digest = computeCommitment(VECTOR.recipient, VECTOR.amount, nonce);
    expect(digest).toHaveLength(32);
    expect("0x" + bytesToHex(digest)).toBe(VECTOR.commitment);
  });
});

describe("hex helpers round-trip", () => {
  it("bytesToHex / hexToBytes are inverse", () => {
    const bytes = hexToBytes(VECTOR.nonceHex);
    expect(bytesToHex(bytes)).toBe(VECTOR.nonceHex);
    expect(hexToBytes("0x" + VECTOR.nonceHex)).toEqual(bytes);
  });
});

describe("commitment sensitivity", () => {
  const nonce = hexToBytes(VECTOR.nonceHex);

  it("changes when the amount changes", () => {
    expect(
      computeCommitmentHex(VECTOR.recipient, VECTOR.amount + 1n, nonce)
    ).not.toBe(VECTOR.commitment);
  });

  it("changes when the nonce changes", () => {
    const other = hexToBytes("ffffffffffffffffffffffffffffffff");
    expect(computeCommitmentHex(VECTOR.recipient, VECTOR.amount, other)).not.toBe(
      VECTOR.commitment
    );
  });

  it("changes when the recipient changes", () => {
    expect(
      computeCommitmentHex(
        "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG",
        VECTOR.amount,
        nonce
      )
    ).not.toBe(VECTOR.commitment);
  });
});

describe("generateNonce", () => {
  it("produces 16 random bytes, unique across calls", () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toHaveLength(16);
    expect(b).toHaveLength(16);
    expect(bytesToHex(a)).not.toBe(bytesToHex(b));
  });
});
