import { Languages } from 'lucide-react';
import { useI18n } from '../../lib/i18n/I18nProvider';

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      aria-label={t('app.language')}
      className="inline-flex h-9 items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 p-1 text-sm text-zinc-300"
    >
      <Languages className="ml-2 h-4 w-4 text-emerald-300" aria-hidden="true" />
      <button
        className={buttonClass(locale === 'en')}
        onClick={() => setLocale('en')}
        type="button"
      >
        {t('app.language.en')}
      </button>
      <button
        className={buttonClass(locale === 'zh')}
        onClick={() => setLocale('zh')}
        type="button"
      >
        {t('app.language.zh')}
      </button>
    </div>
  );
}

function buttonClass(active: boolean) {
  return [
    'h-7 rounded px-2 transition',
    active ? 'bg-emerald-400 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-50',
  ].join(' ');
}
