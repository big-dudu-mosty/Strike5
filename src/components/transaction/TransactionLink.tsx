import { ExternalLink } from 'lucide-react';
import { PREDICT_CONFIG } from '../../config/predict';

interface TransactionLinkProps {
  digest: string;
  label: string;
}

export function TransactionLink({ digest, label }: TransactionLinkProps) {
  return (
    <a
      className="inline-flex min-w-0 items-center gap-1.5 font-mono text-emerald-100 underline-offset-4 transition hover:text-emerald-200 hover:underline"
      href={getSuiVisionTxUrl(digest)}
      rel="noreferrer"
      target="_blank"
    >
      <span className="truncate">{label}</span>
      <span>{truncateDigest(digest)}</span>
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
    </a>
  );
}

function getSuiVisionTxUrl(digest: string) {
  return `${PREDICT_CONFIG.suiVisionTxBaseUrl}/${digest}`;
}

function truncateDigest(digest: string) {
  return `${digest.slice(0, 8)}...${digest.slice(-6)}`;
}
