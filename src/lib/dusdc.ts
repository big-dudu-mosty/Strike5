export const DUSDC_DECIMALS = 6;
const DUSDC_SCALE = 10n ** BigInt(DUSDC_DECIMALS);

export function parseDUsdcInput(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const match = /^(\d+)(?:\.(\d{0,6})?)?$/.exec(trimmed);
  if (!match) return null;

  const [, whole, fraction = ''] = match;
  const paddedFraction = fraction.padEnd(DUSDC_DECIMALS, '0');
  const amount = BigInt(whole) * DUSDC_SCALE + BigInt(paddedFraction || '0');

  return amount > 0n ? amount : null;
}

export function scaleDUsdcRaw(value: bigint | null | undefined) {
  if (value == null) return null;
  return Number(value) / Number(DUSDC_SCALE);
}
