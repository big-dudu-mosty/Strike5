import { Flame } from 'lucide-react';
import { useMemo } from 'react';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import {
  STREAK_TARGET,
  resolveStreak,
  type ArenaStreak,
  type StreakLegStatus,
} from '../../lib/combo';
import { useI18n } from '../../lib/i18n/I18nProvider';

interface StreakMeterProps {
  managerId: string | null;
  streak: ArenaStreak | null;
}

/**
 * Compact streak status for the trading page. Full management lives in the
 * Playbook ComboPanel; this keeps the commitment tension visible while trading.
 */
export function StreakMeter({ managerId, streak }: StreakMeterProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(managerId);
  const rows = positions.data?.rows ?? [];
  const resolution = useMemo(
    () => (streak ? resolveStreak(streak.legs, rows) : null),
    [streak, rows],
  );

  const statusText = !resolution || streak?.legs.length === 0
    ? t('combo.empty')
    : resolution.completed
      ? t('combo.completedBanner')
      : resolution.busted
        ? t('combo.bustedBanner')
        : resolution.surrendered
          ? t('combo.surrenderedBanner')
          : resolution.canAdvance
            ? t('combo.advanceHint')
            : t('combo.inProgress');

  return (
    <section className="rounded-3xl border border-ink-700/60 glass p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-cream-100">{t('combo.title')}</h2>
        <Flame
          className={`h-5 w-5 ${
            resolution?.busted || resolution?.surrendered ? 'text-clay-300' : 'text-brass-300'
          }`}
          aria-hidden="true"
        />
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        {Array.from({ length: STREAK_TARGET }, (_, index) => {
          const status = resolution?.legs[index]?.status ?? null;
          return <StreakSlot index={index} key={index} status={status} />;
        })}
      </div>

      <p className="mt-3 text-xs leading-5 text-cream-600">{statusText}</p>
      <p className="mt-1.5 text-[11px] leading-4 text-cream-700">
        {t('positions.streakLegHint')}
      </p>
    </section>
  );
}

function StreakSlot({ index, status }: { index: number; status: StreakLegStatus | null }) {
  const multiplier = 2 ** (index + 1);
  const cls =
    status === 'won'
      ? 'bg-moss-400 text-ink-950'
      : status === 'lost'
        ? 'bg-clay-400 text-ink-950'
        : status === 'surrendered'
          ? 'bg-amber-400 text-ink-950'
          : status === 'active' || status === 'awaiting'
            ? 'border border-brass-400/50 bg-brass-400/10 text-brass-200'
            : 'bg-ink-800 text-cream-600';

  return (
    <div
      className={`flex h-10 items-center justify-center rounded-xl text-sm font-bold ${cls}`}
    >
      {multiplier}x
    </div>
  );
}
