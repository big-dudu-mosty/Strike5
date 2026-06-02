const usdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const integerUsdFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const dusdcFormatter = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat('en-US', {
  style: 'percent',
  maximumFractionDigits: 3,
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

export function scaleOracleUsd(value: number | null | undefined) {
  if (value == null) return null;
  return value / 1_000_000_000;
}

export function scaleQuoteAsset(value: number | null | undefined) {
  if (value == null) return null;
  return value / 1_000_000;
}

export function formatUsd(value: number | null | undefined, options?: { integer?: boolean }) {
  if (value == null || Number.isNaN(value)) return 'Pending';
  return options?.integer ? integerUsdFormatter.format(value) : usdFormatter.format(value);
}

export function formatDUsdc(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'Pending';
  return `${dusdcFormatter.format(value)} dUSDC`;
}

export function formatDUsdcRaw(value: bigint | null | undefined) {
  if (value == null) return 'Pending';
  return formatDUsdc(Number(value) / 1_000_000);
}

export function formatPercent(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return 'Pending';
  return percentFormatter.format(value);
}

export function formatTime(value: number | null | undefined) {
  if (value == null) return 'Pending';
  return dateTimeFormatter.format(new Date(value));
}

export function formatDuration(ms: number | null | undefined) {
  if (ms == null || !Number.isFinite(ms)) return 'Pending';
  if (ms <= 0) return 'Expired';

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`;
}

export function formatFreshness(now: number, timestamp: number | null | undefined) {
  if (timestamp == null) return 'Pending';
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  return `${seconds}s`;
}
