import { createContext, useContext, useMemo, useState } from 'react';
import { messages } from './messages';
import type { Locale, MessageKey } from './types';

const STORAGE_KEY = 'strike5.locale';
const DEFAULT_LOCALE: Locale = 'en';

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => getInitialLocale());

  const value = useMemo<I18nContextValue>(() => {
    function setLocale(nextLocale: Locale) {
      setLocaleState(nextLocale);
      window.localStorage.setItem(STORAGE_KEY, nextLocale);
    }

    function toggleLocale() {
      setLocale(locale === 'en' ? 'zh' : 'en');
    }

    function t(key: MessageKey) {
      return messages[locale][key] ?? messages[DEFAULT_LOCALE][key] ?? key;
    }

    return {
      locale,
      setLocale,
      toggleLocale,
      t,
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used inside I18nProvider');
  }

  return context;
}

function getInitialLocale(): Locale {
  const storedLocale = window.localStorage.getItem(STORAGE_KEY);
  if (storedLocale === 'en' || storedLocale === 'zh') return storedLocale;
  return DEFAULT_LOCALE;
}
