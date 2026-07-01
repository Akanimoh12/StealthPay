import { describe, expect, it, beforeEach } from "vitest";
import { Cl, cvToValue } from "@stacks/transactions";
import { computeCommitment, nonceFromHex } from "./commitment";

// --- accounts ---
const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!; // cycle owner / employer
const employer = deployer;
const alice = accounts.get("wallet_1")!;
const bob = accounts.get("wallet_2")!;
const carol = accounts.get("wallet_3")!;

const PAYROLL = "stealth-payroll";
const TOKEN = "mock-usdcx";
const tokenPrincipal = `${deployer}.${TOKEN}`;

// error codes (CONTRACT.md u100-u107)
const ERR_NOT_OWNER = 100n;
const ERR_CYCLE_NOT_FOUND = 101n;
const ERR_INVALID_PROOF = 102n;
const ERR_ALREADY_CLAIMED = 103n;
const ERR_INSUFFICIENT_POOL = 104n;
const ERR_WRONG_STATUS = 105n;
const ERR_TOKEN_MISMATCH = 107n;

// --- helpers ---
function mint(amount: bigint, recipient: string) {
  const r = simnet.callPublicFn(TOKEN, "mint", [Cl.uint(amount), Cl.principal(recipient)], deployer);
  expect(r.result).toBeOk(Cl.bool(true));
}

function tokenTrait() {
  return Cl.contractPrincipal(deployer, TOKEN);
}

function createCycle(sender = employer): bigint {
  const r = simnet.callPublicFn(PAYROLL, "create-cycle", [tokenTrait()], sender);
  expect(r.result).toBeOk(Cl.uint(cvToValue(r.result).value));
  return BigInt(cvToValue(r.result).value);
}

function deposit(cycleId: bigint, amount: bigint, sender = employer) {
  return simnet.callPublicFn(
    PAYROLL,
    "deposit",
    [Cl.uint(cycleId), Cl.uint(amount), tokenTrait()],
    sender
  );
}

function commit(cycleId: bigint, commitments: string[], sender = employer) {
  return simnet.callPublicFn(
    PAYROLL,
    "commit-salaries",
    [Cl.uint(cycleId), Cl.list(commitments.map((c) => Cl.bufferFromHex(c)))],
    sender
  );
}

function claim(cycleId: bigint, amount: bigint, nonce: Uint8Array, sender: string) {
  return simnet.callPublicFn(
    PAYROLL,
    "claim",
    [Cl.uint(cycleId), Cl.uint(amount), Cl.buffer(nonce), tokenTrait()],
    sender
  );
}

function balanceOf(who: string): bigint {
  const r = simnet.callReadOnlyFn(TOKEN, "get-balance", [Cl.principal(who)], deployer);
  return BigInt(cvToValue(r.result).value);
}

function totals(cycleId: bigint) {
  const r = simnet.callReadOnlyFn(PAYROLL, "get-cycle-totals", [Cl.uint(cycleId)], deployer);
  const v = cvToValue(r.result).value;
  return {
    deposited: BigInt(v.deposited.value),
    claimed: BigInt(v.claimed.value),
    remaining: BigInt(v.remaining.value),
  };
}

// fixed nonces for the team
const nAlice = nonceFromHex("0x0000000000000000000000000000000a");
const nBob = nonceFromHex("0x0000000000000000000000000000000b");
const nCarol = nonceFromHex("0x0000000000000000000000000000000c");

// -----------------------------------------------------------------------------

describe("canonical commitment vector (must match frontend hash.ts)", () => {
  const VECTOR_RECIPIENT = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM";
  const VECTOR_AMOUNT = 2000n;
  const VECTOR_NONCE = nonceFromHex("0x000102030405060708090a0b0c0d0e0f");
  // Generated once from the on-chain `compute-commitment` and locked here.
  const CANONICAL_COMMITMENT =
    "0x4cf427427f24a4af9b37cbe4636bc5bf14b2c519478efa20693904ab70390d2f";

  it("on-chain compute-commitment matches the locked canonical vector", () => {
    const r = simnet.callReadOnlyFn(
      PAYROLL,
      "compute-commitment",
      [Cl.principal(VECTOR_RECIPIENT), Cl.uint(VECTOR_AMOUNT), Cl.buffer(VECTOR_NONCE)],
      deployer
    );
    expect(r.result).toBeBuff(Buffer.from(CANONICAL_COMMITMENT.slice(2), "hex"));
  });

  it("off-chain (frontend) reproduction matches the locked canonical vector", () => {
    expect(computeCommitment(VECTOR_RECIPIENT, VECTOR_AMOUNT, VECTOR_NONCE)).toBe(
      CANONICAL_COMMITMENT
    );
  });
});

describe("stealth-payroll lifecycle", () => {
  beforeEach(() => {
    mint(1_000_000n, employer);
  });

  it("create -> deposit -> commit -> single claim pays employee and reduces pool", () => {
    const salary = 5000n;
    const cid = createCycle();
    expect(deposit(cid, salary).result).toBeOk(Cl.bool(true));

    const c = computeCommitment(alice, salary, nAlice);
    expect(commit(cid, [c]).result).toBeOk(Cl.bool(true));

    const before = balanceOf(alice);
    expect(claim(cid, salary, nAlice, alice).result).toBeOk(Cl.bool(true));
    expect(balanceOf(alice)).toBe(before + salary);

    const t = totals(cid);
    expect(t.deposited).toBe(salary);
    expect(t.claimed).toBe(salary);
    expect(t.remaining).toBe(0n);
  });

  it("full lifecycle: 3 employees each claim their own amount from one pool", () => {
    const aSal = 3000n;
    const bSal = 5000n;
    const cSal = 8000n;
    const pool = aSal + bSal + cSal;

    const cid = createCycle();
    expect(deposit(cid, pool).result).toBeOk(Cl.bool(true));
    expect(
      commit(cid, [
        computeCommitment(alice, aSal, nAlice),
        computeCommitment(bob, bSal, nBob),
        computeCommitment(carol, cSal, nCarol),
      ]).result
    ).toBeOk(Cl.bool(true));

    const [ba, bb, bc] = [balanceOf(alice), balanceOf(bob), balanceOf(carol)];
    expect(claim(cid, aSal, nAlice, alice).result).toBeOk(Cl.bool(true));
    expect(claim(cid, bSal, nBob, bob).result).toBeOk(Cl.bool(true));
    expect(claim(cid, cSal, nCarol, carol).result).toBeOk(Cl.bool(true));

    expect(balanceOf(alice)).toBe(ba + aSal);
    expect(balanceOf(bob)).toBe(bb + bSal);
    expect(balanceOf(carol)).toBe(bc + cSal);

    const t = totals(cid);
    expect(t.claimed).toBe(pool);
    expect(t.remaining).toBe(0n);
  });

  it("wrong amount rejected (ERR-INVALID-PROOF)", () => {
    const salary = 5000n;
    const cid = createCycle();
    deposit(cid, salary);
    commit(cid, [computeCommitment(alice, salary, nAlice)]);
    // claim with a different amount than committed
    expect(claim(cid, 4000n, nAlice, alice).result).toBeErr(Cl.uint(ERR_INVALID_PROOF));
  });

  it("wrong nonce rejected (ERR-INVALID-PROOF)", () => {
    const salary = 5000n;
    const cid = createCycle();
    deposit(cid, salary);
    commit(cid, [computeCommitment(alice, salary, nAlice)]);
    const wrongNonce = nonceFromHex("0xffffffffffffffffffffffffffffffff");
    expect(claim(cid, salary, wrongNonce, alice).result).toBeErr(Cl.uint(ERR_INVALID_PROOF));
  });

  it("another person's valid tuple claimed by the wrong tx-sender is rejected", () => {
    const salary = 5000n;
    const cid = createCycle();
    deposit(cid, salary);
    // commitment is bound to Alice
    commit(cid, [computeCommitment(alice, salary, nAlice)]);
    // Bob knows Alice's amount + nonce but claim recomputes with tx-sender = Bob
    expect(claim(cid, salary, nAlice, bob).result).toBeErr(Cl.uint(ERR_INVALID_PROOF));
    // and Alice can still claim hers
    expect(claim(cid, salary, nAlice, alice).result).toBeOk(Cl.bool(true));
  });

  it("double-claim rejected (ERR-ALREADY-CLAIMED)", () => {
    const salary = 5000n;
    const cid = createCycle();
    deposit(cid, salary);
    commit(cid, [computeCommitment(alice, salary, nAlice)]);
    expect(claim(cid, salary, nAlice, alice).result).toBeOk(Cl.bool(true));
    expect(claim(cid, salary, nAlice, alice).result).toBeErr(Cl.uint(ERR_ALREADY_CLAIMED));
  });

  it("over-claim beyond the pool rejected (ERR-INSUFFICIENT-POOL)", () => {
    // Pool is deliberately underfunded relative to the committed salaries.
    const aSal = 6000n;
    const bSal = 6000n;
    const cid = createCycle();
    deposit(cid, 8000n); // only 8000 in the pool
    commit(cid, [
      computeCommitment(alice, aSal, nAlice),
      computeCommitment(bob, bSal, nBob),
    ]);
    expect(claim(cid, aSal, nAlice, alice).result).toBeOk(Cl.bool(true)); // 6000 claimed
    // Bob's valid claim would push total to 12000 > 8000 deposited
    expect(claim(cid, bSal, nBob, bob).result).toBeErr(Cl.uint(ERR_INSUFFICIENT_POOL));
  });

  it("non-owner deposit and commit are rejected (ERR-NOT-OWNER)", () => {
    const cid = createCycle(employer);
    mint(10_000n, alice);
    expect(deposit(cid, 1000n, alice).result).toBeErr(Cl.uint(ERR_NOT_OWNER));
    expect(commit(cid, [computeCommitment(alice, 1000n, nAlice)], alice).result).toBeErr(
      Cl.uint(ERR_NOT_OWNER)
    );
  });

  it("token mismatch rejected (ERR-TOKEN-MISMATCH)", () => {
    const salary = 5000n;
    const cid = createCycle(); // cycle bound to mock-usdcx
    // deposit with a different token contract -> mismatch.
    // stealth-payroll itself is a valid principal but not the cycle token.
    const wrongToken = Cl.contractPrincipal(deployer, PAYROLL);
    const r = simnet.callPublicFn(
      PAYROLL,
      "deposit",
      [Cl.uint(cid), Cl.uint(salary), wrongToken],
      employer
    );
    expect(r.result).toBeErr(Cl.uint(ERR_TOKEN_MISMATCH));
  });

  it("verify-commitment true for correct tuple, false otherwise", () => {
    const salary = 5000n;
    const cid = createCycle();
    deposit(cid, salary);
    commit(cid, [computeCommitment(alice, salary, nAlice)]);

    const good = simnet.callReadOnlyFn(
      PAYROLL,
      "verify-commitment",
      [Cl.uint(cid), Cl.principal(alice), Cl.uint(salary), Cl.buffer(nAlice)],
      deployer
    );
    expect(good.result).toBeBool(true);

    const badAmount = simnet.callReadOnlyFn(
      PAYROLL,
      "verify-commitment",
      [Cl.uint(cid), Cl.principal(alice), Cl.uint(salary + 1n), Cl.buffer(nAlice)],
      deployer
    );
    expect(badAmount.result).toBeBool(false);

    const badRecipient = simnet.callReadOnlyFn(
      PAYROLL,
      "verify-commitment",
      [Cl.uint(cid), Cl.principal(bob), Cl.uint(salary), Cl.buffer(nAlice)],
      deployer
    );
    expect(badRecipient.result).toBeBool(false);
  });

  it("is-claimed flips after a successful claim", () => {
    const salary = 5000n;
    const cid = createCycle();
    deposit(cid, salary);
    const c = computeCommitment(alice, salary, nAlice);
    commit(cid, [c]);

    const before = simnet.callReadOnlyFn(
      PAYROLL,
      "is-claimed",
      [Cl.uint(cid), Cl.bufferFromHex(c.slice(2))],
      deployer
    );
    expect(before.result).toBeBool(false);

    claim(cid, salary, nAlice, alice);

    const after = simnet.callReadOnlyFn(
      PAYROLL,
      "is-claimed",
      [Cl.uint(cid), Cl.bufferFromHex(c.slice(2))],
      deployer
    );
    expect(after.result).toBeBool(true);
  });

  it("cycle isolation: identical (recipient, amount, nonce) in another cycle does not cross-claim", () => {
    const salary = 5000n;
    // cycle 0
    const c0 = createCycle();
    deposit(c0, salary);
    commit(c0, [computeCommitment(alice, salary, nAlice)]);
    // cycle 1 - same tuple committed, funded independently
    const c1 = createCycle();
    deposit(c1, salary);
    commit(c1, [computeCommitment(alice, salary, nAlice)]);

    // claim in cycle 0
    expect(claim(c0, salary, nAlice, alice).result).toBeOk(Cl.bool(true));
    // cycle 1's commitment is still unclaimed and independently claimable
    expect(
      simnet.callReadOnlyFn(
        PAYROLL,
        "is-claimed",
        [Cl.uint(c1), Cl.bufferFromHex(computeCommitment(alice, salary, nAlice).slice(2))],
        deployer
      ).result
    ).toBeBool(false);
    expect(claim(c1, salary, nAlice, alice).result).toBeOk(Cl.bool(true));
  });

  it("claim before commit is rejected (ERR-WRONG-STATUS)", () => {
    const salary = 5000n;
    const cid = createCycle();
    deposit(cid, salary);
    // status is still "open", not "committed"
    expect(claim(cid, salary, nAlice, alice).result).toBeErr(Cl.uint(ERR_WRONG_STATUS));
  });

  it("operations on a non-existent cycle are rejected (ERR-CYCLE-NOT-FOUND)", () => {
    expect(deposit(999n, 1000n).result).toBeErr(Cl.uint(ERR_CYCLE_NOT_FOUND));
  });
});
