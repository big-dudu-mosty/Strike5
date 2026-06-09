import { BadgeCheck, ListChecks, LockKeyhole, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { usePredictPositions, type PredictPositionDisplayRow } from '../../hooks/usePredictPositions';
import {
  COMBO_LEG_TARGET,
  findMatchingPosition,
  getComboLegOdds,
  getComboMultiplier,
  getComboTotalCost,
  type ArenaComboLeg,
  type ArenaComboSlip,
} from '../../lib/combo';
import {
  formatDUsdcRaw,
  formatTime,
  formatUsd,
  scaleOracleUsd,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';

const STORAGE_KEY = 'strike5.combo.slips.v1';
const MAX_TRACKED_SLIPS = 5;

interface ComboPanelProps {
  draftLegs: ArenaComboLeg[];
  managerId: string | null;
  onClearDraft: () => void;
  onRemoveDraftLeg: (id: string) => void;
}

export function ComboPanel({
  draftLegs,
  managerId,
  onClearDraft,
  onRemoveDraftLeg,
}: ComboPanelProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(managerId);
  const [slips, setSlips] = useState<ArenaComboSlip[]>([]);
  const managerSlips = useMemo(() => {
    return managerId ? slips.filter((slip) => slip.managerId === managerId) : [];
  }, [managerId, slips]);
  const positionRows = positions.data?.rows ?? [];
  const canLock = Boolean(managerId && draftLegs.length === COMBO_LEG_TARGET);

  useEffect(() => {
    setSlips(readSlips());
  }, []);

  function persist(next: ArenaComboSlip[]) {
    setSlips(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function lockCombo() {
    if (!managerId || draftLegs.length !== COMBO_LEG_TARGET) return;

    const nextSlip: ArenaComboSlip = {
      createdAt: Date.now(),
      id: createId(),
      legs: draftLegs,
      managerId,
    };

    persist([nextSlip, ...slips].slice(0, 30));
    onClearDraft();
  }

  function deleteSlip(id: string) {
    persist(slips.filter((slip) => slip.id !== id));
  }

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

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">{t('combo.draft')}</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {draftLegs.length}/{COMBO_LEG_TARGET} {t('combo.legs')}
            </p>
          </div>
          {draftLegs.length > 0 ? (
            <button
              className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-700 px-2 text-xs text-zinc-300 transition hover:border-zinc-500"
              onClick={onClearDraft}
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('combo.clear')}
            </button>
          ) : null}
        </div>

        <DraftSummary legs={draftLegs} />

        <div className="mt-3 grid gap-2">
          {draftLegs.length > 0 ? (
            draftLegs.map((leg, index) => (
              <ComboLegRow
                index={index}
                key={leg.id}
                leg={leg}
                onRemove={() => onRemoveDraftLeg(leg.id)}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-zinc-700 p-3 text-sm text-zinc-500">
              {t('combo.emptyDraft')}
            </div>
          )}
        </div>

        {!managerId ? (
          <div className="mt-3 text-sm text-amber-200">{t('combo.managerRequired')}</div>
        ) : null}

        <button
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
          disabled={!canLock}
          onClick={lockCombo}
          type="button"
        >
          <LockKeyhole className="h-4 w-4" aria-hidden="true" />
          {t('combo.lock')}
        </button>
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">{t('combo.tracked')}</h3>
          <span className="text-xs text-zinc-500">{managerSlips.length}</span>
        </div>

        <div className="mt-3 grid gap-3">
          {managerSlips.length > 0 ? (
            managerSlips.slice(0, MAX_TRACKED_SLIPS).map((slip) => (
              <TrackedComboSlip
                key={slip.id}
                onDelete={() => deleteSlip(slip.id)}
                rows={positionRows}
                slip={slip}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
              {t('combo.emptyTracked')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function DraftSummary({ legs }: { legs: ArenaComboLeg[] }) {
  const { t } = useI18n();
  const totalCost = getComboTotalCost(legs);
  const multiplier = getComboMultiplier(legs);

  return (
    <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
      <Metric label={t('combo.totalCost')} value={formatDUsdcRaw(totalCost)} />
      <Metric label={t('combo.multiplier')} value={formatMultiplier(multiplier)} />
    </dl>
  );
}

function ComboLegRow({
  index,
  leg,
  onRemove,
}: {
  index: number;
  leg: ArenaComboLeg;
  onRemove: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-zinc-500">
            {t('combo.leg')} {index + 1}
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-zinc-100">
            {formatLegInstrument(leg)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">
            {getLegTypeLabel(leg.kind, t)} · {formatTime(Number(leg.expiry))}
          </div>
        </div>
        <button
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 transition hover:border-zinc-600 hover:text-zinc-100"
          onClick={onRemove}
          title={t('combo.removeLeg')}
          type="button"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <Metric label={t('combo.cost')} value={formatDUsdcRaw(BigInt(leg.cost))} />
        <Metric label={t('combo.payout')} value={formatDUsdcRaw(BigInt(leg.maxPayout))} />
        <Metric label={t('combo.odds')} value={formatMultiplier(getComboLegOdds(leg))} />
      </dl>
    </div>
  );
}

function TrackedComboSlip({
  onDelete,
  rows,
  slip,
}: {
  onDelete: () => void;
  rows: PredictPositionDisplayRow[];
  slip: ArenaComboSlip;
}) {
  const { t } = useI18n();
  const resolvedLegs = slip.legs.map((leg) => ({
    leg,
    row: findMatchingPosition(leg, rows),
  }));
  const wonCount = resolvedLegs.filter((item) => item.row?.status === 'redeemable').length;
  const lostCount = resolvedLegs.filter((item) => item.row?.status === 'lost').length;
  const mintedCount = resolvedLegs.filter((item) => item.row).length;
  const multiplier = getComboMultiplier(slip.legs);
  const resultLabel = getSlipResultLabel({
    mintedCount,
    lostCount,
    targetCount: slip.legs.length,
    t,
    wonCount,
  });

  return (
    <article className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-zinc-100">
            {t('combo.locked')} · {formatMultiplier(multiplier)}
          </div>
          <div className="mt-1 text-xs text-zinc-500">{formatTime(slip.createdAt)}</div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={getSlipResultClass(lostCount, wonCount, slip.legs.length)}>
            {resultLabel}
          </span>
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 transition hover:border-red-400/50 hover:text-red-200"
            onClick={onDelete}
            title={t('combo.deleteSlip')}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {resolvedLegs.map(({ leg, row }, index) => (
          <div
            className="grid grid-cols-[28px_minmax(0,1fr)_88px] items-center gap-2 text-xs"
            key={leg.id}
          >
            <span className="text-zinc-600">#{index + 1}</span>
            <span className="truncate text-zinc-300">{formatLegInstrument(leg)}</span>
            <span className="text-right text-zinc-500">{getResolvedLegLabel(row?.status, t)}</span>
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
  return `${value.toFixed(2)}x`;
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

function getResolvedLegLabel(status: string | undefined, t: (key: MessageKey) => string) {
  switch (status) {
    case 'active':
      return t('positions.status.active');
    case 'awaiting_settlement':
      return t('positions.status.awaitingSettlement');
    case 'redeemable':
      return t('combo.hit');
    case 'lost':
      return t('combo.miss');
    default:
      return t('combo.notMinted');
  }
}

function getSlipResultLabel({
  mintedCount,
  lostCount,
  targetCount,
  t,
  wonCount,
}: {
  mintedCount: number;
  lostCount: number;
  targetCount: number;
  t: (key: MessageKey) => string;
  wonCount: number;
}) {
  if (lostCount > 0) return t('combo.busted');
  if (wonCount === targetCount) return t('combo.completed');
  if (mintedCount < targetCount) return t('combo.needsMint');
  return t('combo.pending');
}

function getSlipResultClass(lostCount: number, wonCount: number, targetCount: number) {
  const base = 'rounded-md px-2 py-1 text-xs font-semibold';
  if (lostCount > 0) return `${base} bg-red-400/15 text-red-200`;
  if (wonCount === targetCount) return `${base} bg-emerald-400 text-zinc-950`;
  return `${base} bg-zinc-800 text-zinc-300`;
}

function readSlips() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ArenaComboSlip[]) : [];
  } catch {
    return [];
  }
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
