import { Activity, BarChart3, CircleDollarSign, ShieldCheck, Wallet } from 'lucide-react';
import { useCurrentAccount, useCurrentNetwork } from '@mysten/dapp-kit-react';
import { ConnectButton } from '@mysten/dapp-kit-react/ui';
import { MarketPulsePanel } from '../components/market-pulse/MarketPulsePanel';
import { TradePanel } from '../components/trade-panel/TradePanel';
import { PositionsPanel } from '../components/positions/PositionsPanel';
import { VaultHealthPanel } from '../components/vault-health/VaultHealthPanel';
import { ChartPanel } from '../components/chart/ChartPanel';
import { PREDICT_CONFIG } from '../config/predict';

export function App() {
  const account = useCurrentAccount();
  const network = useCurrentNetwork();

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex flex-col gap-3 border-b border-zinc-800 pb-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-400 text-zinc-950">
                <Activity className="h-5 w-5" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-normal">Strike5</h1>
                <p className="text-sm text-zinc-400">
                  BTC fixed-risk trading powered by DeepBook Predict
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge icon={<ShieldCheck className="h-4 w-4" />} label="Sui testnet" />
            <StatusBadge icon={<CircleDollarSign className="h-4 w-4" />} label="dUSDC" />
            <ConnectButton />
          </div>
        </header>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <InfoTile
            icon={<BarChart3 className="h-5 w-5" />}
            label="Product Round"
            value="5 min"
            detail="UI trading rhythm"
          />
          <InfoTile
            icon={<Activity className="h-5 w-5" />}
            label="Settlement"
            value="15 min"
            detail="Nearest Predict oracle expiry"
          />
          <InfoTile
            icon={<ShieldCheck className="h-5 w-5" />}
            label="Authority"
            value="OracleSVI"
            detail="Quote and settlement reference"
          />
          <InfoTile
            icon={<Wallet className="h-5 w-5" />}
            label="Wallet"
            value={account ? truncateAddress(account.address) : 'Not connected'}
            detail={network ?? PREDICT_CONFIG.network}
          />
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(360px,0.85fr)]">
          <div className="flex flex-col gap-4">
            <ChartPanel />
            <PositionsPanel />
          </div>

          <aside className="flex flex-col gap-4">
            <MarketPulsePanel />
            <TradePanel />
            <VaultHealthPanel />
          </aside>
        </section>
      </div>
    </main>
  );
}

function StatusBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="inline-flex h-9 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-300">
      <span className="text-emerald-300">{icon}</span>
      {label}
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-zinc-400">{label}</span>
        <span className="text-emerald-300">{icon}</span>
      </div>
      <div className="mt-3 text-xl font-semibold">{value}</div>
      <div className="mt-1 text-sm text-zinc-500">{detail}</div>
    </div>
  );
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
