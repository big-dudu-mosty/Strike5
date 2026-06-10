import { BadgeCheck, Flame, ListChecks, RotateCcw } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { usePredictPositions } from '../../hooks/usePredictPositions';
import {
  STREAK_TARGET,
  getComboTotalCost,
  resolveStreak,
  type ArenaComboLeg,
  type ArenaStreak,
  type StreakLegResult,
  type StreakLegStatus,
} from '../../lib/combo';
import {
  formatDUsdcRaw,
  formatTime,
  formatUsd,
  scaleOracleUsd,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';

interface ComboPanelProps {
  archivedStreaks: ArenaStreak[];
  currentStreak: ArenaStreak | null;
  managerId: string | null;
  onClearStreak: () => void;
  onLegResult: (legId: string, result: StreakLegResult) => void;
}

export function ComboPanel({
  archivedStreaks,
  currentStreak,
  managerId,
  onClearStreak,
  onLegResult,
}: ComboPanelProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(managerId);
  const rows = positions.data?.rows ?? [];
  const resolution = useMemo(
    () => (currentStreak ? resolveStreak(currentStreak.legs, rows) : null),
    [currentStreak, rows],
  );

  useEffect(() => {
    if (!resolution) return;

    for (const item of resolution.legs) {
      if (
        (item.status === 'won' || item.status === 'lost' || item.status === 'surrendered') &&
        item.leg.result !== item.status
      ) {
        onLegResult(item.leg.id, item.status);
      }
    }
  }, [resolution, onLegResult]);

  return (
    <section className="rounded-3xl border border-ink-700/60 bg-ink-900/70 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-cream-100">{t('combo.title')}</h2>
          <p className="text-sm text-cream-600">{t('combo.subtitle')}</p>
        </div>
        <ListChecks className="mt-0.5 h-5 w-5 text-brass-300" aria-hidden="true" />
      </div>

      <div className="mt-4 rounded-2xl bg-ink-950/45 p-3 text-sm text-cream-500">
        <div className="flex gap-2">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss-300" aria-hidden="true" />
          <p>{t('combo.note')}</p>
        </div>
      </div>

      {!managerId ? (
        <div className="mt-4 text-sm text-brass-200">{t('combo.managerRequired')}</div>
      ) : (
        <CurrentStreakBlock
          currentStreak={currentStreak}
          onClearStreak={onClearStreak}
          resolution={resolution}
        />
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-cream-100">{t('combo.history')}</h3>
          <span className="text-xs text-cream-600">{archivedStreaks.length}</span>
        </div>

        <div className="mt-3 grid gap-3">
          {archivedStreaks.length > 0 ? (
            archivedStreaks.slice(0, 5).map((streak) => (
              <ArchivedStreakRow key={streak.id} streak={streak} />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-ink-600 p-4 text-sm leading-6 text-cream-500">
              {t('combo.emptyHistory')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CurrentStreakBlock({
  currentStreak,
  onClearStreak,
  resolution,
}: {
  currentStreak: ArenaStreak | null;
  onClearStreak: () => void;
  resolution: ReturnType<typeof resolveStreak> | null;
}) {
  const { t } = useI18n();

  if (!currentStreak || !resolution || currentStreak.legs.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-dashed border-ink-600 p-4 text-sm leading-6 text-cream-500">
        {t('combo.empty')}
      </div>
    );
  }

  const totalCost = getComboTotalCost(currentStreak.legs);

  return (
    <div className="mt-4 rounded-2xl border border-ink-700/60 bg-ink-950/45 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-cream-100">{t('combo.current')}</h3>
          <p className="mt-1 text-xs text-cream-600">
            {currentStreak.legs.length}/{STREAK_TARGET} {t('combo.legs')}
          </p>
        </div>
        <Flame
          className={`h-5 w-5 ${resolution.busted ? 'text-clay-300' : 'text-brass-300'}`}
          aria-hidden="true"
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-3 text-sm">
        <Metric label={t('combo.lit')} value={formatMultiplier(resolution.litMultiplier)} />
        <Metric label={t('combo.potential')} value={formatMultiplier(resolution.potentialMultiplier)} />
        <Metric label={t('combo.totalCost')} value={formatDUsdcRaw(totalCost)} />
      </dl>

      <StreakBanner resolution={resolution} />

      <div className="mt-3 grid gap-2">
        {Array.from({ length: STREAK_TARGET }, (_, index) => {
          const item = resolution.legs[index] ?? null;
          return (
            <StreakSlot
              index={index}
              key={index}
              leg={item?.leg ?? null}
              status={item?.status ?? null}
            />
          );
        })}
      </div>

      <button
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-ink-600 px-3 text-sm font-semibold text-cream-200 transition hover:border-brass-400 hover:text-brass-200"
        onClick={onClearStreak}
        type="button"
      >
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        {t('combo.startNew')}
      </button>
    </div>
  );
}

function StreakBanner({ resolution }: { resolution: ReturnType<typeof resolveStreak> }) {
  const { t } = useI18n();

  if (resolution.completed) {
    return (
      <div className="mt-3 rounded-xl border border-moss-400/30 bg-moss-400/10 p-3 text-sm font-medium text-moss-100">
        {t('combo.completedBanner')}
      </div>
    );
  }

  if (resolution.busted) {
    return (
      <div className="mt-3 rounded-xl border border-clay-400/30 bg-clay-400/10 p-3 text-sm font-medium text-clay-200">
        {t('combo.bustedBanner')}
      </div>
    );
  }

  if (resolution.surrendered) {
    return (
      <div className="mt-3 rounded-xl border border-brass-400/30 bg-brass-400/10 p-3 text-sm font-medium text-brass-200">
        {t('combo.surrenderedBanner')}
      </div>
    );
  }

  if (resolution.canAdvance) {
    return (
      <div className="mt-3 rounded-xl border border-moss-400/30 bg-moss-400/10 p-3 text-sm text-moss-100">
        {t('combo.advanceHint')}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-ink-950/45 p-3 text-sm text-cream-500">
      {t('combo.inProgress')}
    </div>
  );
}

function StreakSlot({
  index,
  leg,
  status,
}: {
  index: number;
  leg: ArenaComboLeg | null;
  status: StreakLegStatus | null;
}) {
  const { t } = useI18n();
  const multiplier = 2 ** (index + 1);
  const lit = status === 'won';
  const failed = status === 'lost';
  const surrendered = status === 'surrendered';
  const containerClass = lit
    ? 'border-moss-400/40 bg-moss-400/10'
    : failed
      ? 'border-clay-400/40 bg-clay-400/10'
      : surrendered
        ? 'border-brass-400/40 bg-brass-400/10'
        : 'border-ink-700 bg-ink-950/35';
  const badgeClass = lit
    ? 'bg-moss-400 text-ink-950'
    : failed
      ? 'bg-clay-400 text-ink-950'
      : surrendered
        ? 'bg-brass-400 text-ink-950'
        : 'bg-ink-800 text-cream-400';

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl border p-3 ${containerClass}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${badgeClass}`}>
          {multiplier}x
        </span>
        <div className="min-w-0">
          <div className="text-xs text-cream-600">
            {t('combo.leg')} {index + 1}
          </div>
          {leg ? (
            <>
              <div className="mt-0.5 truncate text-sm font-semibold text-cream-100">
                {formatLegInstrument(leg)}
              </div>
              <div className="mt-0.5 text-xs text-cream-600">
                {getLegTypeLabel(leg.kind, t)} · {formatTime(Number(leg.expiry))}
              </div>
            </>
          ) : (
            <div className="mt-0.5 text-sm text-cream-700">—</div>
          )}
        </div>
      </div>
      <span className="shrink-0 text-xs font-medium text-cream-500">
        {leg ? getLegStatusLabel(status, t) : ''}
      </span>
    </div>
  );
}

function ArchivedStreakRow({ streak }: { streak: ArenaStreak }) {
  const { t } = useI18n();
  const resolution = resolveStreak(streak.legs, []);
  const resultLabel = resolution.completed
    ? t('combo.completed')
    : resolution.busted
      ? t('combo.busted')
      : resolution.surrendered
        ? t('combo.surrendered')
        : t('combo.pending');
  const resultClass = resolution.completed
    ? 'bg-moss-400 text-ink-950'
    : resolution.busted
      ? 'bg-clay-400/15 text-clay-200'
      : resolution.surrendered
        ? 'bg-brass-400/15 text-brass-200'
        : 'bg-ink-800 text-cream-400';

  return (
    <article className="rounded-2xl border border-ink-700/60 bg-ink-950/45 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-cream-100">
            {formatMultiplier(resolution.litMultiplier)}
          </div>
          <div className="mt-1 text-xs text-cream-600">{formatTime(streak.createdAt)}</div>
        </div>
        <span className={`shrink-0 rounded-xl px-2 py-1 text-xs font-semibold ${resultClass}`}>
          {resultLabel}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {streak.legs.map((leg, index) => (
          <div
            className="grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-2 text-xs"
            key={leg.id}
          >
            <span className="text-cream-700">#{index + 1}</span>
            <span className="truncate text-cream-300">{formatLegInstrument(leg)}</span>
            <span className="text-right text-cream-600">{getLegStatusLabel(resolution.legs[index]?.status ?? null, t)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-cream-600">{label}</dt>
      <dd className="mt-1 truncate font-medium text-cream-100 tabular-nums">{value}</dd>
    </div>
  );
}

function formatLegInstrument(leg: ArenaComboLeg) {
  if (leg.kind === 'range') {
    return `${formatRawStrike(leg.lowerStrike)} - ${formatRawStrike(leg.higherStrike)}`;
  }

  return formatRawStrike(leg.strike);
}

function formatRawStrike(value: string | undefined) {
  if (!value) return '—';
  return formatUsd(scaleOracleUsd(Number(BigInt(value))), { integer: true });
}

function formatMultiplier(value: number | null) {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(value % 1 === 0 ? 0 : 2)}x`;
}

function getLegTypeLabel(kind: ArenaComboLeg['kind'], t: (key: MessageKey) => string) {
  switch (kind) {
    case 'above':
      return t('trade.above');
    case 'below':
      return t('trade.below');
    case 'range':
      return t('trade.range');
  }
}

function getLegStatusLabel(status: StreakLegStatus | null, t: (key: MessageKey) => string) {
  switch (status) {
    case 'won':
      return t('combo.hit');
    case 'lost':
      return t('combo.miss');
    case 'surrendered':
      return t('combo.surrendered');
    case 'awaiting':
      return t('positions.status.awaitingSettlement');
    case 'active':
      return t('positions.status.active');
    case 'notMinted':
      return t('combo.notMinted');
    default:
      return '';
  }
}
