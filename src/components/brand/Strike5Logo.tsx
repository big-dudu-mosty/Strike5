type Strike5LogoProps = {
  className?: string;
  showWordmark?: boolean;
};

export function Strike5Logo({ className = '', showWordmark = true }: Strike5LogoProps) {
  return (
    <div
      aria-label="Strike5"
      className={`inline-flex items-center gap-2.5 ${className}`}
    >
      <img alt="" className="block h-10 w-auto object-contain" src="/strike5-mark.png" />
      {showWordmark ? (
        <img
          alt="Strike5"
          className="block h-10 w-auto object-contain drop-shadow-[0_1px_0_rgba(244,249,255,0.18)]"
          src="/strike5-wordmark.png"
        />
      ) : null}
    </div>
  );
}
