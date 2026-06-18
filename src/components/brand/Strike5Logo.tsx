type Strike5LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Strike5Logo({ className = '', showWordmark = true }: Strike5LogoProps) {
  return (
    <div
      aria-label="Strike5"
      className={`inline-flex items-center gap-2.5 rounded-xl bg-white px-2 py-1 shadow-[0_10px_30px_rgba(0,0,0,0.18)] ${className}`}
    >
      <img alt="" className="block h-8 w-auto object-contain" src="/strike5-mark.png" />
      {showWordmark ? (
        <img alt="Strike5" className="block h-8 w-auto object-contain" src="/strike5-wordmark.png" />
      ) : null}
    </div>
  );
}
