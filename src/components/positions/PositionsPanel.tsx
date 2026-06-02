import { Layers } from 'lucide-react';
import { useI18n } from '../../lib/i18n/I18nProvider';

export function PositionsPanel() {
  const { t } = useI18n();

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('positions.title')}</h2>
          <p className="text-sm text-zinc-500">{t('positions.subtitle')}</p>
        </div>
        <Layers className="h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-6 text-center text-sm text-zinc-500">
        {t('positions.empty')}
      </div>
    </section>
  );
}
