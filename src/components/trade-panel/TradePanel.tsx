import { ArrowDown, ArrowUp, ScanLine } from 'lucide-react';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';

const quickPicks = [
  {
    typeKey: 'trade.above',
    labelKey: 'trade.above.label',
    icon: ArrowUp,
  },
  {
    typeKey: 'trade.below',
    labelKey: 'trade.below.label',
    icon: ArrowDown,
  },
  {
    typeKey: 'trade.range',
    labelKey: 'trade.range.label',
    icon: ScanLine,
  },
] satisfies Array<{ typeKey: MessageKey; labelKey: MessageKey; icon: typeof ArrowUp }>;

export function TradePanel() {
  const { t } = useI18n();

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div>
        <h2 className="text-base font-semibold">{t('trade.title')}</h2>
        <p className="text-sm text-zinc-500">{t('trade.subtitle')}</p>
      </div>

      <div className="mt-4 grid gap-3">
        {quickPicks.map((pick) => {
          const Icon = pick.icon;
          return (
            <button
              className="flex items-center gap-3 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-emerald-500/60"
              key={pick.typeKey}
              type="button"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-zinc-800 text-emerald-300">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-semibold text-zinc-100">
                  {t(pick.typeKey)}
                </span>
                <span className="mt-0.5 block text-sm text-zinc-500">{t(pick.labelKey)}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-3 text-sm text-zinc-500">
        {t('trade.quoteNote')}
      </div>
    </section>
  );
}
