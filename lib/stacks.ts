// lib/stacks.ts — the single place that knows the network, the contract, and
// how to build every StealthPay contract call + post-condition.
//
// No component should ever hardcode a contract address, a function name, or a
// post-condition. They import from here. Per FRONTEND.md and SECURITY.md:
//   - network is testnet (configurable via env)
//   - token-moving txs ALWAYS carry an explicit post-condition; mode is "deny",
//     never "allow"
//   - Clarity values are serialized with @stacks/transactions helpers only

import {
  STACKS_TESTNET,
  STACKS_MAINNET,
  STACKS_DEVNET,
  type StacksNetwork,
} from "@stacks/network";
import {
  Cl,
  Pc,
  cvToValue,
  fetchCallReadOnlyFunction,
  validateStacksAddress,
  type ClarityValue,
} from "@stacks/transactions";
import { request } from "@stacks/connect";
import { computeCommitmentHex } from "./hash";

// --- Network -----------------------------------------------------------------

export type NetworkName = "testnet" | "mainnet" | "devnet";

export const NETWORK_NAME: NetworkName =
  (process.env.NEXT_PUBLIC_NETWORK as NetworkName) || "testnet";

export const NETWORK: StacksNetwork =
  NETWORK_NAME === "mainnet"
    ? STACKS_MAINNET
    : NETWORK_NAME === "devnet"
      ? STACKS_DEVNET
      : STACKS_TESTNET;

// Wallet transaction-request network identifier used by @stacks/connect.
export const TX_NETWORK: "mainnet" | "testnet" | "devnet" = NETWORK_NAME;

// --- Contract & token identity ----------------------------------------------
//
// The StealthPay contracts are deployed and live on Stacks testnet under the
// address below. These are the app's defaults — end users never configure a
// contract address. The NEXT_PUBLIC_* env vars exist only as an override for a
// future redeploy or a different network; if unset, the live testnet
// deployment is used.

const DEPLOYER_ADDRESS = "ST1X5P65XY6D3TV0NK1WNGA1EXRAHRFEJDHAETBBV";

const DEFAULTS = {
  stealthPayroll: `${DEPLOYER_ADDRESS}.stealth-payroll`,
  mockUsdcx: `${DEPLOYER_ADDRESS}.mock-usdcx`,
} as const;

const rawContract =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || DEFAULTS.stealthPayroll;

/** Full `address.name` principal of the deployed stealth-payroll contract. */
export const CONTRACT_ID = rawContract;

export const [CONTRACT_ADDRESS, CONTRACT_NAME] = splitPrincipal(
  rawContract,
  "stealth-payroll"
);

export const FUNCTIONS = {
  createCycle: "create-cycle",
  deposit: "deposit",
  commitSalaries: "commit-salaries",
  claim: "claim",
  closeCycle: "close-cycle",
  verifyCommitment: "verify-commitment",
  getCycle: "get-cycle",
  getCycleTotals: "get-cycle-totals",
  isClaimed: "is-claimed",
  getNextCycleId: "get-next-cycle-id",
} as const;

/** SIP-010 tokens the employer can pick. `asset` is the FT asset name used in
 *  post-conditions (must match `(define-fungible-token <asset>)` in the token). */
export interface TokenOption {
  key: "usdcx" | "sbtc";
  label: string;
  contractId: string; // address.name
  asset: string; // FT asset name inside the token contract
  decimals: number;
}

export const TOKENS: TokenOption[] = [
  {
    key: "usdcx" as const,
    label: "Mock USDCx",
    contractId:
      process.env.NEXT_PUBLIC_MOCK_USDCX_ADDRESS || DEFAULTS.mockUsdcx,
    asset: "usdcx",
    decimals: 6,
  },
  process.env.NEXT_PUBLIC_SBTC_ADDRESS && {
    key: "sbtc" as const,
    label: "sBTC",
    contractId: process.env.NEXT_PUBLIC_SBTC_ADDRESS,
    asset: "sbtc-token",
    decimals: 8,
  },
].filter(Boolean) as TokenOption[];

export function tokenByContractId(contractId: string): TokenOption | undefined {
  return TOKENS.find((t) => t.contractId === contractId);
}

export function isConfigured(): boolean {
  return CONTRACT_ID.includes(".") && validateStacksAddress(CONTRACT_ADDRESS);
}

// --- Explorer ----------------------------------------------------------------

export function explorerTxUrl(txId: string): string {
  const id = txId.startsWith("0x") ? txId : `0x${txId}`;
  const chain = NETWORK_NAME === "mainnet" ? "mainnet" : "testnet";
  return `https://explorer.hiro.so/txid/${id}?chain=${chain}`;
}

// --- Validation helpers ------------------------------------------------------

export function isValidStxAddress(addr: string): boolean {
  return validateStacksAddress(addr.trim());
}

/** Parse a positive integer amount (base units). Throws on empty/zero/negative. */
export function parseAmount(input: string): bigint {
  const trimmed = input.trim();
  if (!/^\d+$/.test(trimmed)) {
    throw new Error("Amount must be a whole number in base units.");
  }
  const value = BigInt(trimmed);
  if (value <= 0n) throw new Error("Amount must be greater than zero.");
  return value;
}

// --- Error normalization -----------------------------------------------------

/** Map contract error codes (u100–u107) to human-readable messages. */
export const CONTRACT_ERRORS: Record<number, string> = {
  100: "Not the cycle owner — only the employer who created this cycle can do that.",
  101: "Cycle not found. Check the cycle ID.",
  102: "Invalid proof. The amount, nonce, or wallet does not match a committed salary.",
  103: "Already claimed. This salary has already been withdrawn.",
  104: "Insufficient pool. The deposited pool cannot cover this claim.",
  105: "Wrong cycle status for this action (e.g. not yet committed, or already closed).",
  106: "Token transfer failed.",
  107: "Token mismatch — the selected token does not match this cycle's token.",
};

/** Turn a wallet/network/contract failure into a specific, human message. */
export function humanizeError(err: unknown): string {
  const msg =
    typeof err === "string"
      ? err
      : err instanceof Error
        ? err.message
        : JSON.stringify(err ?? "");
  const lower = msg.toLowerCase();

  if (/user (rejected|denied|cancel)/.test(lower) || lower.includes("rejected by user")) {
    return "You rejected the request in your wallet.";
  }
  if (lower.includes("no wallet") || lower.includes("not installed") || lower.includes("no provider")) {
    return "No Stacks wallet detected. Install Leather or Xverse to continue.";
  }
  if (lower.includes("network") && lower.includes("mismatch")) {
    return `Wrong network. Switch your wallet to ${NETWORK_NAME}.`;
  }
  if (lower.includes("insufficient") && lower.includes("balance")) {
    return "Insufficient balance for this transaction.";
  }

  // (err uXXX) from a failed contract assertion
  const m = msg.match(/\(err u(\d+)\)/) || msg.match(/\bu(\d{3})\b/);
  if (m) {
    const code = Number(m[1]);
    if (CONTRACT_ERRORS[code]) return CONTRACT_ERRORS[code];
  }
  return msg || "Something went wrong.";
}

// --- Low-level call wrappers -------------------------------------------------

function assertConfigured() {
  if (!isConfigured()) {
    throw new Error(
      "Contract address is not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local."
    );
  }
}

interface CallResult {
  txId: string;
}

/**
 * Wallet-signed contract call via @stacks/connect v8 `request`. Always passes
 * explicit post-conditions and `postConditionMode: "deny"`.
 */
async function callContract(
  functionName: string,
  functionArgs: ClarityValue[],
  postConditions: ReturnType<typeof buildDepositPostCondition>[] = []
): Promise<CallResult> {
  assertConfigured();
  const response = await request("stx_callContract", {
    contract: `${CONTRACT_ADDRESS}.${CONTRACT_NAME}` as `${string}.${string}`,
    functionName,
    functionArgs,
    network: TX_NETWORK,
    postConditions,
    postConditionMode: "deny",
  });
  const txId = (response as { txid?: string }).txid ?? "";
  if (!txId) throw new Error("Wallet did not return a transaction id.");
  return { txId };
}

// --- Post-condition builders -------------------------------------------------

/** Deposit: exactly `amount` of the token leaves the employer (tx-sender). */
export function buildDepositPostCondition(
  sender: string,
  amount: bigint,
  token: TokenOption
) {
  return Pc.principal(sender)
    .willSendEq(amount)
    .ft(token.contractId as `${string}.${string}`, token.asset);
}

/** Claim: exactly `amount` of the token leaves the contract to the claimer. */
export function buildClaimPostCondition(amount: bigint, token: TokenOption) {
  return Pc.principal(`${CONTRACT_ADDRESS}.${CONTRACT_NAME}`)
    .willSendEq(amount)
    .ft(token.contractId as `${string}.${string}`, token.asset);
}

// --- Public write helpers ----------------------------------------------------

const tokenCV = (token: TokenOption) => {
  const [addr, name] = token.contractId.split(".");
  return Cl.contractPrincipal(addr, name);
};

export function createCycle(token: TokenOption) {
  return callContract(FUNCTIONS.createCycle, [tokenCV(token)]);
}

export function deposit(
  cycleId: bigint,
  amount: bigint,
  token: TokenOption,
  sender: string
) {
  return callContract(
    FUNCTIONS.deposit,
    [Cl.uint(cycleId), Cl.uint(amount), tokenCV(token)],
    [buildDepositPostCondition(sender, amount, token)]
  );
}

export function commitSalaries(cycleId: bigint, commitmentHexes: string[]) {
  return callContract(FUNCTIONS.commitSalaries, [
    Cl.uint(cycleId),
    Cl.list(commitmentHexes.map((h) => Cl.bufferFromHex(h.replace(/^0x/, "")))),
  ]);
}

export function claim(
  cycleId: bigint,
  amount: bigint,
  nonce: Uint8Array,
  token: TokenOption
) {
  return callContract(
    FUNCTIONS.claim,
    [Cl.uint(cycleId), Cl.uint(amount), Cl.buffer(nonce), tokenCV(token)],
    [buildClaimPostCondition(amount, token)]
  );
}

// --- Read-only helpers -------------------------------------------------------

async function readOnly(
  functionName: string,
  functionArgs: ClarityValue[],
  senderAddress: string
): Promise<ClarityValue> {
  assertConfigured();
  return fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    network: NETWORK,
    senderAddress,
  });
}

export interface CycleTotals {
  deposited: bigint;
  claimed: bigint;
  remaining: bigint;
}

export async function getCycleTotals(
  cycleId: bigint,
  senderAddress: string
): Promise<CycleTotals | null> {
  const cv = await readOnly(
    FUNCTIONS.getCycleTotals,
    [Cl.uint(cycleId)],
    senderAddress
  );
  const v = cvToValue(cv);
  // (ok { deposited, claimed, remaining }) | (err uXXX)
  if (!v || v.value === undefined) return null;
  const inner = v.value;
  if (inner.deposited === undefined) return null; // was an err
  return {
    deposited: BigInt(inner.deposited.value),
    claimed: BigInt(inner.claimed.value),
    remaining: BigInt(inner.remaining.value),
  };
}

export interface CycleInfo {
  owner: string;
  token: string;
  totalDeposited: bigint;
  totalClaimed: bigint;
  status: string;
}

export async function getCycle(
  cycleId: bigint,
  senderAddress: string
): Promise<CycleInfo | null> {
  const cv = await readOnly(FUNCTIONS.getCycle, [Cl.uint(cycleId)], senderAddress);
  const v = cvToValue(cv); // (optional {...})
  if (!v || v.value == null) return null;
  const c = v.value;
  return {
    owner: c.owner.value,
    token: c.token.value,
    totalDeposited: BigInt(c["total-deposited"].value),
    totalClaimed: BigInt(c["total-claimed"].value),
    status: c.status.value,
  };
}

/** verify-commitment: recompute + check against a stored commitment. Read-only. */
export async function verifyCommitment(
  cycleId: bigint,
  recipient: string,
  amount: bigint,
  nonce: Uint8Array,
  senderAddress: string
): Promise<boolean> {
  const cv = await readOnly(
    FUNCTIONS.verifyCommitment,
    [Cl.uint(cycleId), Cl.principal(recipient), Cl.uint(amount), Cl.buffer(nonce)],
    senderAddress
  );
  return cvToValue(cv) === true;
}

// Re-export the hash helper so pages have one import surface for contract logic.
export { computeCommitmentHex };

// --- internal ----------------------------------------------------------------

function splitPrincipal(principal: string, fallbackName: string): [string, string] {
  if (principal.includes(".")) {
    const [addr, name] = principal.split(".");
    return [addr, name || fallbackName];
  }
  return [principal, fallbackName];
}
