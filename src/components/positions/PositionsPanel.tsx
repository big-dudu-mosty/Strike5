import { Layers } from 'lucide-react';

export function PositionsPanel() {
  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Positions</h2>
          <p className="text-sm text-zinc-500">
            PredictManager balances and position quantities
          </p>
        </div>
        <Layers className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
        No positions loaded. Wallet and PredictManager integration comes next.
      </div>
    </section>
  );
}
