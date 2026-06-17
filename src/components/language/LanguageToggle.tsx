import { Languages } from 'lucide-react';
import { useI18n } from '../../lib/i18n/I18nProvider';

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();

  return (
    <div
      aria-label={t('app.language')}
      className="market-chip inline-flex h-9 items-center gap-1 rounded-full p-1 text-sm text-cream-300"
    >
      <Languages className="ml-2 h-4 w-4 text-brass-300" aria-hidden="true" />
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
    'h-7 rounded-full px-2.5 transition',
    active ? 'bg-cream-100 text-ink-950 font-semibold' : 'text-cream-600 hover:text-cream-100',
  ].join(' ');
}
