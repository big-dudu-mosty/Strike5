import { BadgeCheck, Copy, MessageSquare, Send, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { PredictAccountOverview } from '../../hooks/usePredictAccountOverview';
import { usePredictPositions, type PredictPositionDisplayRow } from '../../hooks/usePredictPositions';
import {
  formatDUsdc,
  formatTime,
  formatUsd,
  scaleOracleUsd,
  scaleQuoteAsset,
} from '../../lib/formatters';
import { useI18n } from '../../lib/i18n/I18nProvider';
import type { MessageKey } from '../../lib/i18n/types';

const STORAGE_KEY = 'strike5.arena-feed.posts.v1';
const MAX_POST_LENGTH = 240;
const MAX_VISIBLE_POSTS = 6;

interface ArenaFeedPanelProps {
  accountOverview: PredictAccountOverview;
}

interface FeedPost {
  address: string;
  alias: string;
  body: string;
  createdAt: number;
  id: string;
  managerId: string;
  position: FeedPositionSnapshot | null;
}

interface FeedPositionSnapshot {
  expiry: number;
  instrument: string;
  kind: PredictPositionDisplayRow['kind'];
  openQuantity: number;
  pnl: number | null;
  status: string;
}

export function ArenaFeedPanel({ accountOverview }: ArenaFeedPanelProps) {
  const { t } = useI18n();
  const positions = usePredictPositions(accountOverview.managerId);
  const [attachPosition, setAttachPosition] = useState(true);
  const [copiedPostId, setCopiedPostId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const address = accountOverview.address;
  const managerId = accountOverview.managerId;
  const latestPosition = useMemo(() => {
    return getLatestPosition(positions.data?.rows ?? []);
  }, [positions.data?.rows]);
  const visiblePosts = posts.slice(0, MAX_VISIBLE_POSTS);
  const canPublish = Boolean(address && managerId && draft.trim().length > 0);

  useEffect(() => {
    setPosts(readPosts());
  }, []);

  function persist(next: FeedPost[]) {
    setPosts(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function publishPost() {
    if (!address || !managerId) return;

    const body = draft.trim();
    if (!body || body.length > MAX_POST_LENGTH) return;

    const nextPost: FeedPost = {
      address,
      alias: formatAlias(address),
      body,
      createdAt: Date.now(),
      id: createPostId(),
      managerId,
      position: attachPosition && latestPosition ? buildPositionSnapshot(latestPosition) : null,
    };

    persist([nextPost, ...posts].slice(0, 50));
    setDraft('');
  }

  function deletePost(id: string) {
    persist(posts.filter((post) => post.id !== id));
  }

  async function copyPost(post: FeedPost) {
    try {
      await navigator.clipboard.writeText(formatShareText(post));
      setCopiedPostId(post.id);
      window.setTimeout(() => {
        setCopiedPostId(null);
      }, 1600);
    } catch {
      setCopiedPostId(null);
    }
  }

  return (
    <section className="terminal-panel rounded-2xl p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold text-cream-100">{t('feed.title')}</h2>
          <p className="text-sm text-cream-600">{t('feed.subtitle')}</p>
        </div>
        <MessageSquare className="mt-0.5 h-5 w-5 text-brass-300" aria-hidden="true" />
      </div>

      <div className="soft-panel mt-4 rounded-2xl p-3 text-sm text-cream-500">
        <div className="flex gap-2">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-moss-300" aria-hidden="true" />
          <p>{t('feed.privacy')}</p>
        </div>
      </div>

      {!address ? (
        <div className="mt-4 text-sm text-amber-200">{t('feed.connectWallet')}</div>
      ) : !managerId ? (
        <div className="mt-4 text-sm text-amber-200">{t('feed.managerRequired')}</div>
      ) : (
        <div className="mt-4 grid gap-3">
          <label className="text-sm font-medium text-cream-200" htmlFor="arena-feed-draft">
            {t('feed.composerLabel')}
          </label>
          <textarea
            className="min-h-24 resize-none rounded-2xl border border-ink-700 bg-ink-950/60 p-3 text-sm text-cream-100 outline-none transition placeholder:text-cream-700 focus:border-brass-400"
            id="arena-feed-draft"
            maxLength={MAX_POST_LENGTH}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t('feed.placeholder')}
            value={draft}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm text-cream-500">
              <input
                checked={attachPosition}
                className="h-4 w-4 accent-brass-400"
                disabled={!latestPosition}
                onChange={(event) => setAttachPosition(event.target.checked)}
                type="checkbox"
              />
              {t('feed.attachPosition')}
            </label>
            <span className="text-xs text-cream-600">
              {draft.length}/{MAX_POST_LENGTH}
            </span>
          </div>

          <PositionPreview row={attachPosition ? latestPosition : null} />

          <button
            className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-brass-400 px-3 text-sm font-semibold text-ink-950 transition hover:bg-brass-300 disabled:cursor-not-allowed disabled:bg-ink-800 disabled:text-cream-600"
            disabled={!canPublish}
            onClick={publishPost}
            type="button"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {t('feed.publish')}
          </button>
        </div>
      )}

      <div className="mt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-cream-100">{t('feed.latest')}</h3>
          <span className="text-xs text-cream-600">{visiblePosts.length}</span>
        </div>

        <div className="mt-3 grid gap-3">
          {visiblePosts.length > 0 ? (
            visiblePosts.map((post) => (
              <FeedPostRow
                canDelete={post.address === address}
                isCopied={copiedPostId === post.id}
                key={post.id}
                onCopy={() => void copyPost(post)}
                onDelete={() => deletePost(post.id)}
                post={post}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-ink-600 p-4 text-sm leading-6 text-cream-500">
              {t('feed.empty')}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PositionPreview({ row }: { row: PredictPositionDisplayRow | null }) {
  const { t } = useI18n();

  if (!row) {
    return (
      <div className="rounded-2xl border border-dashed border-ink-700 p-3 text-sm leading-6 text-cream-500">
        {t('feed.noPosition')}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-moss-400/30 bg-moss-400/10 p-3">
      <div className="text-xs font-medium uppercase tracking-normal text-moss-200">
        {t('feed.positionSnapshot')}
      </div>
      <div className="mt-1 truncate text-sm font-semibold text-cream-100">{formatInstrument(row)}</div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-cream-500">
        <span>{getPositionTypeLabel(row.kind, t)}</span>
        <span className="text-right">{getStatusLabel(row.status, t)}</span>
        <span>{formatDUsdc(scaleQuoteAsset(row.openQuantity))}</span>
        <span className="text-right">{formatTime(row.expiry)}</span>
      </div>
    </div>
  );
}

function FeedPostRow({
  canDelete,
  isCopied,
  onCopy,
  onDelete,
  post,
}: {
  canDelete: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onDelete: () => void;
  post: FeedPost;
}) {
  const { t } = useI18n();

  return (
    <article className="soft-panel rounded-2xl p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-cream-600">
            <span className="font-medium text-cream-200">{post.alias}</span>
            <span>{formatTime(post.createdAt)}</span>
          </div>
          <p className="mt-2 whitespace-pre-wrap break-words text-sm text-cream-100">{post.body}</p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-700 text-cream-500 transition hover:border-ink-500 hover:text-cream-100"
            onClick={onCopy}
            title={t('feed.copy')}
            type="button"
          >
            <Copy className="h-4 w-4" aria-hidden="true" />
          </button>
          {canDelete ? (
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-ink-700 text-cream-500 transition hover:border-clay-400/50 hover:text-clay-200"
              onClick={onDelete}
              title={t('feed.delete')}
              type="button"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </div>

      {post.position ? (
        <div className="mt-3 rounded-xl border border-ink-700/60 p-3 text-xs text-cream-500">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium text-moss-200">{t('feed.verifiedPosition')}</span>
            <span>{getStatusLabel(post.position.status, t)}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <span className="truncate">{post.position.instrument}</span>
            <span className="text-right">{formatDUsdc(scaleQuoteAsset(post.position.openQuantity))}</span>
            <span>{formatTime(post.position.expiry)}</span>
            <span className="text-right">{formatDUsdc(scaleQuoteAsset(post.position.pnl))}</span>
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 text-xs text-cream-600">
        <span className="truncate">
          {t('feed.manager')} {formatAlias(post.managerId)}
        </span>
        {isCopied ? <span className="text-moss-200">{t('feed.copied')}</span> : null}
      </div>
    </article>
  );
}

function getLatestPosition(rows: PredictPositionDisplayRow[]) {
  return [...rows].sort((a, b) => b.lastActivityAt - a.lastActivityAt)[0] ?? null;
}

function buildPositionSnapshot(row: PredictPositionDisplayRow): FeedPositionSnapshot {
  const markOrPayout = getMarkOrPayout(row);

  return {
    expiry: row.expiry,
    instrument: formatInstrument(row),
    kind: row.kind,
    openQuantity: row.openQuantity,
    pnl: getPositionPnl(row, markOrPayout),
    status: row.status,
  };
}

function formatInstrument(row: PredictPositionDisplayRow) {
  if (row.kind === 'range') {
    return `${formatUsd(scaleOracleUsd(row.lowerStrike), { integer: true })} - ${formatUsd(
      scaleOracleUsd(row.higherStrike),
      { integer: true },
    )}`;
  }

  return formatUsd(scaleOracleUsd(row.strike), { integer: true });
}

function getMarkOrPayout(row: PredictPositionDisplayRow) {
  if (row.kind !== 'range') return row.markValue ?? row.totalPayout;
  if (row.status === 'redeemable') return row.openQuantity;
  if (row.status === 'lost') return 0;
  return null;
}

function getPositionPnl(row: PredictPositionDisplayRow, markOrPayout: number | null) {
  if (row.openQuantity <= 0) return row.realizedPnl;
  if (markOrPayout == null) return null;
  return markOrPayout - row.costBasis;
}

function getPositionTypeLabel(kind: PredictPositionDisplayRow['kind'], t: (key: MessageKey) => string) {
  switch (kind) {
    case 'above':
      return t('trade.above');
    case 'below':
      return t('trade.below');
    case 'range':
      return t('trade.range');
  }
}

function getStatusLabel(status: string, t: (key: MessageKey) => string) {
  switch (status) {
    case 'active':
      return t('positions.status.active');
    case 'awaiting_settlement':
      return t('positions.status.awaitingSettlement');
    case 'redeemable':
      return t('positions.status.redeemable');
    case 'lost':
      return t('positions.status.lost');
    case 'redeemed':
      return t('positions.status.redeemed');
    default:
      return status;
  }
}

function formatShareText(post: FeedPost) {
  const lines = [
    `Strike5 Arena call by ${post.alias}`,
    post.body,
    `Manager: ${post.managerId}`,
  ];

  if (post.position) {
    lines.push(
      `Position: ${post.position.instrument} | ${post.position.status} | ${formatDUsdc(
        scaleQuoteAsset(post.position.openQuantity),
      )}`,
    );
  }

  return lines.join('\n');
}

function formatAlias(value: string) {
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

function createPostId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readPosts() {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedPost[]) : [];
  } catch {
    return [];
  }
}
