import { ShieldCheck } from 'lucide-react';

const vaultRows = [
  ['Vault Balance', 'Pending'],
  ['Vault Value', 'Pending'],
  ['Available Liquidity', 'Pending'],
  ['Utilization', 'Pending'],
  ['PLP Share Price', 'Pending'],
];

export function VaultHealthPanel() {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Vault & Oracle Health</h2>
          <p className="text-sm text-zinc-500">Predict Vault / PLP risk surface</p>
        </div>
        <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <dl className="mt-4 space-y-3">
        {vaultRows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-right font-medium text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
