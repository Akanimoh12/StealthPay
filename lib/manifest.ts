// lib/manifest.ts — build & download the employer's manifest CSV entirely in
// the browser. Per SECURITY.md this file reveals ALL salaries; it is never sent
// to a server, never stored in Supabase, and is generated via a Blob only.

export interface ManifestRow {
  employee_wallet: string;
  amount: string; // base units
  nonce_hex: string; // 0x-prefixed 16-byte nonce
  commitment_hex: string; // 0x-prefixed 32-byte commitment
}

function escapeCsv(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export function buildManifestCsv(rows: ManifestRow[]): string {
  const header = ["employee_wallet", "amount", "nonce_hex", "commitment_hex"];
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push(
      [r.employee_wallet, r.amount, r.nonce_hex, r.commitment_hex]
        .map(escapeCsv)
        .join(",")
    );
  }
  return lines.join("\n");
}

/** Trigger an in-browser download. Nothing leaves the browser. */
export function downloadManifestCsv(rows: ManifestRow[], cycleId: string) {
  const csv = buildManifestCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `stealthpay-manifest-cycle-${cycleId}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
