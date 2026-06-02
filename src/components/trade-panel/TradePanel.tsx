import { ArrowDown, ArrowUp, ScanLine } from 'lucide-react';

const quickPicks = [
  {
    type: 'Above',
    label: 'BTC closes above oracle spot',
    icon: ArrowUp,
  },
  {
    type: 'Below',
    label: 'BTC closes at or below oracle spot',
    icon: ArrowDown,
  },
  {
    type: 'Range',
    label: 'BTC closes inside selected band',
    icon: ScanLine,
  },
];

export function TradePanel() {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div>
        <h2 className="text-base font-semibold">Trade Panel</h2>
        <p className="text-sm text-zinc-500">Quick Picks and Custom Builder</p>
      </div>

      <div className="mt-4 grid gap-3">
        {quickPicks.map((pick) => {
          const Icon = pick.icon;
          return (
            <button
              className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-emerald-500/60"
              key={pick.type}
              type="button"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-emerald-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-zinc-100">{pick.type}</span>
                <span className="mt-0.5 block text-sm text-zinc-500">{pick.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-3 text-sm text-zinc-500">
        Quote preview will use devInspect before mint / mint_range.
      </div>
    </section>
  );
}
