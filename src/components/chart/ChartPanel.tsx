import { CandlestickChart } from 'lucide-react';
import { useI18n } from '../../lib/i18n/I18nProvider';

export function ChartPanel() {
  const { t } = useI18n();

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{t('chart.title')}</h2>
          <p className="text-sm text-zinc-500">{t('chart.subtitle')}</p>
        </div>
        <div className="flex rounded-md border border-zinc-800 bg-zinc-950 p-1 text-sm">
          {['1m', '5m', '15m'].map((interval) => (
            <button
              className="h-8 rounded px-3 text-zinc-300 transition hover:bg-zinc-800 hover:text-zinc-50"
              key={interval}
              type="button"
            >
              {interval}
            </button>
          ))}
        </div>
      </div>

      <div className="flex aspect-[16/9] min-h-[320px] items-center justify-center px-4">
        <div className="flex flex-col items-center gap-3 text-center text-zinc-500">
          <CandlestickChart className="h-10 w-10 text-zinc-600" aria-hidden="true" />
          <div>
            <div className="text-sm font-medium text-zinc-300">{t('chart.placeholder.title')}</div>
            <div className="mt-1 max-w-md text-sm">{t('chart.placeholder.body')}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
