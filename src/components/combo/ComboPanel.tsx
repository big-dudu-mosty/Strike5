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
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('combo.title')}</h2>
          <p className="text-sm text-zinc-500">{t('combo.subtitle')}</p>
        </div>
        <ListChecks className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
        <div className="flex gap-2">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <p>{t('combo.note')}</p>
        </div>
      </div>

      {!managerId ? (
        <div className="mt-4 text-sm text-amber-200">{t('combo.managerRequired')}</div>
      ) : (
        <CurrentStreakBlock
          currentStreak={currentStreak}
          onClearStreak={onClearStreak}
          resolution={resolution}
        />
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">{t('combo.history')}</h3>
          <span className="text-xs text-zinc-500">{archivedStreaks.length}</span>
        </div>

        <div className="mt-3 grid gap-3">
          {archivedStreaks.length > 0 ? (
            archivedStreaks.slice(0, 5).map((streak) => (
              <ArchivedStreakRow key={streak.id} streak={streak} />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
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
      <div className="mt-4 rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
        {t('combo.empty')}
      </div>
    );
  }

  const totalCost = getComboTotalCost(currentStreak.legs);

  return (
    <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-zinc-100">{t('combo.current')}</h3>
          <p className="mt-1 text-xs text-zinc-500">
            {currentStreak.legs.length}/{STREAK_TARGET} {t('combo.legs')}
          </p>
        </div>
        <Flame
          className={`h-5 w-5 ${resolution.busted ? 'text-red-300' : 'text-amber-300'}`}
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
        className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 transition hover:border-emerald-400 hover:text-emerald-100"
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
      <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm font-medium text-emerald-100">
        {t('combo.completedBanner')}
      </div>
    );
  }

  if (resolution.busted) {
    return (
      <div className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm font-medium text-red-200">
        {t('combo.bustedBanner')}
      </div>
    );
  }

  if (resolution.surrendered) {
    return (
      <div className="mt-3 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm font-medium text-amber-100">
        {t('combo.surrenderedBanner')}
      </div>
    );
  }

  if (resolution.canAdvance) {
    return (
      <div className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-100">
        {t('combo.advanceHint')}
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">
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
    ? 'border-emerald-400/40 bg-emerald-400/10'
    : failed
      ? 'border-red-400/40 bg-red-400/10'
      : surrendered
        ? 'border-amber-400/40 bg-amber-400/10'
        : 'border-zinc-800 bg-zinc-900';
  const badgeClass = lit
    ? 'bg-emerald-400 text-zinc-950'
    : failed
      ? 'bg-red-400 text-zinc-950'
      : surrendered
        ? 'bg-amber-400 text-zinc-950'
        : 'bg-zinc-800 text-zinc-300';

  return (
    <div className={`flex items-center justify-between gap-3 rounded-md border p-3 ${containerClass}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-xs font-bold ${badgeClass}`}>
          {multiplier}x
        </span>
        <div className="min-w-0">
          <div className="text-xs text-zinc-500">
            {t('combo.leg')} {index + 1}
          </div>
          {leg ? (
            <>
              <div className="mt-0.5 truncate text-sm font-semibold text-zinc-100">
                {formatLegInstrument(leg)}
              </div>
              <div className="mt-0.5 text-xs text-zinc-500">
                {getLegTypeLabel(leg.kind, t)} · {formatTime(Number(leg.expiry))}
              </div>
            </>
          ) : (
            <div className="mt-0.5 text-sm text-zinc-600">—</div>
          )}
        </div>
      </div>
      <span className="shrink-0 text-xs font-medium text-zinc-400">
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
    ? 'bg-emerald-400 text-zinc-950'
    : resolution.busted
      ? 'bg-red-400/15 text-red-200'
      : resolution.surrendered
        ? 'bg-amber-400/15 text-amber-200'
        : 'bg-zinc-800 text-zinc-300';

  return (
    <article className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">
            {formatMultiplier(resolution.litMultiplier)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{formatTime(streak.createdAt)}</div>
        </div>
        <span className={`shrink-0 rounded-md px-2 py-1 text-xs font-semibold ${resultClass}`}>
          {resultLabel}
        </span>
      </div>

      <div className="mt-3 grid gap-2">
        {streak.legs.map((leg, index) => (
          <div
            className="grid grid-cols-[28px_minmax(0,1fr)_72px] items-center gap-2 text-xs"
            key={leg.id}
          >
            <span className="text-zinc-600">#{index + 1}</span>
            <span className="truncate text-zinc-300">{formatLegInstrument(leg)}</span>
            <span className="text-right text-zinc-500">{getLegStatusLabel(resolution.legs[index]?.status ?? null, t)}</span>
          </div>
        ))}
      </div>
    </article>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-zinc-500">{label}</dt>
      <dd className="mt-1 truncate font-medium text-zinc-100">{value}</dd>
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
  if (!value) return 'Pending';
  return formatUsd(scaleOracleUsd(Number(BigInt(value))), { integer: true });
}

function formatMultiplier(value: number | null) {
  if (value == null || !Number.isFinite(value)) return 'Pending';
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
