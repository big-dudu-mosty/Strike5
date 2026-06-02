import { Activity } from 'lucide-react';

const pulseRows = [
  ['Chart Price', 'Pending provider'],
  ['Oracle Spot', 'Pending oracle'],
  ['Chart / Oracle Diff', 'Pending'],
  ['Oracle Freshness', 'Pending'],
  ['Current Expiry', 'Nearest 15m'],
];

export function MarketPulsePanel() {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Market Pulse</h2>
          <p className="text-sm text-zinc-500">Chart reference vs DeepBook Predict oracle</p>
        </div>
        <Activity className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <dl className="mt-4 space-y-3">
        {pulseRows.map(([label, value]) => (
          <div className="flex items-center justify-between gap-3 text-sm" key={label}>
            <dt className="text-zinc-500">{label}</dt>
            <dd className="text-right font-medium text-zinc-200">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
