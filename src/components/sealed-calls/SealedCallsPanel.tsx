import { Eye, EyeOff, LockKeyhole, ShieldCheck, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import { useNow } from '../../hooks/useNow';
import {
  formatDuration,
  formatTime,
  formatUsd,
  scaleOracleUsd,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';
import type { PredictOracle } from '../../lib/predict-server/types';

const STORAGE_KEY = 'strike5.sealed-calls.v1';
const MAX_CALL_LENGTH = 200;
const MAX_VISIBLE_CALLS = 6;

type SealedCallKind = 'above' | 'below' | 'range';

interface SealedCallsPanelProps {
  accountOverview: PredictAccountOverview;
  activeOracle: PredictOracle | null;
  oracleSpotRaw: number | null;
}

interface SealedCall {
  address: string;
  alias: string;
  body: string;
  commitment: string;
  createdAt: number;
  expiry: number;
  id: string;
  kind: SealedCallKind;
  managerId: string;
  oracleId: string;
  revealedAt: number | null;
  salt: string;
  strikeLabel: string;
}

export function SealedCallsPanel({
  accountOverview,
  activeOracle,
  oracleSpotRaw,
}: SealedCallsPanelProps) {
  const { t } = useI18n();
  const now = useNow();
  const [body, setBody] = useState('');
  const [calls, setCalls] = useState<SealedCall[]>([]);
  const [isLocking, setIsLocking] = useState(false);
  const [kind, setKind] = useState<SealedCallKind>('above');
  const address = accountOverview.address;
  const managerId = accountOverview.managerId;
  const currentRoundCalls = useMemo(() => {
    if (!managerId) return [];
    return calls
      .filter((call) => call.managerId === managerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, MAX_VISIBLE_CALLS);
  }, [calls, managerId]);
  const canLock = Boolean(
    address &&
      managerId &&
      activeOracle &&
      now < activeOracle.expiry &&
      body.trim().length > 0 &&
      body.trim().length <= MAX_CALL_LENGTH,
  );

  useEffect(() => {
    setCalls(readCalls());
  }, []);

  function persist(next: SealedCall[]) {
    setCalls(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async function lockCall() {
    if (!address || !managerId || !activeOracle || !canLock) return;

    setIsLocking(true);
    try {
      const salt = createSalt();
      const trimmedBody = body.trim();
      const strikeLabel = getStrikeLabel(activeOracle, kind, oracleSpotRaw);
      const commitment = await createCommitment({
        body: trimmedBody,
        expiry: activeOracle.expiry,
        kind,
        managerId,
        oracleId: activeOracle.oracle_id,
        salt,
        strikeLabel,
      });

      const nextCall: SealedCall = {
        address,
        alias: formatAlias(address),
        body: trimmedBody,
        commitment,
        createdAt: Date.now(),
        expiry: activeOracle.expiry,
        id: createId(),
        kind,
        managerId,
        oracleId: activeOracle.oracle_id,
        revealedAt: null,
        salt,
        strikeLabel,
      };

      persist([nextCall, ...calls].slice(0, 40));
      setBody('');
    } finally {
      setIsLocking(false);
    }
  }

  function revealCall(id: string) {
    persist(calls.map((call) => (call.id === id ? { ...call, revealedAt: Date.now() } : call)));
  }

  function deleteCall(id: string) {
    persist(calls.filter((call) => call.id !== id));
  }

  return (
    <section className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{t('sealed.title')}</h2>
          <p className="text-sm text-zinc-500">{t('sealed.subtitle')}</p>
        </div>
        <ShieldCheck className="mt-0.5 h-5 w-5 text-emerald-300" aria-hidden="true" />
      </div>

      <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-400">
        <div className="flex gap-2">
          <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          <p>{t('sealed.note')}</p>
        </div>
      </div>

      <RoundStatus activeOracle={activeOracle} now={now} />

      {!address ? (
        <div className="mt-4 text-sm text-amber-200">{t('sealed.connectWallet')}</div>
      ) : !managerId ? (
        <div className="mt-4 text-sm text-amber-200">{t('sealed.managerRequired')}</div>
      ) : !activeOracle ? (
        <div className="mt-4 text-sm text-amber-200">{t('sealed.oracleRequired')}</div>
      ) : (
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-3 rounded-md border border-zinc-800 bg-zinc-950 p-1">
            {(['above', 'below', 'range'] satisfies SealedCallKind[]).map((option) => (
              <button
                className={`h-9 rounded px-2 text-sm font-medium transition ${
                  option === kind
                    ? 'bg-emerald-400 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
                key={option}
                onClick={() => setKind(option)}
                type="button"
              >
                {getKindLabel(option, t)}
              </button>
            ))}
          </div>

          <label className="text-sm font-medium text-zinc-200" htmlFor="sealed-call-body">
            {t('sealed.composerLabel')}
          </label>
          <textarea
            className="min-h-20 resize-none rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-600 focus:border-emerald-400"
            id="sealed-call-body"
            maxLength={MAX_CALL_LENGTH}
            onChange={(event) => setBody(event.target.value)}
            placeholder={t('sealed.placeholder')}
            value={body}
          />
          <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
            <span>{getStrikeLabel(activeOracle, kind, oracleSpotRaw)}</span>
            <span>
              {body.length}/{MAX_CALL_LENGTH}
            </span>
          </div>
          <button
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-emerald-400 px-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            disabled={!canLock || isLocking}
            onClick={() => void lockCall()}
            type="button"
          >
            <LockKeyhole className="h-4 w-4" aria-hidden="true" />
            {isLocking ? t('sealed.locking') : t('sealed.lock')}
          </button>
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-100">{t('sealed.lockedCalls')}</h3>
          <span className="text-xs text-zinc-500">{currentRoundCalls.length}</span>
        </div>

        <div className="mt-3 grid gap-3">
          {currentRoundCalls.length > 0 ? (
            currentRoundCalls.map((call) => (
              <SealedCallRow
                call={call}
                key={call.id}
                now={now}
                onDelete={() => deleteCall(call.id)}
                onReveal={() => revealCall(call.id)}
              />
            ))
          ) : (
            <div className="rounded-md border border-dashed border-zinc-700 p-4 text-sm text-zinc-500">
              {t('sealed.empty')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function RoundStatus({ activeOracle, now }: { activeOracle: PredictOracle | null; now: number }) {
  const { t } = useI18n();

  return (
    <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3">
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <Metric
          label={t('sealed.round')}
          value={activeOracle ? formatTime(activeOracle.expiry) : t('sealed.noRound')}
        />
        <Metric
          label={t('sealed.timeLeft')}
          value={activeOracle ? formatDuration(activeOracle.expiry - now) : t('marketPulse.pending')}
        />
      </dl>
    </div>
  );
}

function SealedCallRow({
  call,
  now,
  onDelete,
  onReveal,
}: {
  call: SealedCall;
  now: number;
  onDelete: () => void;
  onReveal: () => void;
}) {
  const { t } = useI18n();
  const canReveal = now >= call.expiry;
  const isRevealed = Boolean(call.revealedAt);

  return (
    <article className="rounded-md border border-zinc-800 bg-zinc-950 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="font-medium text-zinc-200">{call.alias}</span>
            <span>{formatTime(call.createdAt)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
              {getKindLabel(call.kind, t)}
            </span>
            <span className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-300">
              {call.strikeLabel}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          {canReveal && !isRevealed ? (
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 transition hover:border-emerald-400/50 hover:text-emerald-200"
              onClick={onReveal}
              title={t('sealed.reveal')}
              type="button"
            >
              <Eye className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 text-zinc-400 transition hover:border-red-400/50 hover:text-red-200"
            onClick={onDelete}
            title={t('sealed.delete')}
            type="button"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-3 rounded-md border border-zinc-800 p-3">
        <div className="flex items-start gap-2">
          {isRevealed ? (
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" aria-hidden="true" />
          ) : (
            <EyeOff className="mt-0.5 h-4 w-4 shrink-0 text-zinc-500" aria-hidden="true" />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-xs font-medium uppercase tracking-normal text-zinc-500">
              {isRevealed ? t('sealed.revealed') : t('sealed.sealed')}
            </div>
            {isRevealed ? (
              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-zinc-100">
                {call.body}
              </p>
            ) : (
              <p className="mt-1 text-sm text-zinc-500">
                {canReveal ? t('sealed.readyToReveal') : t('sealed.hiddenUntilExpiry')}
              </p>
            )}
          </div>
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-xs">
        <Metric label={t('sealed.commitment')} value={formatCommitment(call.commitment)} />
        <Metric label={t('sealed.expiry')} value={formatTime(call.expiry)} />
      </dl>
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

function getKindLabel(kind: SealedCallKind, t: (key: MessageKey) => string) {
  switch (kind) {
    case 'above':
      return t('trade.above');
    case 'below':
      return t('trade.below');
    case 'range':
      return t('trade.range');
  }
}

function getStrikeLabel(
  activeOracle: PredictOracle,
  kind: SealedCallKind,
  oracleSpotRaw: number | null,
) {
  const minStrike = BigInt(activeOracle.min_strike);
  const tickSize = BigInt(activeOracle.tick_size);
  const rawSpot = Math.trunc(
    Math.max(activeOracle.min_strike, oracleSpotRaw ?? activeOracle.min_strike),
  );
  const base = snapToTick(
    BigInt(rawSpot),
    minStrike,
    tickSize,
  );
  const baseLabel = formatUsd(scaleOracleUsd(Number(base)), { integer: true });

  if (kind === 'range') {
    const lower = snapToTick(base - tickSize * 2n, minStrike, tickSize);
    const higher = snapToTick(base + tickSize * 2n, minStrike, tickSize);
    return `${formatUsd(scaleOracleUsd(Number(lower)), { integer: true })} - ${formatUsd(
      scaleOracleUsd(Number(higher > lower ? higher : lower + tickSize)),
      { integer: true },
    )}`;
  }

  return baseLabel;
}

function snapToTick(value: bigint, minStrike: bigint, tickSize: bigint) {
  if (value <= minStrike) return minStrike;

  const offset = value - minStrike;
  const lowerOffset = (offset / tickSize) * tickSize;
  const remainder = offset - lowerOffset;
  const roundedOffset = remainder * 2n >= tickSize ? lowerOffset + tickSize : lowerOffset;

  return minStrike + roundedOffset;
}

async function createCommitment({
  body,
  expiry,
  kind,
  managerId,
  oracleId,
  salt,
  strikeLabel,
}: {
  body: string;
  expiry: number;
  kind: SealedCallKind;
  managerId: string;
  oracleId: string;
  salt: string;
  strikeLabel: string;
}) {
  const payload = [managerId, oracleId, expiry, kind, strikeLabel, body, salt].join('|');
  const encoded = new TextEncoder().encode(payload);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

function createSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function formatCommitment(commitment: string) {
  return `${commitment.slice(0, 10)}...${commitment.slice(-8)}`;
}

function formatAlias(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function createId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readCalls() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SealedCall[]) : [];
  } catch {
    return [];
  }
}
